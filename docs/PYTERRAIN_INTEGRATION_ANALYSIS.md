# PyTerrainMap Integration Analysis
## How PyRoboFrames & PyRoboVision Enhance Terrain Intelligence Within Architectural Boundaries

**Analysis Date:** 2026-07-20  
**Scope:** Research integration opportunities for PyTerrainMap with PyRoboFrames and PyRoboVision while maintaining clear architectural ownership  

---

## Executive Summary

PyTerrainMap can strategically embed capabilities from PyRoboFrames and PyRoboVision while remaining a "spatial intelligence platform" that does NOT own learning pipelines or model selection:

- **PyRoboFrames** solves: **Robot perception data pipelines** (sensor ingestion → normalized observations)
- **PyRoboVision** solves: **Vision model performance tracking** (which models work best for terrain perception)
- **PyTerrainMap** benefits: Higher-quality sensor inputs + model-aware quality gates without owning either pipeline

The key insight is **data flow architecture**: observations flow through PyRoboFrames → get validated by PyTerrainMap → get analyzed by PyRoboVision → feedback loops improve both.

---

## 1. PyRoboFrames Integration: Sensor Data Pipelines

### Current PyRoboFrames Capabilities
- **Zero-copy hardware-accelerated dataloader** for robot-learning datasets (LeRobot v3.0, MCAP, ROS 2 bags)
- **Multi-sensor composition** (camera frames, joint state, IMU, GPS, LiDAR)
- **Temporal windowing** (`delta_timestamps`) for multi-rate sensor alignment
- **Robotics DataFrame** — typed, time-indexed view over heterogeneous sensor data
- **MCAP↔Parquet conversion** (JSON topics, protobuf reflection, CDR/ROS2msg decoding)
- **Backend abstraction** (CPU/CUDA/MLX) for transform and device placement

### What PyTerrainMap Lacks
1. **High-throughput ingest of multi-robot sensor streams** — Currently assumes observations already in memory/normalized
2. **Temporal window assembly** — Raw sensors are async; need 50-100ms windows to align camera + IMU + GPS
3. **Sensor composition tracking** — Which sensors contributed to this observation? At what quality levels?
4. **Dataframe-query semantics** — "Give me all frames where both LiDAR AND camera were present within 20ms"

### Integration Opportunity
**Embed PyRoboFrames as the "Sensor Fusion Ingestion Layer"**

```
[Multi-Robot Sensor Streams (MCAP/ROS2)]
    ↓
[PyRoboFrames: Compose, Align, Normalize] ← TIER 1 (data pipeline)
    ↓
[PyTerrainMap: Observations with Temporal Metadata] ← TIER 2 (spatial intelligence)
    ↓
[PyReverseETL: Movement/Activation] ← (downstream)
```

**Specific capabilities:**
- `RoboticsDataFrame.align()` → Snap all sensors to reference clock (e.g., camera timestamps)
- `converter.convert_mcap()` → Flattened Parquet (per-topic leaf columns) → import into PyTerrainMap as batch observations
- `to_pandas()` + vectorized ingestion of (lat, lon, timestamp, sensor_quality, observation_value)
- Sensor composition as **provenance metadata** (e.g., "observation #4521 came from cameras 1,2,3 + LiDAR + GPS")

**Boundary Respect:**
- ✅ PyTerrainMap does NOT own PyRoboFrames' code
- ✅ PyTerrainMap does NOT implement dataloader patterns (PyRoboFrames owns this)
- ✅ PyTerrainMap does NOT select backends or optimize GPU decode (PyRoboFrames owns this)
- ✅ PyRoboFrames output is just data; PyTerrainMap imports it and validates/fuses

### Data Flow
```
Observation Object (from PyRoboFrames):
{
  observation_id: UUID,
  timestamp: u64,           ← from PyRoboFrames temporal windowing
  temporal_metadata: {      ← NEW: track which sensors contributed
    event_time: u64,
    capture_times: {
      "camera_0": u64,
      "camera_1": u64,
      "lidar_0": u64,
      "imu_0": u64,
      "gps_0": u64,
    },
    clock_sources: {
      "camera_0": ClockSource::Camera,
      "lidar_0": ClockSource::LiDAR,
      ...
    },
    quality: {
      "camera_0": 0.95,     ← PyRoboFrames frame-decode success
      "lidar_0": 0.98,
      "gps_0": 0.92,
    }
  },
  geo_point: GeoPoint,
  sensor_values: Map<SensorID, SensorValue>,
  provenance: {            ← NEW: lineage to PyRoboFrames dataset/episode
    source_episode: "episode_42",
    source_dataset: "robot_3_floor_2_morning_run",
    global_frame_index: 4521,
  }
}
```

### Use Cases

**Construction Site Inspection (Multi-Robot Survey)**
```
3 drones fly in formation over a construction site:
  - Drone A: 4K camera + barometer
  - Drone B: thermal + LiDAR
  - Drone C: RGB-D + IMU

PyRoboFrames:
  - Ingest 3 × MCAP streams (3 × 30fps camera + sensors, async arrival)
  - Align timestamps (reference = Drone A camera, tolerance = 50ms)
  - Compose: [RGB from A, thermal from B, depth from C, aligned IMU/GPS from all]

PyTerrainMap:
  - Import as batch observations
  - Multi-sensor fusion: weight by quality (thermal more confident in shadows)
  - Detect anomalies: "Why does Drone B show cracks Drone A doesn't?" → sensor drift? real difference?
  - Output: Georeferenced 3D model with sensor-source annotations

PyReverseETL:
  - Activate: "If anomaly_confidence > 0.8, dispatch ground team to UTM [x,y]"
```

**Agricultural Monitoring (Multi-Rate Sensors)**
```
One rover with:
  - RGB camera @ 10 fps
  - Hyperspectral camera @ 1 fps
  - Soil moisture probe @ 0.1 Hz
  - GPS @ 1 Hz
  - IMU @ 50 Hz

PyRoboFrames:
  - Compose into 100ms windows (camera at 0,100,200ms; soil probe interpolated)
  - Align all to camera timestamps

PyTerrainMap:
  - Confidence-weighted fusion: camera 0.95 + probe 0.8
  - Temporal decay: recent soil measurements trust more
  - Anomaly: "Soil probe spiked but cameras show normal → sensor malfunction"

PyVectorHound (diagnostics):
  - "Why did the model misclassify this field?" → retrieve similar soil/camera/timestamp combos
  - "Which sensor combo explains 80% of variance in yield?" → sensor importance attribution
```

---

## 2. PyRoboVision Integration: Vision Model Performance Tracking

### Current PyRoboVision Capabilities
- **Multi-object tracking (MOT)** with Kalman filter + Hungarian matching
- **Trajectory prediction** (constant velocity/acceleration with uncertainty)
- **Behavioral & intent classification** (stopped, turning, accelerating; lane change, collision avoidance)
- **3D perception** (monocular depth, 3D bboxes, occupancy grids, LiDAR fusion)
- **Vision model registry** — Which YOLO/SAM2/CLIP variants perform best?
- **Safety validation** — Constraint-based action correction
- **Model optimization** — ONNX/TensorRT export, quantization, inference profiling

### What PyTerrainMap Lacks
1. **Terrain-specific vision model selection** — "Which depth-estimation model works best for rocky vs. grassy terrain?"
2. **Performance degradation tracking** — "Depth estimation fails in shadows; confidence decays with cloud cover"
3. **Cross-model consistency validation** — "Do 3 different YOLO versions agree on tree locations? If not, which terrain features cause divergence?"
4. **Adaptive model ensemble** — Swap models per terrain type, time of day, weather

### Integration Opportunity
**Embed PyRoboVision as the "Vision Model Intelligence Layer"**

```
[Raw Sensor Streams (cameras, LiDAR, etc.)]
    ↓
[PyRoboFrames: Composition & Alignment] ← data pipeline
    ↓
[PyRoboVision: Vision Model Inference + Registry] ← TIER 1 (model performance)
    ↓
[PyTerrainMap: Spatial Intelligence + Quality Gates] ← TIER 2 (terrain mapping)
```

**Specific capabilities:**
- Vision model registry: `registry.models()` → list tracked models (YOLO v8/11, SAM2, CLIP variants, depth estimators)
- Per-model performance metrics: `registry.performance(model="yolov11_thermal", terrain="rocky")` → (mAP, latency_ms, inference_cost)
- Adaptive model selection: `registry.select_best(task="tree_detection", terrain_type="forest", max_latency_ms=100)` → model_id + confidence_bounds
- Model-aware observations: each detection/depth map tagged with `model_id`, `model_version`, `inference_latency_ms`, `confidence`

**Boundary Respect:**
- ✅ PyTerrainMap does NOT own model training or fine-tuning (PyRoboVision owns this)
- ✅ PyTerrainMap does NOT implement inference (PyRoboVision owns this)
- ✅ PyTerrainMap does NOT select models based on policy (PyRoboVision + user policy owns this)
- ✅ PyTerrainMap uses vision outputs as **inputs to spatial fusion**, validates them, annotates quality

### Data Flow

```
Vision Output (from PyRoboVision):
{
  model_id: "yolov11_thermal_v2.3.1",
  inference_task: "object_detection",
  timestamp: u64,
  output: {
    detections: [
      {
        class_id: 5,         // "tree"
        bbox: [x1, y1, x2, y2],
        confidence: 0.92,    ← PyRoboVision inference confidence
        model_trained_on: ["forest", "temperate"],
        terrain_inferred: "forest",    ← PyRoboVision trained-terrain hint
      }
    ]
  },
  performance: {
    inference_latency_ms: 45,
    model_nms_threshold: 0.45,
    registry_performance: {
      mAP_on_forest: 0.88,
      mAP_on_rocky: 0.65,   ← terrain-aware metric
      mAP_on_urban: 0.79,
      typical_fp_rate: 0.08,
    }
  }
}
→
PyTerrainMap: 
{
  geo_point: GeoPoint,
  observation: {
    class: "tree",
    confidence: 0.92,
    model_performance_hint: {
      expected_precision: 0.88,
      expected_recall: 0.92,
      trust: "high",          ← based on registry + terrain
    }
  },
  fusion_weight: 0.92 × 0.88 = 0.81    ← confidence × model_terrain_accuracy
}
```

### Use Cases

**Disaster Response (Post-Earthquake Rubble Assessment)**
```
Search-and-rescue drone with:
  - RGB camera (YOLO v11 trained on debris)
  - Thermal camera (different lighting, shadows)
  - LiDAR (sparse, occlusions)

PyRoboVision:
  - Runs 3 detection models in parallel:
    - YOLOv11 (RGB): mAP=0.82 on debris, latency=40ms
    - Thermal variant (custom): mAP=0.76 on hot objects, latency=50ms
    - LiDAR-based clustering: coarse but reliable
  - Returns: object proposals + per-model confidence + which models agree

PyTerrainMap:
  - Terrain = "urban_rubble" (inferred from LiDAR point density, RGB color)
  - Fuses 3 vision streams with model-aware weighting:
    - RGB detection: trust=0.82 (good on debris)
    - Thermal: trust=0.76 (worse outdoors, but finds hot survivors)
    - LiDAR: trust=0.70 (sparse, but structural ground truth)
  - Weighted ensemble: "Survivor at [x,y] with ensemble_confidence=0.79"
  - Anomaly: "RGB and LiDAR agree; thermal disagrees → false alarm or reflective surface?"

PyReverseETL:
  - "Confidence > 0.75 + multi-model agreement → dispatch rescue team"
```

**Agricultural Yield Prediction (Multi-Spectral + RGB)**
```
Tractor with:
  - RGB camera (YOLOv11 crop detection)
  - Multispectral sensor (NDVI, EVI indices)
  - Hyperspectral (leaf chemistry)

PyRoboVision registry:
  - YOLO trained on {wheat, corn, soy} × {early_season, peak, harvest} × {healthy, stressed, diseased}
  - Per-variety model performance:
    - wheat: mAP=0.91 (well-trained)
    - corn: mAP=0.85 (some confusion with tall weeds)
    - soy: mAP=0.78 (small plants hard to detect)
  - Multispectral model: always high confidence on vegetation (NDVI calibrated)

PyTerrainMap:
  - Season detected = "peak" (from calendar + NDVI trajectory)
  - Terrain = "corn_field" (from YOLO + field boundary)
  - Adaptive fusion: corn model mAP is 0.85, so weight by 0.85
  - Multispectral (always stable) weighted by 1.0
  - Output: "Corn health at grid cell [i,j]: 0.89 (RGB-based) + NDVI 0.72 = ensemble_health_0.80"
  - Temporal trend: "Health declining; anomaly risk high → recommend fungicide"
```

---

## 3. Combined Workflow: End-to-End Multi-Robot Terrain Intelligence

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│           Multi-Robot Sensor Fleet                      │
│  Drone A/B/C, Rover X/Y, Ground Station                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
        ┌─────────────────────────────┐
        │   PyRoboFrames              │
        │ • Ingestion (MCAP/ROS2/bag) │
        │ • Composition (multi-sensor)│
        │ • Temporal Alignment        │
        │ • Quality Tracking          │
        └─────────────┬───────────────┘
                      │
                      ↓
        ┌─────────────────────────────────────────┐
        │  PyRoboVision                           │
        │ • Vision Model Inference (3 models)    │
        │ • Performance Registry                  │
        │ • Model-Terrain Adaptation              │
        │ • Inference Latency/Confidence          │
        └─────────────┬───────────────────────────┘
                      │
                      ↓
        ┌──────────────────────────────────────────────┐
        │  PyTerrainMap                                │
        │ • Spatial-Temporal Fusion                   │
        │ • Multi-Sensor Confidence Weighting         │
        │ • Model-Aware Quality Gating                │
        │ • 8-Failure Anomaly Detection               │
        │ • Terrain Analysis (7 Personas)             │
        │ • Uncertainty Quantification                │
        │ • Privacy & Access Control                  │
        └─────────────┬──────────────────────────────┘
                      │
                      ↓
        ┌──────────────────────────────┐
        │  Downstream (Activation)     │
        │ PyVectorHound (diagnostics)  │
        │ PyReverseETL (movement)      │
        │ StatGuardian (governance)    │
        └──────────────────────────────┘
```

### Data Types at Each Boundary

**PyRoboFrames → PyTerrainMap Boundary**
```python
RoboticsDataFrame (aligned, normalized):
{
  "timestamp_ns": [1000000, 1000100, 1000200, ...],
  "camera_0_rgb": [[...], [...], ...],       # H×W×3 uint8
  "camera_1_thermal": [[...], [...], ...],   # H×W uint16
  "lidar_0_points": [[[x,y,z], ...], ...],   # N×3 float32
  "imu_0_accel": [[ax,ay,az], [...], ...],   # N×3 float32
  "gps_0_lat": [37.77, 37.77, 37.77, ...],   # N float64
  "gps_0_lon": [-122.42, -122.42, ...],      # N float64
  "quality": {
    "camera_0": [0.95, 0.95, 0.95, ...],
    "camera_1": [0.88, 0.90, 0.88, ...],     # thermal degraded in shadows
    "lidar_0": [0.98, 0.98, 0.97, ...],
    "gps_0": [0.92, 0.88, 0.92, ...],        # multipath indoors
  }
}
```

**PyRoboVision → PyTerrainMap Boundary**
```python
VisionInferenceResult:
{
  "model_id": "yolov11_terrain_v1.2.0",
  "terrain_class": "forest_coniferous",
  "timestamp_ns": 1000150,
  "detections": [
    {
      "class_id": 14,            # "tree"
      "bbox_pixels": [100, 200, 350, 450],
      "confidence": 0.94,        # inference confidence
      "model_performance": {
        "expected_mAP": 0.89,    # registry: mAP on forest
        "expected_recall": 0.91,
        "train_domains": ["forest_temperate", "forest_boreal"],
        "inference_latency_ms": 42,
      }
    }
  ],
  "model_ensemble": {
    "yolov11": 0.94,    # confidence
    "yolov8_thermal": 0.85,   # different modality, lower on RGB
    "agreements": ["tree at approx [100,200]"]   # which models agree?
  }
}
```

**PyTerrainMap → Downstream Boundary**
```python
FusedObservation (PyTerrainMap output):
{
  "observation_id": "obs_12345",
  "h3_index": "8a2a1042d91ffff",           # resolution 14
  "elevation_bucket": 245.3,                 # meters ASL
  "timestamp": {
    "event_time_ns": 1000150,
    "temporal_metadata": {
      "clock_source": ClockSource::GPS,
      "quality": "high",
      "out_of_order_delay": 0,
    }
  },
  "observations": [
    {
      "class": "tree",
      "confidence": 0.90,       # after fusion
      "fusion_weight": 0.89,    # model_mAP (0.89) × inference_conf (0.94) = 0.84... [detail]
      "source_models": ["yolov11_v1.2.0"],
      "sensor_sources": ["camera_0"],
      "quality": {
        "confidence_model": 0.94,
        "confidence_terrain_match": 0.89,
        "confidence_sensor": 0.95,
        "ensemble_confidence": 0.90,  # weighted product
      },
      "provenance": {
        "robot_id": "drone_a",
        "episode_id": "mapping_run_07_20_0900",
        "global_frame": 4521,
        "source_dataset": "forest_floor_july2026",
      }
    }
  ],
  "anomalies": [],   # 8-failure detection
  "uncertainty": {
    "confidence_ellipse": [[σx, σy], rotation_deg],
    "temporal_decay": 0.97,    # 50ms old
  },
  "persona_analyses": {
    "mobile_robot": {
      "traversability": "high",
      "risk": "low",
      "recommendation": "proceed",
    },
    "drone": {
      "clearance_m": 4.2,
      "landing_safety": "high",
    }
  }
}
```

### Request Patterns

**Pattern 1: Terrain Quality Assessment (Construction Site)**
```python
# User (construction manager) queries terrain at UTM 588234.5, 4102156.2
terrain = pyterrain_map.analyze(
  location=GeoPoint(utm_east=588234.5, utm_north=4102156.2),
  since_hours=1,
  include_confidence=True,
  include_provenance=True,  # which robots? when?
)

# Returns:
{
  "location": {...},
  "terrain_type": "concrete_foundation",
  "quality_score": 0.88,    # multi-sensor, multi-model ensemble
  "quality_breakdown": {
    "rgb_detection": 0.94,      # YOLO on concrete
    "lidar_structure": 0.92,    # structural alignment
    "model_registry_trust": 0.85,   # how well does YOLO perform on foundations?
  },
  "robot_contributions": [
    {"robot_id": "drone_3", "sensors": ["rgb", "lidar"], "confidence": 0.91},
    {"robot_id": "rover_1", "sensors": ["lidar"], "confidence": 0.87},
  ],
  "anomalies": ["possible_crack_region_xy"],
  "metadata": {
    "num_observations": 47,
    "time_span_minutes": 12,
    "model_versions": ["yolov11_v1.2.0", "lidar_clusterer_v2.1"],
  }
}
```

**Pattern 2: Model Performance Attribution (Agricultural)**
```python
# Analyst asks: "Why did crop health prediction vary by ±0.15 on this field?"
analysis = pyterrain_map.explain_variance(
  field_boundary=Polygon([...]),
  metric="crop_health",
  max_variance_threshold=0.15,
)

# PyTerrainMap → PyRoboVision → PyVectorHound pipeline:
# 1. PyTerrainMap identifies high-variance cells
# 2. Queries PyRoboVision: "Which model predicted crop health here?"
#    → YOLOv11 mAP on corn is 0.85, but on corn_stressed is 0.72
# 3. PyVectorHound retrieves similar observations with full lineage
# 4. Root cause: "Model confusion between late-season corn and diseased corn;
#                 soil moisture (from NDVI) disambiguates in 92% of cases"

{
  "high_variance_cells": 12,
  "primary_factor": "model_confusion_corn_disease",
  "model_accuracy_on_disease": 0.72,    # lower confidence predicted
  "disambiguation_signal": "NDVI < 0.5 → diseased",
  "recommendation": "retrain YOLO on diseased_corn class; use NDVI as pre-filter",
}
```

**Pattern 3: Multi-Robot Consensus (Disaster Response)**
```python
# Emergency coordinator: "Deploy team if 2+ robots agree on survivor location"
consensus = pyterrain_map.multi_robot_consensus(
  location_cluster=GeoPoint(lat=37.77, lon=-122.42),
  radius_m=10,
  min_agreement=2,
  include_model_confidence=True,
)

# Returns observations from N robots, with:
# - Which models detected this
# - Model confidence × registry_performance × sensor_quality
# - Ensemble confidence across models and robots

{
  "location": {"lat": 37.7749, "lon": -122.4194},
  "robot_agreement": 3,          # 3 robots detected
  "model_agreement": 2,          # RGB + thermal agree; LiDAR sparse
  "observations": [
    {
      "robot_id": "drone_a",
      "model": "yolov11_thermal_v1.2",
      "confidence": 0.91,
      "model_registry_mAP": 0.82,
      "fusion_weight": 0.75,
    },
    {
      "robot_id": "drone_b",
      "model": "yolov11_rgb_v1.2",
      "confidence": 0.87,
      "model_registry_mAP": 0.85,
      "fusion_weight": 0.74,
    },
    {
      "robot_id": "rover_1",
      "model": "lidar_clustering_v2.1",
      "confidence": 0.68,
      "model_registry_mAP": 0.70,
      "fusion_weight": 0.48,
    }
  ],
  "ensemble_confidence": 0.82,   # weighted product across all
  "actionable": True,            # meets deployment threshold
  "deploy_recommendation": "High confidence survivor detection; dispatch rescue",
}
```

---

## 4. Boundary Respect Summary: What Stays Separate

### PyTerrainMap Does NOT Own

| Capability | Owner | Reason |
|-----------|-------|--------|
| Sensor ingest (MCAP, ROS2) | PyRoboFrames | Data engineering responsibility |
| Temporal alignment algorithms | PyRoboFrames | Frame-sync logic is dataloader concern |
| Vision model inference | PyRoboVision | ML/inference runtime owned by vision layer |
| Model training/fine-tuning | PyRoboVision | ML training is not spatial intelligence |
| Model selection policy | User + PyRoboVision | Business logic for which models to use |
| Activation (movement/sync) | PyReverseETL | Data movement is separate concern |
| Quality contracts | StatGuardian | Governance and validation rules |
| Token cost attribution | OpenAnchor | LLM-specific concern |
| Retrieval debugging | PyVectorHound | Forensics and diagnostic concerns |

### PyTerrainMap DOES Own

| Capability | Why | Boundary |
|-----------|-----|----------|
| Spatial indexing (H3) | Core identity | Input: geo coordinates; Output: terrain analysis |
| Sensor fusion (multi-source) | Core identity | Consumes pre-normalized observations from PyRoboFrames |
| Temporal decay/weighting | Core identity | Input: observation timestamps; Output: quality scores |
| Anomaly detection (8 types) | Core identity | Input: fused observations; Output: anomaly classifications |
| Terrain analysis (7 personas) | Core identity | Input: fused terrain data; Output: persona-specific insights |
| Confidence quantification | Core identity | Input: observation + model + sensor quality; Output: ellipses + metrics |
| Privacy/RBAC | Core identity | All data flows through PyTerrainMap security layer |
| Provenance tracking | Core identity | Records which robots/models/sensors contributed to each observation |

---

## 5. Production Integration Checklist

### Phase 1: Boundary-Respecting Integration (Week 1-2)
- [ ] Define `ObservationInput` struct for PyRoboFrames → PyTerrainMap
  - Include: `temporal_metadata`, `sensor_sources`, `quality_scores`
- [ ] Add PyRoboFrames optional dependency (not mandatory)
  - `from pyterrain_map.loaders import PyRoboFramesLoader`
- [ ] Define `VisionInput` struct for PyRoboVision → PyTerrainMap
  - Include: `model_id`, `model_registry_performance`, `inference_confidence`, `ensemble_weights`
- [ ] Add PyRoboVision optional dependency
  - `from pyterrain_map.vision_fusion import VisionFusionWeighter`
- [ ] Write integration tests (mock PyRoboFrames/PyRoboVision outputs)
- [ ] Document data formats in INTEGRATION.md

### Phase 2: Example Workflows (Week 3)
- [ ] Example 1: Construction inspection (3-drone survey with PyRoboFrames ingestion)
- [ ] Example 2: Agricultural monitoring (multi-rate sensors aligned by PyRoboFrames)
- [ ] Example 3: Disaster response (multi-robot consensus with vision model registry)
- [ ] Verify all examples run end-to-end with synthetic data

### Phase 3: Production Hardening (Week 4+)
- [ ] Performance testing: 1000 observations/sec throughput
- [ ] Failure handling: graceful degradation if PyRoboFrames or PyRoboVision unavailable
- [ ] Caching: model registry lookups cached locally
- [ ] Async: PyRoboFrames dataloader + PyRoboVision inference run off PyTerrainMap main loop
- [ ] Monitoring: metrics on model-quality tracking, fusion weight distribution

---

## 6. Specific Use Cases with Architecture Diagrams

### Use Case A: Construction Inspection (Multi-Robot Survey)

**Robots & Sensors:**
```
Drone A: [4K RGB Camera] + [Barometric Pressure]
Drone B: [Thermal Camera] + [LiDAR]
Drone C: [RGB-D] + [IMU]
```

**Data Flow:**
```
┌─────────────┐
│  3x MCAP    │  (drone_a.mcap: 30fps RGB @ 50ms latency)
│  Streams    │  (drone_b.mcap: 30fps thermal @ 80ms latency)
│  (Async)    │  (drone_c.mcap: 30fps RGB-D @ 40ms latency)
└──────┬──────┘
       │ [PyRoboFrames.convert_mcap() + RoboticsDataFrame]
       ↓
┌──────────────────────────────┐
│  Aligned Observations        │
│  • Reference: Drone A camera │  [100, 100.05, 100.1, ...]ms
│  • Align Drone B (±50ms)     │
│  • Align Drone C (±50ms)     │
│  • Thermal NaN where B late  │
│  • Quality: 0.95/0.88/0.92   │
└──────┬───────────────────────┘
       │ [PyRoboVision inference on RGB + thermal]
       ↓
┌──────────────────────────────┐
│  Vision Detections           │
│  YOLOv11 (RGB): struct found │  conf=0.94, registry_mAP=0.88 (construction)
│  Thermal: temp anomaly found │  conf=0.85, registry_mAP=0.76 (thermal)
│  LiDAR: point cloud cluster  │  conf=0.97, registry_mAP=0.90 (structure)
└──────┬───────────────────────┘
       │ [PyTerrainMap fusion]
       ↓
┌──────────────────────────────┐
│  Fused Observations          │
│  Structure at [x,y]:         │
│  • Confidence: 0.92          │  weighted by 0.94×0.88 (RGB)
│                             │            + 0.97×0.90 (LiDAR)
│  • Ensemble: 0.92           │  high agreement across models
│  • Anomaly: "Heat in wall"   │  thermal sees 180°C, RGB normal
│  • Quality: 0.91            │  multi-model + multi-sensor
│  • Provenance:              │  drone_a (RGB), drone_b (thermal),
│                             │  drone_c (structure) episode 42
└──────────────────────────────┘
```

**Output (to rescue/planning systems):**
```json
{
  "site": "building_123_floor_2",
  "observations": [
    {
      "id": "obs_12345",
      "h3": "8a2a1042d91ffff",
      "type": "structural_anomaly",
      "description": "Crack in concrete + heat signature (wall interior ~50°C hotter)",
      "confidence": 0.92,
      "model_sources": ["yolov11_construction", "thermal_anomaly_detector", "lidar_structure"],
      "sensor_sources": ["drone_a_rgb", "drone_b_thermal", "drone_c_lidar"],
      "location": {"lat": 37.7749, "lon": -122.4194, "alt": 45.2},
      "actions": [
        "visual_inspection_recommended",
        "thermal_scan_confirmed",
        "structure_engineer_review"
      ]
    }
  ]
}
```

---

### Use Case B: Agricultural Yield Prediction (Multi-Rate Sensors)

**Robot & Sensors:**
```
Tractor: [RGB camera @ 10 fps]
         [Multispectral @ 1 fps]
         [Hyperspectral @ 0.5 fps]
         [Soil moisture @ 0.1 fps]
         [GPS @ 1 Hz]
         [IMU @ 50 Hz]
```

**Data Flow:**
```
┌──────────────────────────────┐
│  Raw Sensor Streams (MCAP)   │
│  10 fps RGB         (100ms)  │
│  1 fps Multispectral (1s)    │
│  0.5 fps Hyperspectral (2s)  │
│  0.1 fps Soil probe (10s)    │
│  1 Hz GPS           (1s)     │
│  50 Hz IMU          (20ms)   │
└──────┬───────────────────────┘
       │ [PyRoboFrames.align(ref=rgb, tolerance=500ms)]
       ↓
┌──────────────────────────────┐
│  100ms Windows               │
│  [0-100ms]:                  │
│  • RGB: frame 0              │
│  • Multispectral: NaN (wait) │
│  • Soil probe: NaN (wait)    │
│  • GPS: interpolated         │
│  • IMU: 5 samples avg        │
│  Quality: {rgb:0.95, ...}    │
│                              │
│  [1000-1100ms]:              │
│  • RGB: frame 10             │
│  • Multispectral: frame 1    │ (aligned via searchsorted)
│  • Soil probe: NaN           │
│  • GPS: new value            │
│  Quality: {rgb:0.95, ms:0.98}
└──────┬───────────────────────┘
       │ [PyRoboVision inference]
       ↓
┌──────────────────────────────┐
│  Vision Outputs              │
│  YOLOv11 crop type:          │
│    "corn" conf=0.91          │
│    mAP_on_corn=0.85          │
│  Multispectral NDVI:         │
│    NDVI = 0.68 (healthy)     │
│    trust=1.0 (physics-based) │
│  Hyperspectral N content:    │
│    est_ppm = 150 (adequate)  │
│    conf=0.80                 │
└──────┬───────────────────────┘
       │ [PyTerrainMap fusion]
       ↓
┌──────────────────────────────┐
│  Fused Terrain Intelligence  │
│  Cell [42, 128]:             │
│  • Crop type: "corn"         │
│    confidence: 0.91          │
│  • Health: 0.82              │
│    = 0.85 (YOLO) × 0.91 conf │
│      + 1.0 (NDVI) × 0.68     │
│      + 0.80 (N) × 150ppm     │
│  • Risk: "low"               │
│  • Soil moisture OK: 22%     │
│  • Temporal trend: stable    │
│  • Recommendation: maintain  │
│    current protocol          │
└──────────────────────────────┘
```

**Output (to farm management):**
```json
{
  "field": "south_40_acres",
  "timestamp": "2026-08-15T14:30:00Z",
  "grid_cells": [
    {
      "grid_id": "42_128",
      "location": {"lat": 40.1234, "lon": -93.5678},
      "crop_type": "corn",
      "crop_confidence": 0.91,
      "health_score": 0.82,
      "yield_estimate_bu_ac": 158,
      "yield_confidence": 0.87,
      "risk_level": "low",
      "soil_moisture_pct": 22,
      "n_status_ppm": 150,
      "recommendation": "continue current program",
      "model_sources": [
        "yolov11_crop_v1.2 (85% mAP on corn)",
        "ndvi_health (physics-based)",
        "hyperspectral_n_predictor (80% accuracy)"
      ],
      "sensor_contributions": {
        "rgb": 0.40,
        "multispectral": 0.35,
        "hyperspectral": 0.15,
        "soil_probe": 0.10
      }
    }
  ],
  "field_summary": {
    "avg_health": 0.81,
    "yield_forecast_total": 6300,
    "variability_flag": false,
    "actions": []
  }
}
```

---

### Use Case C: Disaster Response (Multi-Robot Survivor Detection)

**Robots:**
```
Drone A: [4K RGB] + [Thermal]     (high altitude, wide coverage)
Drone B: [RGB-D] + [Thermal]      (medium altitude, detailed 3D)
Rover 1: [LiDAR] + [IMU]          (ground-level, structural mapping)
```

**Data Flow:**
```
┌──────────────────────────────┐
│  Multi-Robot MCAP Streams    │
│  (async, variable latency)   │
└──────┬───────────────────────┘
       │ [PyRoboFrames.align_ros2_bags()]
       ↓
┌──────────────────────────────┐
│  Composite Observations      │
│  • RGB (Drone A + B)         │
│  • Thermal (Drone A + B)     │  ← two thermal models, different sensors
│  • Depth (Drone B)           │
│  • LiDAR (Rover 1)           │
│  • Quality per sensor        │
└──────┬───────────────────────┘
       │ [PyRoboVision: 3 models in parallel]
       ↓
┌──────────────────────────────────────┐
│  Vision Detections                   │
│  Model 1: YOLOv11-RGB (person class) │
│    Detections at [x,y]: confidence   │
│    0.87, registry_mAP=0.92           │
│                                      │
│  Model 2: Thermal-anomaly (hot body) │
│    Detections at [x,y]: confidence   │
│    0.79, registry_mAP=0.85 (less     │
│    reliable in urban/reflections)    │
│                                      │
│  Model 3: LiDAR-clustering (shape)   │
│    Candidate at [x,y]: confidence    │
│    0.71, registry_mAP=0.78           │
└──────┬───────────────────────────────┘
       │ [PyTerrainMap ensemble fusion]
       ↓
┌──────────────────────────────────────┐
│  Fused Observations (High Confidence)│
│  Potential Survivor:                 │
│  • Location: [37.7749, -122.4194]    │
│  • Ensemble confidence: 0.82         │
│    (0.87×0.92 from RGB               │
│   + 0.79×0.85 from thermal           │
│   + 0.71×0.78 from LiDAR) / 3        │
│  • Multi-model agreement: 3/3        │
│    (all models detect same area)     │
│  • Robot agreement: 3/3              │
│    (Drone A, B, Rover all see)       │
│  • Action recommended: DEPLOY        │
│  • Confidence level: HIGH             │
│                                      │
│  Thermal-Only Detection:             │
│  • Location: [37.7751, -122.4192]    │
│  • RGB confidence: 0.32 (shadow/blur)│
│  • Thermal confidence: 0.81          │
│  • LiDAR: no detection (occluded)    │
│  • Multi-model agreement: 1/3        │
│    (only thermal sees it)            │
│  • Anomaly: "disagreement across     │
│    models; likely false alarm        │
│    (reflective surface?)"            │
│  • Confidence: MEDIUM                │
│  • Action: INVESTIGATE               │
└──────────────────────────────────────┘
```

**Output (to dispatch center):**
```json
{
  "incident_id": "DIS_2026_07_20_001",
  "detections": [
    {
      "priority": "HIGH",
      "location": {"lat": 37.7749, "lon": -122.4194, "alt": 12.5},
      "detection_type": "potential_survivor",
      "confidence": 0.82,
      "evidence": {
        "rgb_detection": {
          "robot": "drone_a",
          "model": "yolov11_person_v2.1",
          "confidence": 0.87,
          "registry_performance": 0.92,
          "sensor": "4k_rgb"
        },
        "thermal_detection": {
          "robot": "drone_b",
          "model": "thermal_person_detector_v1.5",
          "confidence": 0.79,
          "registry_performance": 0.85,
          "sensor": "thermal_array"
        },
        "lidar_confirmation": {
          "robot": "rover_1",
          "model": "lidar_human_shape_v2.0",
          "confidence": 0.71,
          "registry_performance": 0.78,
          "sensor": "sick_lidar"
        }
      },
      "model_agreement": "3/3 (perfect ensemble)",
      "robot_agreement": "3/3 (all robots detect)",
      "actionable": true,
      "dispatch_recommendation": "Send ground rescue team to [37.7749, -122.4194]; highest priority"
    },
    {
      "priority": "MEDIUM",
      "location": {"lat": 37.7751, "lon": -122.4192, "alt": 10.2},
      "detection_type": "thermal_anomaly",
      "confidence": 0.52,
      "evidence": {
        "thermal_only": {
          "robot": "drone_a",
          "model": "thermal_person_detector_v1.5",
          "confidence": 0.81,
          "registry_performance": 0.85
        },
        "rgb_weak_detection": {
          "robot": "drone_b",
          "model": "yolov11_person_v2.1",
          "confidence": 0.32,
          "reason": "shadow; low signal"
        },
        "lidar_null": {
          "robot": "rover_1",
          "model": "lidar_human_shape_v2.0",
          "confidence": null,
          "reason": "occluded by building"
        }
      },
      "model_agreement": "1/3 (thermal only)",
      "robot_agreement": "2/3 (drones see; rover blocked)",
      "confidence_breakdown": "thermal likely high (0.81) but disagreement risk high; may be reflective surface",
      "actionable": false,
      "dispatch_recommendation": "Secondary; investigate after HIGH priority"
    }
  ],
  "summary": {
    "high_confidence_targets": 1,
    "medium_confidence_targets": 1,
    "overall_status": "DEPLOY_RESCUE_TEAM",
    "estimated_survivors": 1
  }
}
```

---

## 7. Conclusion: Architectural Integrity

PyTerrainMap can strategically integrate PyRoboFrames and PyRoboVision **without violating its core identity** of being a "high-fidelity terrain intelligence platform":

### Integration Principles
1. **Data, Not Logic:** PyTerrainMap imports data (observations, vision results) but doesn't implement ingest logic, inference, or model selection
2. **Quality Layers:** Each system adds a quality signal; PyTerrainMap fuses and reasons about them without owning any single layer
3. **Boundaries as Contracts:** Clear data formats (ObservationInput, VisionInput) let each system evolve independently
4. **Provenance Preservation:** Every observation carries lineage (which robot, which model, which sensor), enabling root-cause analysis

### What Emerges
A cohesive platform where:
- **PyRoboFrames** normalizes sensor data (ingest → alignment → composition)
- **PyRoboVision** evaluates vision models (inference → registry → ensemble)
- **PyTerrainMap** fuses everything (quality weighting → anomaly detection → terrain analysis)
- **Downstream systems** (PyReverseETL, PyVectorHound, StatGuardian) consume high-confidence, well-reasoned observations

This architecture scales multi-robot deployments while maintaining clear ownership and enabling diagnostics when things go wrong.

