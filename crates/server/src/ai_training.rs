use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

const RUNPOD_GRAPHQL_URL: &str = "https://api.runpod.io/graphql";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum AIProvider {
    Ollama,
    Claude,
    OpenAI,
    LLaMA2,
    Mistral,
    Custom,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum ComputeProvider {
    RunPod,
    Lambda,
    LambdaLabs,
    Vast,
    TensorDock,
    Local,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FineTuningConfig {
    pub model_name: String,
    pub ai_provider: AIProvider,
    pub compute_provider: ComputeProvider,
    pub training_data_path: String,
    pub validation_split: f32,
    pub batch_size: u32,
    pub num_epochs: u32,
    pub learning_rate: f32,
    pub warmup_steps: u32,
    pub max_tokens: u32,
    pub optimizer: String, // "adam", "sgd", "adamw"
    pub lora_rank: Option<u32>,
    pub lora_alpha: Option<u32>,
    pub save_steps: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrainingJob {
    pub job_id: String,
    pub config: FineTuningConfig,
    pub status: TrainingStatus,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub compute_instance_id: Option<String>,
    pub cost_usd: f64,
    pub estimated_cost_usd: f64,
    pub training_logs: Vec<TrainingLog>,
    pub metrics: TrainingMetrics,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum TrainingStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrainingLog {
    pub timestamp: String,
    pub level: String, // "info", "warning", "error"
    pub message: String,
    pub epoch: Option<u32>,
    pub step: Option<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrainingMetrics {
    pub loss: Option<f32>,
    pub val_loss: Option<f32>,
    pub perplexity: Option<f32>,
    pub tokens_per_second: Option<f32>,
    pub current_epoch: u32,
    pub total_steps: u32,
    pub current_step: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RunPodInstance {
    pub instance_id: String,
    pub gpu_model: String,
    pub gpu_count: u32,
    pub cpu_cores: u32,
    pub memory_gb: u32,
    pub hourly_cost_usd: f64,
    pub pod_status: String,
    pub uptime_minutes: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelCheckpoint {
    pub checkpoint_id: String,
    pub job_id: String,
    pub step: u32,
    pub epoch: u32,
    pub loss: f32,
    pub val_loss: Option<f32>,
    pub model_size_bytes: u64,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InferenceEndpoint {
    pub endpoint_id: String,
    pub model_checkpoint_id: String,
    pub api_key: String,
    pub base_url: String,
    pub status: String, // "deploying", "running", "failed"
    pub created_at: String,
    pub requests_per_minute: u32,
    pub avg_latency_ms: u32,
}

pub struct AITrainingManager {
    jobs: HashMap<String, TrainingJob>,
    checkpoints: HashMap<String, ModelCheckpoint>,
    endpoints: HashMap<String, InferenceEndpoint>,
    runpod_api_key: Option<String>,
    runpod_graphql_url: String,
}

impl AITrainingManager {
    pub fn new(runpod_api_key: Option<String>) -> Self {
        AITrainingManager {
            jobs: HashMap::new(),
            checkpoints: HashMap::new(),
            endpoints: HashMap::new(),
            runpod_api_key,
            runpod_graphql_url: RUNPOD_GRAPHQL_URL.to_string(),
        }
    }

    #[cfg(test)]
    fn with_runpod_url(mut self, url: String) -> Self {
        self.runpod_graphql_url = url;
        self
    }

    /// RunPod's API is GraphQL, authenticated via `?api_key=` query param
    /// (RunPod's documented auth mechanism -- there's no header-based auth
    /// on this endpoint).
    async fn runpod_graphql(&self, query: &str) -> Result<Value> {
        let api_key = self
            .runpod_api_key
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("RunPod API key not configured"))?;
        let client = reqwest::Client::new();
        let url = format!("{}?api_key={api_key}", self.runpod_graphql_url);
        let resp = client
            .post(&url)
            .json(&serde_json::json!({ "query": query }))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("RunPod API request failed: {e}"))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| anyhow::anyhow!("failed to read RunPod response body: {e}"))?;
        if !status.is_success() {
            return Err(anyhow::anyhow!("RunPod API returned {status}: {text}"));
        }
        let json: Value = serde_json::from_str(&text)
            .map_err(|e| anyhow::anyhow!("failed to parse RunPod response as JSON: {e}"))?;
        if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let messages: Vec<String> = errors
                    .iter()
                    .filter_map(|e| e["message"].as_str().map(String::from))
                    .collect();
                return Err(anyhow::anyhow!(
                    "RunPod GraphQL error: {}",
                    messages.join("; ")
                ));
            }
        }
        Ok(json)
    }

    pub fn create_fine_tuning_job(&mut self, config: FineTuningConfig) -> Result<TrainingJob> {
        let job_id = format!("job-{}", uuid::Uuid::new_v4());

        // Validate config
        if config.batch_size == 0 {
            return Err(anyhow::anyhow!("batch_size must be > 0"));
        }
        if config.learning_rate <= 0.0 || config.learning_rate > 1.0 {
            return Err(anyhow::anyhow!("learning_rate must be in (0, 1]"));
        }
        if config.validation_split < 0.0 || config.validation_split > 1.0 {
            return Err(anyhow::anyhow!("validation_split must be in [0, 1]"));
        }

        // Estimate cost
        let estimated_cost = self.estimate_training_cost(&config)?;

        let job = TrainingJob {
            job_id: job_id.clone(),
            config,
            status: TrainingStatus::Pending,
            created_at: chrono::Local::now().to_rfc3339(),
            started_at: None,
            completed_at: None,
            compute_instance_id: None,
            cost_usd: 0.0,
            estimated_cost_usd: estimated_cost,
            training_logs: vec![],
            metrics: TrainingMetrics {
                loss: None,
                val_loss: None,
                perplexity: None,
                tokens_per_second: None,
                current_epoch: 0,
                total_steps: (10000 / 32) as u32, // Placeholder
                current_step: 0,
            },
        };

        self.jobs.insert(job_id, job.clone());
        Ok(job)
    }

    pub fn get_job(&self, job_id: &str) -> Option<TrainingJob> {
        self.jobs.get(job_id).cloned()
    }

    pub fn list_jobs(&self) -> Vec<TrainingJob> {
        self.jobs.values().cloned().collect()
    }

    pub async fn start_job(&mut self, job_id: &str) -> Result<TrainingJob> {
        {
            let job = self
                .jobs
                .get_mut(job_id)
                .ok_or_else(|| anyhow::anyhow!("Job not found: {}", job_id))?;

            if job.status != TrainingStatus::Pending {
                return Err(anyhow::anyhow!("Job is already running or completed"));
            }

            job.status = TrainingStatus::Running;
            job.started_at = Some(chrono::Local::now().to_rfc3339());
        }

        // Launch compute instance
        let job = self.jobs.get(job_id).unwrap();
        let compute_provider = job.config.compute_provider.clone();
        let instance_id = match compute_provider {
            ComputeProvider::RunPod => self
                .launch_runpod_instance()
                .await
                .unwrap_or_else(|_| "pod-pending".to_string()),
            ComputeProvider::Local => "local".to_string(),
            _ => format!("instance-{}", uuid::Uuid::new_v4()),
        };

        let job = self.jobs.get_mut(job_id).unwrap();
        job.compute_instance_id = Some(instance_id);

        Ok(job.clone())
    }

    async fn launch_runpod_instance(&self) -> Result<String> {
        // Matches the RTX 4090 assumption already used in
        // `estimate_training_cost` for RunPod jobs -- single GPU, a
        // standard PyTorch training image with the workspace volume
        // fine-tuning scripts expect to write checkpoints into.
        let query = r#"mutation {
            podFindAndDeployOnDemand(input: {
                cloudType: ALL,
                gpuCount: 1,
                gpuTypeId: "NVIDIA GeForce RTX 4090",
                name: "prismnote-training",
                imageName: "runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04",
                containerDiskInGb: 20,
                volumeInGb: 20,
                volumeMountPath: "/workspace"
            }) {
                id
            }
        }"#;
        let json = self.runpod_graphql(query).await?;
        json["data"]["podFindAndDeployOnDemand"]["id"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("RunPod response missing pod id: {json}"))
    }

    pub async fn cancel_job(&mut self, job_id: &str) -> Result<()> {
        let instance_id = {
            let job = self
                .jobs
                .get_mut(job_id)
                .ok_or_else(|| anyhow::anyhow!("Job not found: {}", job_id))?;

            if job.status == TrainingStatus::Running {
                job.compute_instance_id.clone()
            } else {
                None
            }
        };

        if let Some(id) = instance_id {
            self.stop_runpod_instance(&id).await?;
        }

        let job = self.jobs.get_mut(job_id).unwrap();
        job.status = TrainingStatus::Cancelled;
        Ok(())
    }

    async fn stop_runpod_instance(&self, instance_id: &str) -> Result<()> {
        tracing::info!("Stopping RunPod instance: {}", instance_id);
        // `podStop` pauses billing but keeps the pod (resumable), as
        // opposed to `podTerminate` which permanently deletes it --
        // matches "cancel_job" semantics (job cancelled, not the training
        // environment irrecoverably destroyed).
        let query = format!(
            r#"mutation {{ podStop(input: {{ podId: "{instance_id}" }}) {{ id desiredStatus }} }}"#
        );
        let json = self.runpod_graphql(&query).await?;
        if json["data"]["podStop"]["id"].as_str().is_none() {
            return Err(anyhow::anyhow!(
                "RunPod podStop response missing id: {json}"
            ));
        }
        Ok(())
    }

    pub fn add_training_log(&mut self, job_id: &str, level: &str, message: &str) -> Result<()> {
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| anyhow::anyhow!("Job not found"))?;

        job.training_logs.push(TrainingLog {
            timestamp: chrono::Local::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
            epoch: Some(job.metrics.current_epoch),
            step: Some(job.metrics.current_step),
        });

        Ok(())
    }

    pub fn update_metrics(
        &mut self,
        job_id: &str,
        loss: f32,
        val_loss: Option<f32>,
        perplexity: Option<f32>,
        current_step: u32,
    ) -> Result<()> {
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| anyhow::anyhow!("Job not found"))?;

        job.metrics.loss = Some(loss);
        job.metrics.val_loss = val_loss;
        job.metrics.perplexity = perplexity;
        job.metrics.current_step = current_step;

        Ok(())
    }

    pub fn save_checkpoint(
        &mut self,
        job_id: &str,
        step: u32,
        loss: f32,
    ) -> Result<ModelCheckpoint> {
        let job = self
            .jobs
            .get(job_id)
            .ok_or_else(|| anyhow::anyhow!("Job not found"))?;

        let checkpoint = ModelCheckpoint {
            checkpoint_id: format!("ckpt-{}", uuid::Uuid::new_v4()),
            job_id: job_id.to_string(),
            step,
            epoch: job.metrics.current_epoch,
            loss,
            val_loss: job.metrics.val_loss,
            model_size_bytes: 1_000_000_000, // 1GB placeholder
            created_at: chrono::Local::now().to_rfc3339(),
        };

        self.checkpoints
            .insert(checkpoint.checkpoint_id.clone(), checkpoint.clone());
        Ok(checkpoint)
    }

    pub fn get_checkpoint(&self, checkpoint_id: &str) -> Option<ModelCheckpoint> {
        self.checkpoints.get(checkpoint_id).cloned()
    }

    pub fn list_checkpoints(&self, job_id: &str) -> Vec<ModelCheckpoint> {
        self.checkpoints
            .values()
            .filter(|c| c.job_id == job_id)
            .cloned()
            .collect()
    }

    /// Deploys via RunPod Serverless, the concrete real path for "inference
    /// endpoint" in this file. Assumes the checkpoint's weights were already
    /// packaged into a container image at `prismnote/checkpoint-{id}:latest`
    /// -- RunPod Serverless deploys container images, not raw model weights,
    /// and nothing in `ModelCheckpoint` currently records an image
    /// reference, so this naming convention is a deliberate, disclosed
    /// assumption rather than a verified path. If checkpoints later gain a
    /// real `image_ref` field, wire that through here instead.
    pub async fn deploy_endpoint(&mut self, checkpoint_id: &str) -> Result<InferenceEndpoint> {
        let _checkpoint = self
            .get_checkpoint(checkpoint_id)
            .ok_or_else(|| anyhow::anyhow!("Checkpoint not found"))?;

        let image = format!("prismnote/checkpoint-{checkpoint_id}:latest");
        let query = format!(
            r#"mutation {{
                saveEndpoint(input: {{
                    name: "prismnote-{checkpoint_id}",
                    templateId: null,
                    gpuIds: "AMPERE_16",
                    imageName: "{image}",
                    workersMin: 0,
                    workersMax: 1
                }}) {{
                    id
                }}
            }}"#
        );
        let json = self.runpod_graphql(&query).await?;
        let runpod_endpoint_id = json["data"]["saveEndpoint"]["id"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("RunPod saveEndpoint response missing id: {json}"))?;

        let endpoint = InferenceEndpoint {
            endpoint_id: format!("ep-{}", uuid::Uuid::new_v4()),
            model_checkpoint_id: checkpoint_id.to_string(),
            api_key: format!("key-{}", uuid::Uuid::new_v4()),
            base_url: format!("https://api.runpod.ai/v2/{runpod_endpoint_id}"),
            status: "deploying".to_string(),
            created_at: chrono::Local::now().to_rfc3339(),
            requests_per_minute: 100,
            avg_latency_ms: 0,
        };

        self.endpoints
            .insert(endpoint.endpoint_id.clone(), endpoint.clone());
        Ok(endpoint)
    }

    pub fn get_endpoint(&self, endpoint_id: &str) -> Option<InferenceEndpoint> {
        self.endpoints.get(endpoint_id).cloned()
    }

    pub fn list_endpoints(&self) -> Vec<InferenceEndpoint> {
        self.endpoints.values().cloned().collect()
    }

    pub async fn delete_endpoint(&mut self, endpoint_id: &str) -> Result<()> {
        self.endpoints
            .remove(endpoint_id)
            .ok_or_else(|| anyhow::anyhow!("Endpoint not found"))?;
        Ok(())
    }

    fn estimate_training_cost(&self, config: &FineTuningConfig) -> Result<f64> {
        match config.compute_provider {
            ComputeProvider::RunPod => {
                // Typical RTX 4090: $0.44/hr
                // Estimate training time: 8 hours for 10k examples
                Ok(0.44 * 8.0)
            }
            ComputeProvider::Lambda => {
                // Lambda Labs A100: $1.50/hr
                Ok(1.50 * 4.0) // 4 hours
            }
            ComputeProvider::Local => Ok(0.0), // Local training is free
            _ => Ok(10.0),                     // Default estimate
        }
    }

    /// Lists the caller's own RunPod pods (running training/inference
    /// instances), not a catalog of every GPU type RunPod offers -- "get
    /// available instances" in the original TODO/comment matches the
    /// `RunPodInstance` struct's `pod_status`/`uptime_minutes` fields,
    /// which only make sense for pods the account actually owns.
    pub async fn get_runpod_instances(&self) -> Result<Vec<RunPodInstance>> {
        let query = r#"query {
            myself {
                pods {
                    id
                    desiredStatus
                    costPerHr
                    gpuCount
                    vcpuCount
                    memoryInGb
                    runtime { uptimeInSeconds }
                    machine { gpuDisplayName }
                }
            }
        }"#;
        let json = self.runpod_graphql(query).await?;
        let pods = json["data"]["myself"]["pods"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        Ok(pods
            .iter()
            .map(|p| RunPodInstance {
                instance_id: p["id"].as_str().unwrap_or_default().to_string(),
                gpu_model: p["machine"]["gpuDisplayName"]
                    .as_str()
                    .unwrap_or("unknown")
                    .to_string(),
                gpu_count: p["gpuCount"].as_u64().unwrap_or(0) as u32,
                cpu_cores: p["vcpuCount"].as_u64().unwrap_or(0) as u32,
                memory_gb: p["memoryInGb"].as_u64().unwrap_or(0) as u32,
                hourly_cost_usd: p["costPerHr"].as_f64().unwrap_or(0.0),
                pod_status: p["desiredStatus"].as_str().unwrap_or("unknown").to_string(),
                uptime_minutes: p["runtime"]["uptimeInSeconds"].as_u64().unwrap_or(0) / 60,
            })
            .collect())
    }
}

impl Default for AITrainingManager {
    fn default() -> Self {
        Self::new(None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_fine_tuning_job() {
        let mut manager = AITrainingManager::new(None);
        let config = FineTuningConfig {
            model_name: "meta-llama/Llama-2-7b".to_string(),
            ai_provider: AIProvider::LLaMA2,
            compute_provider: ComputeProvider::RunPod,
            training_data_path: "/data/training.json".to_string(),
            validation_split: 0.1,
            batch_size: 32,
            num_epochs: 3,
            learning_rate: 2e-5,
            warmup_steps: 100,
            max_tokens: 512,
            optimizer: "adamw".to_string(),
            lora_rank: Some(16),
            lora_alpha: Some(32),
            save_steps: 500,
        };

        let job = manager.create_fine_tuning_job(config).unwrap();
        assert_eq!(job.status, TrainingStatus::Pending);
        assert!(job.estimated_cost_usd > 0.0);
    }

    #[test]
    fn test_validate_config() {
        let mut manager = AITrainingManager::new(None);
        let mut config = FineTuningConfig {
            model_name: "test".to_string(),
            ai_provider: AIProvider::Claude,
            compute_provider: ComputeProvider::Local,
            training_data_path: "/data/training.json".to_string(),
            validation_split: 0.1,
            batch_size: 32,
            num_epochs: 3,
            learning_rate: 2e-5,
            warmup_steps: 100,
            max_tokens: 512,
            optimizer: "adamw".to_string(),
            lora_rank: None,
            lora_alpha: None,
            save_steps: 500,
        };

        // Test invalid batch_size
        config.batch_size = 0;
        assert!(manager.create_fine_tuning_job(config.clone()).is_err());

        // Test invalid learning_rate
        config.batch_size = 32;
        config.learning_rate = 0.0;
        assert!(manager.create_fine_tuning_job(config).is_err());
    }

    #[test]
    fn test_checkpoint_management() {
        let mut manager = AITrainingManager::new(None);
        let config = FineTuningConfig {
            model_name: "test".to_string(),
            ai_provider: AIProvider::OpenAI,
            compute_provider: ComputeProvider::Local,
            training_data_path: "/data/training.json".to_string(),
            validation_split: 0.1,
            batch_size: 32,
            num_epochs: 3,
            learning_rate: 2e-5,
            warmup_steps: 100,
            max_tokens: 512,
            optimizer: "adamw".to_string(),
            lora_rank: None,
            lora_alpha: None,
            save_steps: 500,
        };

        let job = manager.create_fine_tuning_job(config).unwrap();
        let checkpoint = manager.save_checkpoint(&job.job_id, 100, 2.5).unwrap();

        assert_eq!(checkpoint.job_id, job.job_id);
        assert_eq!(checkpoint.step, 100);
        assert_eq!(checkpoint.loss, 2.5);

        let retrieved = manager.get_checkpoint(&checkpoint.checkpoint_id);
        assert!(retrieved.is_some());
    }

    fn test_config() -> FineTuningConfig {
        FineTuningConfig {
            model_name: "test".to_string(),
            ai_provider: AIProvider::LLaMA2,
            compute_provider: ComputeProvider::RunPod,
            training_data_path: "/data/training.json".to_string(),
            validation_split: 0.1,
            batch_size: 32,
            num_epochs: 3,
            learning_rate: 2e-5,
            warmup_steps: 100,
            max_tokens: 512,
            optimizer: "adamw".to_string(),
            lora_rank: None,
            lora_alpha: None,
            save_steps: 500,
        }
    }

    #[tokio::test]
    async fn runpod_calls_fail_fast_without_an_api_key() {
        let manager = AITrainingManager::new(None);
        assert!(manager
            .launch_runpod_instance()
            .await
            .unwrap_err()
            .to_string()
            .contains("API key"));
        assert!(manager
            .get_runpod_instances()
            .await
            .unwrap_err()
            .to_string()
            .contains("API key"));
    }

    #[tokio::test]
    async fn launch_runpod_instance_extracts_pod_id() {
        let mut server = mockito::Server::new_async().await;
        let manager =
            AITrainingManager::new(Some("rp-key".to_string())).with_runpod_url(server.url());

        server
            .mock(
                "POST",
                mockito::Matcher::Regex(r"^/\?api_key=rp-key".to_string()),
            )
            .match_body(mockito::Matcher::Regex(
                "podFindAndDeployOnDemand".to_string(),
            ))
            .with_status(200)
            .with_body(r#"{"data": {"podFindAndDeployOnDemand": {"id": "pod-abc123"}}}"#)
            .create_async()
            .await;

        let id = manager.launch_runpod_instance().await.unwrap();
        assert_eq!(id, "pod-abc123");
    }

    #[tokio::test]
    async fn launch_runpod_instance_surfaces_graphql_errors() {
        let mut server = mockito::Server::new_async().await;
        let manager =
            AITrainingManager::new(Some("rp-key".to_string())).with_runpod_url(server.url());

        server
            .mock("POST", mockito::Matcher::Any)
            .with_status(200)
            .with_body(r#"{"errors": [{"message": "insufficient balance"}]}"#)
            .create_async()
            .await;

        let err = manager.launch_runpod_instance().await.unwrap_err();
        assert!(err.to_string().contains("insufficient balance"));
    }

    #[tokio::test]
    async fn stop_runpod_instance_sends_pod_stop_mutation() {
        let mut server = mockito::Server::new_async().await;
        let manager =
            AITrainingManager::new(Some("rp-key".to_string())).with_runpod_url(server.url());

        let mock = server
            .mock("POST", mockito::Matcher::Any)
            .match_body(mockito::Matcher::Regex(
                r#"podStop.*podId: \\"pod-abc123\\""#.to_string(),
            ))
            .with_status(200)
            .with_body(r#"{"data": {"podStop": {"id": "pod-abc123", "desiredStatus": "EXITED"}}}"#)
            .create_async()
            .await;

        manager.stop_runpod_instance("pod-abc123").await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn get_runpod_instances_parses_realistic_myself_response() {
        let mut server = mockito::Server::new_async().await;
        let manager =
            AITrainingManager::new(Some("rp-key".to_string())).with_runpod_url(server.url());

        server
            .mock("POST", mockito::Matcher::Any)
            .with_status(200)
            .with_body(
                r#"{"data": {"myself": {"pods": [{
                    "id": "pod-1",
                    "desiredStatus": "RUNNING",
                    "costPerHr": 0.44,
                    "gpuCount": 1,
                    "vcpuCount": 12,
                    "memoryInGb": 32,
                    "runtime": {"uptimeInSeconds": 3600},
                    "machine": {"gpuDisplayName": "RTX 4090"}
                }]}}}"#,
            )
            .create_async()
            .await;

        let instances = manager.get_runpod_instances().await.unwrap();
        assert_eq!(instances.len(), 1);
        assert_eq!(instances[0].instance_id, "pod-1");
        assert_eq!(instances[0].gpu_model, "RTX 4090");
        assert_eq!(instances[0].uptime_minutes, 60);
        assert_eq!(instances[0].hourly_cost_usd, 0.44);
    }

    #[tokio::test]
    async fn deploy_endpoint_requires_an_existing_checkpoint() {
        let mut manager = AITrainingManager::new(Some("rp-key".to_string()));
        let err = manager.deploy_endpoint("nonexistent").await.unwrap_err();
        assert!(err.to_string().contains("not found"));
    }

    #[tokio::test]
    async fn deploy_endpoint_creates_a_real_runpod_serverless_endpoint() {
        let mut server = mockito::Server::new_async().await;
        let mut manager =
            AITrainingManager::new(Some("rp-key".to_string())).with_runpod_url(server.url());

        let job = manager.create_fine_tuning_job(test_config()).unwrap();
        let checkpoint = manager.save_checkpoint(&job.job_id, 100, 1.2).unwrap();

        server
            .mock("POST", mockito::Matcher::Any)
            .match_body(mockito::Matcher::Regex("saveEndpoint".to_string()))
            .with_status(200)
            .with_body(r#"{"data": {"saveEndpoint": {"id": "endpoint-xyz"}}}"#)
            .create_async()
            .await;

        let endpoint = manager
            .deploy_endpoint(&checkpoint.checkpoint_id)
            .await
            .unwrap();
        assert_eq!(endpoint.base_url, "https://api.runpod.ai/v2/endpoint-xyz");
        assert_eq!(endpoint.model_checkpoint_id, checkpoint.checkpoint_id);
    }
}
