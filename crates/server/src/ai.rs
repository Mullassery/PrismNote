use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: String, // "ollama", "claude", "openai"
    pub ollama_url: Option<String>,
    pub ollama_model: Option<String>,
    pub claude_api_key: Option<String>,
    pub claude_model: Option<String>,
    pub openai_api_key: Option<String>,
    pub openai_model: Option<String>,
}

#[derive(Deserialize)]
pub struct AIRequest {
    pub action: String, // "explain", "fix", "complete"
    pub code: String,
    pub error: Option<String>,
    pub context: Option<String>,
}

#[derive(Serialize)]
pub struct AIResponse {
    pub suggestion: String,
    pub provider: String,
}

#[derive(Clone)]
pub struct AIEngine {
    config: AIConfig,
}

impl AIEngine {
    pub fn new(config: AIConfig) -> Self {
        AIEngine { config }
    }

    /// Read-only view of the active config (used by the settings endpoint).
    pub fn config(&self) -> &AIConfig {
        &self.config
    }

    pub async fn explain(&self, code: &str) -> Result<String> {
        match self.config.provider.as_str() {
            "ollama" => self.ollama_explain(code).await,
            "claude" => self.claude_explain(code).await,
            "openai" => self.openai_explain(code).await,
            _ => Err(anyhow!("Unknown AI provider")),
        }
    }

    pub async fn fix_error(&self, code: &str, error: &str) -> Result<String> {
        match self.config.provider.as_str() {
            "ollama" => self.ollama_fix(code, error).await,
            "claude" => self.claude_fix(code, error).await,
            "openai" => self.openai_fix(code, error).await,
            _ => Err(anyhow!("Unknown AI provider")),
        }.map_err(|e| {
            eprintln!("AI fix error: {}", e);
            e
        })
    }

    pub async fn complete_code(&self, code: &str, context: Option<&str>) -> Result<String> {
        match self.config.provider.as_str() {
            "ollama" => self.ollama_complete(code, context).await,
            "claude" => self.claude_complete(code, context).await,
            "openai" => self.openai_complete(code, context).await,
            _ => Err(anyhow!("Unknown AI provider")),
        }.map_err(|e| {
            eprintln!("AI complete error: {}", e);
            e
        })
    }

    pub async fn call_api(&self, prompt: &str) -> Result<String> {
        match self.config.provider.as_str() {
            "ollama" => self.ollama_call_api(prompt).await,
            "claude" => self.claude_call_api(prompt).await,
            "openai" => self.openai_call_api(prompt).await,
            _ => Err(anyhow!("Unknown AI provider")),
        }
    }

    /// Generate SQL from natural language description (Phase 2.3)
    ///
    /// Takes a natural language question/request and converts it to SQL.
    /// Optionally uses schema context to improve accuracy.
    ///
    /// Example:
    ///   nl_to_sql("Show me the top 10 customers by revenue",
    ///             Some("Tables: customers (id, name, email), orders (id, customer_id, amount)"))
    ///   → "SELECT c.id, c.name, SUM(o.amount) as total_revenue
    ///        FROM customers c
    ///        JOIN orders o ON c.id = o.customer_id
    ///        GROUP BY c.id, c.name
    ///        ORDER BY total_revenue DESC LIMIT 10"
    pub async fn nl_to_sql(&self, query: &str, schema_context: Option<&str>) -> Result<String> {
        let prompt = if let Some(schema) = schema_context {
            format!(
                "You are an expert SQL query generator. Generate a single, optimized SQL query based on the user's natural language request.\n\n\
                 Schema Information:\n{}\n\n\
                 User Request: {}\n\n\
                 Return ONLY the SQL query. No explanation, no markdown, no commentary. Just the SQL.",
                schema, query
            )
        } else {
            format!(
                "You are an expert SQL query generator. Generate a single, optimized SQL query based on the user's natural language request.\n\n\
                 User Request: {}\n\n\
                 Return ONLY the SQL query. No explanation, no markdown, no commentary. Just the SQL.",
                query
            )
        };

        match self.config.provider.as_str() {
            "claude" => self.claude_nl_to_sql(&prompt).await,
            "openai" => self.openai_nl_to_sql(&prompt).await,
            "ollama" => self.ollama_nl_to_sql(&prompt).await,
            _ => Err(anyhow!("Unknown AI provider")),
        }
    }

    /// Claude-based NL-to-SQL (Phase 2.3)
    async fn claude_nl_to_sql(&self, prompt: &str) -> Result<String> {
        let api_key = self
            .config
            .claude_api_key
            .as_ref()
            .ok_or(anyhow!("Claude API key not configured"))?;

        let raw = self.claude_request(api_key, prompt).await?;
        Ok(strip_code_fences(&raw))
    }

    /// OpenAI-based NL-to-SQL (Phase 2.3)
    async fn openai_nl_to_sql(&self, prompt: &str) -> Result<String> {
        let api_key = self
            .config
            .openai_api_key
            .as_ref()
            .ok_or(anyhow!("OpenAI API key not configured"))?;
        let model = self
            .config
            .openai_model
            .as_ref()
            .ok_or(anyhow!("OpenAI model not selected"))?;

        let raw = self.openai_request(api_key, model, prompt).await?;
        Ok(strip_code_fences(&raw))
    }

    /// Ollama-based NL-to-SQL (Phase 2.3)
    async fn ollama_nl_to_sql(&self, prompt: &str) -> Result<String> {
        let url = self
            .config
            .ollama_url
            .as_ref()
            .ok_or(anyhow!("Ollama URL not configured"))?;
        let model = self
            .config
            .ollama_model
            .as_ref()
            .ok_or(anyhow!("Ollama model not selected"))?;

        let raw = self.ollama_request(url, model, prompt).await?;
        Ok(strip_code_fences(&raw))
    }

    /// Rewrite a cell of code according to a natural-language instruction.
    /// Returns code only (markdown fences stripped) so the result can be
    /// dropped straight back into the editor.
    pub async fn transform(
        &self,
        code: &str,
        instruction: &str,
        context: Option<&str>,
    ) -> Result<String> {
        let ctx = context
            .filter(|c| !c.trim().is_empty())
            .map(|c| format!("Other cells in the notebook (for reference, do not repeat):\n```python\n{}\n```\n\n", c))
            .unwrap_or_default();

        let prompt = format!(
            "You are an expert Python data-science assistant editing a single notebook cell.\n\
             {ctx}Rewrite the cell below to satisfy this instruction:\n\
             \"{instruction}\"\n\n\
             Current cell:\n```python\n{code}\n```\n\n\
             Return ONLY the complete, updated Python for this cell. \
             No explanation, no commentary, no markdown fences.",
        );

        let raw = self.call_api(&prompt).await?;
        Ok(strip_code_fences(&raw))
    }
}

/// Remove a surrounding ```lang ... ``` fence if the model wrapped its answer.
fn strip_code_fences(text: &str) -> String {
    let trimmed = text.trim();
    if let Some(rest) = trimmed.strip_prefix("```") {
        // drop the optional language tag on the first line
        let after_lang = match rest.find('\n') {
            Some(nl) => &rest[nl + 1..],
            None => rest,
        };
        if let Some(body) = after_lang.strip_suffix("```") {
            return body.trim_end().to_string();
        }
        // closing fence on its own line
        if let Some(idx) = after_lang.rfind("```") {
            return after_lang[..idx].trim_end().to_string();
        }
    }
    trimmed.to_string()
}

impl AIEngine {
    async fn ollama_call_api(&self, prompt: &str) -> Result<String> {
        let ollama_url = self
            .config
            .ollama_url
            .as_ref()
            .ok_or(anyhow!("Ollama URL not configured"))?;
        let model = self
            .config
            .ollama_model
            .as_ref()
            .ok_or(anyhow!("Ollama model not selected"))?;
        self.ollama_request(ollama_url, model, prompt).await
    }

    async fn claude_call_api(&self, prompt: &str) -> Result<String> {
        let api_key = self
            .config
            .claude_api_key
            .as_ref()
            .ok_or(anyhow!("Claude API key not configured"))?;
        self.claude_request(api_key, prompt).await
    }

    async fn openai_call_api(&self, prompt: &str) -> Result<String> {
        let api_key = self
            .config
            .openai_api_key
            .as_ref()
            .ok_or(anyhow!("OpenAI API key not configured"))?;
        let model = self
            .config
            .openai_model
            .as_ref()
            .ok_or(anyhow!("OpenAI model not selected"))?;
        self.openai_request(api_key, model, prompt).await
    }

    // Ollama integration (local LLM)
    async fn ollama_explain(&self, code: &str) -> Result<String> {
        let ollama_url = self
            .config
            .ollama_url
            .as_ref()
            .ok_or(anyhow!("Ollama URL not configured"))?;
        let model = self
            .config
            .ollama_model
            .as_ref()
            .ok_or(anyhow!("Ollama model not selected"))?;

        let prompt = format!(
            "You are Prism, a friendly Python data-science teacher. Explain this code clearly in 2-3 sentences (the what AND the why), then add one line starting with '💡 Tip:' giving a relevant, specific tip or gotcha for this code:\n\n```python\n{}\n```",
            code
        );

        let response = self.ollama_request(ollama_url, model, &prompt).await?;
        Ok(response)
    }

    async fn ollama_fix(&self, code: &str, error: &str) -> Result<String> {
        let ollama_url = self
            .config
            .ollama_url
            .as_ref()
            .ok_or(anyhow!("Ollama URL not configured"))?;
        let model = self
            .config
            .ollama_model
            .as_ref()
            .ok_or(anyhow!("Ollama model not selected"))?;

        let prompt = format!(
            "Fix this Python code that has an error:\n\nError: {}\n\nCode:\n```python\n{}\n```\n\nProvide corrected code only, no explanation.",
            error, code
        );

        let response = self.ollama_request(ollama_url, model, &prompt).await?;
        Ok(response)
    }

    async fn ollama_complete(&self, code: &str, context: Option<&str>) -> Result<String> {
        let ollama_url = self
            .config
            .ollama_url
            .as_ref()
            .ok_or(anyhow!("Ollama URL not configured"))?;
        let model = self
            .config
            .ollama_model
            .as_ref()
            .ok_or(anyhow!("Ollama model not selected"))?;

        let ctx = context.unwrap_or("");
        let prompt = format!(
            "Complete this Python code snippet. Only provide the completion, no explanation.\n\nContext: {}\n\n```python\n{}\n```\n\nCompletion:",
            ctx, code
        );

        let response = self.ollama_request(ollama_url, model, &prompt).await?;
        Ok(response)
    }

    async fn ollama_request(&self, url: &str, model: &str, prompt: &str) -> Result<String> {
        let client = reqwest::Client::new();
        let body = json!({
            "model": model,
            "prompt": prompt,
            "stream": false,
        });

        let response = client
            .post(format!("{}/api/generate", url))
            .json(&body)
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        let result: Value = response.json().await?;
        let response_text = result["response"]
            .as_str()
            .ok_or(anyhow!("No response from Ollama"))?
            .to_string();

        Ok(response_text.trim().to_string())
    }

    // Claude integration
    async fn claude_explain(&self, code: &str) -> Result<String> {
        let api_key = self
            .config
            .claude_api_key
            .as_ref()
            .ok_or(anyhow!("Claude API key not configured"))?;

        let message = format!(
            "Explain the following Python code clearly and concisely. Describe both WHAT it does and WHY it's written that way. Be educational.\n\nCode:\n```python\n{}\n```\n\nProvide a 2-3 sentence explanation, then add a practical tip prefixed with '💡 Tip:'",
            code
        );

        self.claude_request(api_key, &message).await.map_err(|e| {
            eprintln!("Claude explain failed: {}", e);
            anyhow!("Failed to explain code: {}", e)
        })
    }

    async fn claude_fix(&self, code: &str, error: &str) -> Result<String> {
        let api_key = self
            .config
            .claude_api_key
            .as_ref()
            .ok_or(anyhow!("Claude API key not configured"))?;

        let message = format!(
            "Fix this Python code that produces an error.\n\nError message:\n{}\n\nProblematic code:\n```python\n{}\n```\n\nReturn ONLY the corrected code without any explanation or markdown formatting.",
            error, code
        );

        self.claude_request(api_key, &message).await.map_err(|e| {
            eprintln!("Claude fix failed: {} (error was: {})", e, error);
            anyhow!("Failed to fix code: {}", e)
        })
    }

    async fn claude_complete(&self, code: &str, context: Option<&str>) -> Result<String> {
        let api_key = self
            .config
            .claude_api_key
            .as_ref()
            .ok_or(anyhow!("Claude API key not configured"))?;

        let ctx = context
            .filter(|c| !c.is_empty())
            .map(|c| format!("Context from other cells:\n```python\n{}\n```\n\n", c))
            .unwrap_or_default();

        let message = format!(
            "Complete the following Python code. {}Return ONLY the completed code without explanations.\n\n```python\n{}\n```",
            ctx, code
        );

        self.claude_request(api_key, &message).await.map_err(|e| {
            eprintln!("Claude complete failed: {}", e);
            anyhow!("Failed to complete code: {}", e)
        })
    }

    /// Get MCP tool definitions for Claude tool use
    /// These tools are defined in the frontend but sent to Claude here
    ///
    /// Phase 2: Claude Tool Use Implementation
    /// - Tools are defined with JSON schemas
    /// - Sent to Claude in each request
    /// - Claude can choose to use them for complex tasks
    /// - Execution loop will be implemented in Phase 2.1.3
    ///
    /// Phase 3+: Multi-Model Support
    /// - Will support AWS Bedrock, GCP Vertex AI, Azure, NVIDIA, Ollama
    /// - Enterprise API billing routing (based on org configuration)
    /// - Model selection based on cost/capability tradeoffs
    fn get_mcp_tools() -> Vec<Value> {
        vec![
            json!({
                "name": "code-formatter",
                "description": "Format code according to language standards",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to format"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language (python, rust, go, javascript, typescript, sql, etc.)"
                        }
                    },
                    "required": ["code", "language"]
                }
            }),
            json!({
                "name": "test-generator",
                "description": "Generate unit tests for code",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to generate tests for"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language"
                        },
                        "framework": {
                            "type": "string",
                            "description": "Test framework (pytest, unittest, jest, etc.)"
                        }
                    },
                    "required": ["code", "language"]
                }
            }),
            json!({
                "name": "performance-analyzer",
                "description": "Analyze code for performance issues and optimization opportunities",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to analyze"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language"
                        }
                    },
                    "required": ["code", "language"]
                }
            }),
            json!({
                "name": "documentation-generator",
                "description": "Generate documentation and comments for code",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to document"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language"
                        },
                        "style": {
                            "type": "string",
                            "description": "Documentation style (docstring, comment, inline)"
                        }
                    },
                    "required": ["code", "language"]
                }
            }),
            json!({
                "name": "security-scanner",
                "description": "Scan code for security vulnerabilities",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Code to scan"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language"
                        }
                    },
                    "required": ["code", "language"]
                }
            }),
            json!({
                "name": "claude-code-generator",
                "description": "Generate code from natural language description",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "description": {
                            "type": "string",
                            "description": "What code to generate"
                        },
                        "language": {
                            "type": "string",
                            "description": "Target programming language"
                        },
                        "context": {
                            "type": "string",
                            "description": "Additional context or requirements"
                        }
                    },
                    "required": ["description", "language"]
                }
            })
        ]
    }

    async fn claude_request(&self, api_key: &str, message: &str) -> Result<String> {
        let client = reqwest::Client::new();
        let model = self
            .config
            .claude_model
            .as_deref()
            .unwrap_or("claude-sonnet-4-6");

        // Dynamic max_tokens based on message length and complexity
        let max_tokens = if message.len() > 5000 { 4096 } else { 2048 };

        // Build request with tool definitions (Phase 2: Claude Tool Use)
        let mut body_obj = serde_json::Map::new();
        body_obj.insert("model".to_string(), json!(model));
        body_obj.insert("max_tokens".to_string(), json!(max_tokens));
        body_obj.insert("system".to_string(), json!(
            "You are an expert Python developer and data scientist assistant. Provide clear, concise, and accurate responses. For code explanations, explain both what the code does and why it's written that way. You have access to tools to format code, generate tests, analyze performance, generate documentation, scan for security issues, and generate code. Use these tools when appropriate to provide complete solutions."
        ));
        body_obj.insert("messages".to_string(), json!([
            {
                "role": "user",
                "content": message
            }
        ]));

        // Include tool definitions (Phase 2: Claude Tool Use support)
        body_obj.insert("tools".to_string(), json!(Self::get_mcp_tools()));

        let body = Value::Object(body_obj);

        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2024-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_detail = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(anyhow!("Claude API error ({}): {}", status, error_detail));
        }

        let result: Value = response.json().await?;

        // Validate response structure and handle tool use (Phase 2)
        let response_text = if let Some(content_array) = result["content"].as_array() {
            // Check if response contains tool_use blocks (Phase 2 Claude Tool Use)
            let mut response_parts = Vec::new();
            let mut tool_uses = Vec::new();

            for content_block in content_array {
                if let Some(block_type) = content_block.get("type").and_then(|t| t.as_str()) {
                    match block_type {
                        "text" => {
                            if let Some(text) = content_block.get("text").and_then(|t| t.as_str()) {
                                response_parts.push(text.to_string());
                            }
                        }
                        "tool_use" => {
                            // Phase 2: Log tool use (execution loop will be implemented in Phase 2.1.3)
                            if let Some(tool_name) = content_block.get("name").and_then(|n| n.as_str()) {
                                eprintln!("DEBUG: Claude wants to use tool: {}", tool_name);
                                tool_uses.push(content_block.clone());
                            }
                        }
                        _ => {}
                    }
                }
            }

            // Return combined response (tool execution will be added in Phase 2.1.3)
            if !response_parts.is_empty() {
                response_parts.join("\n")
            } else if !tool_uses.is_empty() {
                eprintln!("DEBUG: Detected {} tool use calls (execution not yet implemented)", tool_uses.len());
                "Claude wants to use tools for this request. Tool execution loop coming in Phase 2.".to_string()
            } else {
                return Err(anyhow!("Invalid Claude API response format (no text or tool_use)"));
            }
        } else {
            return Err(anyhow!("Invalid Claude API response format (no content array)"));
        };

        Ok(response_text)
    }

    // OpenAI integration
    async fn openai_explain(&self, code: &str) -> Result<String> {
        let api_key = self
            .config
            .openai_api_key
            .as_ref()
            .ok_or(anyhow!("OpenAI API key not configured"))?;
        let model = self
            .config
            .openai_model
            .as_ref()
            .ok_or(anyhow!("OpenAI model not selected"))?;

        let message = format!(
            "You are Prism, a friendly Python data-science teacher. Explain this code clearly in 2-3 sentences (the what AND the why), then add one line starting with '💡 Tip:' giving a relevant, specific tip or gotcha for this code:\n\n```python\n{}\n```",
            code
        );

        self.openai_request(api_key, model, &message).await
    }

    async fn openai_fix(&self, code: &str, error: &str) -> Result<String> {
        let api_key = self
            .config
            .openai_api_key
            .as_ref()
            .ok_or(anyhow!("OpenAI API key not configured"))?;
        let model = self
            .config
            .openai_model
            .as_ref()
            .ok_or(anyhow!("OpenAI model not selected"))?;

        let message = format!(
            "Fix this Python code that has an error:\n\nError: {}\n\nCode:\n```python\n{}\n```\n\nProvide corrected code only.",
            error, code
        );

        self.openai_request(api_key, model, &message).await
    }

    async fn openai_complete(&self, code: &str, context: Option<&str>) -> Result<String> {
        let api_key = self
            .config
            .openai_api_key
            .as_ref()
            .ok_or(anyhow!("OpenAI API key not configured"))?;
        let model = self
            .config
            .openai_model
            .as_ref()
            .ok_or(anyhow!("OpenAI model not selected"))?;

        let ctx = context.unwrap_or("");
        let message = format!(
            "Complete this Python code. Only provide the completion.\n\nContext: {}\n\n```python\n{}\n```\n\nCompletion:",
            ctx, code
        );

        self.openai_request(api_key, model, &message).await
    }

    async fn openai_request(&self, api_key: &str, model: &str, message: &str) -> Result<String> {
        let client = reqwest::Client::new();
        let body = json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ],
            "max_tokens": 1024,
        });

        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("OpenAI API error: {}", response.status()));
        }

        let result: Value = response.json().await?;
        let response_text = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or(anyhow!("No response from OpenAI"))?
            .to_string();

        Ok(response_text)
    }
}
