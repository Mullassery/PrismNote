# PrismNote

**Data science notebook with support for 15+ programming languages, SQL execution across 9+ databases, and intelligent code assistance.**

A local-first notebook for data exploration, analysis, and systems programming. Works offline, requires no cloud account, and integrates seamlessly with your existing infrastructure.

---

## Core Capabilities

### Multi-Language Support

Execute code in 15+ languages with full kernel support:

**Data Science:** Python, R, Julia, Mojo  
**Systems Programming:** C++, Rust, Go, Zig, Scala  
**GPU Computing:** CUDA C++  
**Query Languages:** SQL (PostgreSQL, MySQL, BigQuery, Snowflake, Redshift, DuckDB, SQLite, T-SQL, Oracle)  
**Web/Script:** TypeScript, JavaScript  
**Documentation:** Markdown, Raw Text

Each language includes:
- Syntax highlighting via Monaco editor
- Full execution environment
- Session state preservation
- Visualization support where applicable
- Auto-completion and formatting

### SQL First-Class Support

Write SQL once, execute across multiple databases:

```sql
SELECT user_id, COUNT(*) as activity_count
FROM events
WHERE date > CURRENT_DATE - INTERVAL 7 DAY
GROUP BY user_id
ORDER BY activity_count DESC
LIMIT 100;
```

Features:
- Connection picker to switch databases without editing code
- Query result pagination and export (CSV, JSON, TSV)
- Query cost estimation (BigQuery, Snowflake)
- Syntax highlighting for 10 SQL dialects
- Automatic optimization suggestions

### Code Assistance

Intelligent code features without vendor lock-in:

- Auto-format (black, rustfmt, prettier, clang-format)
- Auto-documentation (Sphinx, JSDoc, Rustdoc)
- Auto-completion (LSP-based)
- Code templates for all languages
- Error detection and suggestions
- Performance analysis

### Terminal Integration

Split terminals for complex workflows:

- Vertical splits (side-by-side panes)
- Horizontal splits (stacked panes)
- Up to 4 independent terminals
- Perfect for monitoring, logging, concurrent processes
- Useful for robotics, DevOps, data pipelines

### Data Exploration

Visual data inspection without code:

- Click a file to see schema and statistics
- Automatic data quality scoring
- Column histograms and NULL detection
- PII detection (emails, phone numbers, SSNs)
- Data lineage tracking
- Filter and sort visually

---

## Installation

### macOS

```bash
brew install prismnote
prismnote
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install prismnote

# Fedora/RHEL
sudo dnf install prismnote

# Or from source
npm install -g prismnote
prismnote
```

### Windows

```bash
# Using Chocolatey
choco install prismnote
prismnote

# Or via npm
npm install -g prismnote
prismnote
```

### Docker

```bash
docker run -p 3000:3000 -v $(pwd)/notebooks:/app/notebooks prismnote:latest
# Open http://localhost:3000
```

### From Source

```bash
git clone https://github.com/Mullassery/prismnote.git
cd prismnote
npm install
npm run dev
# Open http://localhost:3000
```

---

## Quick Start

### Create Your First Notebook

1. Start PrismNote: `prismnote` (opens http://localhost:3000)
2. Click "New Notebook"
3. Add cells by clicking "+" or pressing Cmd+Enter
4. Select language from dropdown
5. Write code and press Shift+Enter to execute

### Try a Multi-Language Workflow

**Cell 1 (Python):** Load data
```python
import pandas as pd
df = pd.read_csv('data.csv')
print(f"Loaded {len(df)} rows")
```

**Cell 2 (SQL):** Query database
```sql
SELECT * FROM analytics 
WHERE date > CURRENT_DATE - INTERVAL 30 DAY
ORDER BY timestamp DESC
```

**Cell 3 (Python):** Process results
```python
# Continue working with results
print(df.describe())
```

**Cell 4 (Markdown):** Document findings
```markdown
# Analysis Summary

Key findings:
- User count: 1,500
- Active rate: 78%
```

### Keyboard Shortcuts

Common commands:
```
Cmd/Ctrl + Enter     Add cell
Shift + Enter        Execute cell
Cmd/Ctrl + K         AI assistance (if configured)
Cmd/Ctrl + S         Save notebook
Cmd/Ctrl + /         Toggle comment
Cmd/Ctrl + Shift + F Format code
```

---

## Features by Language

### Python

Full IPython kernel integration:

```python
# Data analysis
import pandas as pd
df = pd.read_csv('data.csv')

# Visualization
import matplotlib.pyplot as plt
plt.plot(df['date'], df['value'])

# ML/AI
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
```

- Rich output (images, tables, HTML)
- Variable inspector
- Package installation (pip)
- Magic commands (%time, %timeit)

### R

R kernel for statistical analysis:

```r
library(tidyverse)

df <- read_csv('data.csv')

df %>%
  filter(value > 100) %>%
  mutate(normalized = scale(value)) %>%
  ggplot(aes(x = date, y = normalized)) +
    geom_line()
```

- ggplot2 visualization
- tidyverse data manipulation
- Statistical functions
- Package management

### Julia

Julia kernel for numerical computing:

```julia
using LinearAlgebra
using Plots

A = rand(100, 100)
eigenvalues(A)

# Numerical computation
solve(A, rand(100))
```

- Multiple dispatch
- Parallel computing
- Scientific computing
- High performance

### Rust

Compile and run Rust code:

```rust
fn main() {
    let data = vec![1, 2, 3, 4, 5];
    for x in data {
        println!("{}", x * 2);
    }
}
```

- Safe systems programming
- Zero-cost abstractions
- Fast execution
- C/C++ interoperability

### Go

Concurrent programming:

```go
package main

func main() {
    ch := make(chan string)
    go func() {
        ch <- "Hello from goroutine"
    }()
    msg := <-ch
    println(msg)
}
```

- Goroutines and channels
- Fast compilation
- Production-grade
- Excellent stdlib

### CUDA

GPU acceleration:

```cuda
__global__ void add(float *a, float *b, float *c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) c[i] = a[i] + b[i];
}
```

- NVIDIA GPU support
- Parallel computing
- High performance
- Deep learning acceleration

### SQL

Multi-database support:

```sql
-- Works with PostgreSQL, MySQL, BigQuery, Snowflake, etc.
WITH ranked_users AS (
  SELECT user_id, score,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank
  FROM users
)
SELECT * FROM ranked_users WHERE rank <= 100;
```

- 9+ database backends
- Query optimization hints
- Cost estimation
- Result export

---

## Workflows

### Data Analysis Pipeline

1. **Load Data (Python/SQL)**
   ```python
   import pandas as pd
   df = pd.read_csv('data.csv')
   ```

2. **Explore Visually**
   - Open Data Explorer
   - Click columns to see distributions
   - Identify patterns and outliers

3. **Query Database (SQL)**
   ```sql
   SELECT * FROM source_table WHERE conditions
   ```

4. **Process Results (Python/R/Julia)**
   - Clean data
   - Calculate metrics
   - Create visualizations

5. **Document (Markdown)**
   - Write findings
   - Embed visualizations
   - Record methodology

### Systems Programming

1. **Write Core Logic (Rust/Go/C++)**
   ```rust
   fn process(data: &[u8]) -> Result<Vec<u8>, Error> {
       // High-performance code
   }
   ```

2. **Benchmark**
   ```python
   import time
   start = time.time()
   # Run benchmark
   elapsed = time.time() - start
   ```

3. **Test**
   ```go
   func TestMyFunction(t *testing.T) {
       // Test cases
   }
   ```

### DevOps/Monitoring

1. **Terminal 1:** Monitor logs
   ```bash
   kubectl logs -f pod-name
   ```

2. **Terminal 2:** Watch metrics
   ```bash
   watch kubectl get pods
   ```

3. **Terminal 3:** Execute commands
   ```bash
   kubectl apply -f config.yaml
   ```

4. **Terminal 4:** Debug
   ```bash
   kubectl exec -it pod-name -- bash
   ```

---

## Configuration

### Database Connections

Configure in Settings (Cmd/Ctrl + ,):

```json
{
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "analytics",
    "user": "analyst"
  }
}
```

Supported databases:
- PostgreSQL (recommended)
- MySQL/MariaDB
- BigQuery
- Snowflake
- Amazon Redshift
- DuckDB (embedded)
- SQLite (file-based)
- SQL Server (T-SQL)
- Oracle Database

### Code Formatting

Auto-format on save for all languages:

```json
{
  "formatting": {
    "enabled": true,
    "formatOnSave": true
  }
}
```

### Execution

Control how code runs:

```json
{
  "execution": {
    "timeout": 30000,
    "maxOutputLines": 10000,
    "autoSave": true
  }
}
```

---

## Keyboard Shortcuts

### Core Operations

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + N | New notebook |
| Cmd/Ctrl + S | Save |
| Cmd/Ctrl + P | Command palette |
| Cmd/Ctrl + / | Toggle comment |

### Cells

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + Enter | Add cell |
| Shift + Enter | Execute cell |
| Cmd/Ctrl + Shift + Enter | Run all cells |
| Cmd/Ctrl + Delete | Delete cell |

### Navigation

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + F | Find in notebook |
| Cmd/Ctrl + G | Go to cell |
| Cmd/Ctrl + E | Data explorer |

---

## Performance

Benchmark results on typical workloads:

| Language | Startup | 1KB Code | 1MB Data |
|----------|---------|----------|----------|
| Python | <1s | Fast | Fast |
| R | <2s | Medium | Fast |
| Julia | <3s | Very Fast | Very Fast |
| Rust | <2s | Very Fast | Very Fast |
| Go | <1s | Very Fast | Very Fast |
| SQL | <0.5s | Variable | Fast |

Memory usage: ~45 MB baseline, scales with data size.

---

## Documentation

Comprehensive documentation organized by topic:

### 🚀 Getting Started
- **[Installation & Setup](docs/guides/GETTING_STARTED.md)** - Quick start guide
- **[Multi-Language Support](docs/guides/MULTI_LANGUAGE_SUPPORT.md)** - Python, R, Rust, Go, etc.
- **[Multi-Terminal Guide](docs/guides/MULTI_TERMINAL_GUIDE.md)** - Split terminals tutorial
- **[Deployment Guides](docs/guides/)** - Docker, AWS, Azure, GCP, Kubernetes

### 📚 Reference
- **[API Documentation](docs/reference/API_REFERENCE.md)** - REST API endpoints
- **[Settings Reference](docs/reference/SETTINGS_REFERENCE.md)** - Configuration options
- **[Security](docs/reference/SECURITY.md)** - Security model and best practices
- **[Contributing](docs/reference/CONTRIBUTING.md)** - Contribution guidelines

### 🛠️ Development
- **[Product Vision](docs/development/PRODUCT_VISION.md)** - Strategic direction
- **[Features Status](docs/development/FEATURES_STATUS.md)** - Implemented vs planned
- **[Roadmap](docs/reference/ROADMAP.md)** - Technical roadmap

### 🤖 AI & Integration
- **[Claude Integration](docs/guides/AI_MCP_INTEGRATION.md)** - MCP protocol, Claude API
- **[Advanced Execution](docs/guides/EXECUTION_BACKENDS.md)** - Docker, Kubernetes backends

See [Complete Documentation Index](docs/README.md) for all resources.

## Troubleshooting

### Python kernel not found

```bash
pip install jupyter ipython
# Restart PrismNote
```

### R kernel missing

```r
install.packages("IRkernel")
IRkernel::installspec()
```

### Terminal commands not working

Check that commands exist in your PATH:
```bash
which python
which go
which rustc
```

### High memory usage

- Restart kernel from settings
- Close unused cells
- Reduce data size
- Monitor with system tools

---

## Use Cases

### Data Science

- Exploratory data analysis
- Statistical analysis
- Machine learning workflows
- Data visualization
- Report generation

### Systems Programming

- Algorithm development
- Performance optimization
- Concurrent system design
- Systems testing
- Benchmarking

### Database Administration

- Query development
- Schema exploration
- Performance tuning
- Data migration
- Documentation

### Education

- Teaching programming
- Lab assignments
- Interactive tutorials
- Code examples
- Student projects

### Monitoring

- Real-time log analysis
- System status dashboard
- Alert investigation
- Trend analysis
- Performance debugging

---

## Project Status

**Version:** 1.8.0  
**Status:** Production Ready  
**License:** Proprietary  
**GitHub:** github.com/Mullassery/prismnote  
**Issues:** github.com/Mullassery/prismnote/issues  

### Supported Platforms

- macOS (Intel, Apple Silicon)
- Linux (Ubuntu, Fedora, Debian)
- Windows (WSL2 recommended)
- Docker

### Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Architecture Highlights

### Local-First Design

- Runs entirely on your machine
- No cloud account required
- All data stays local
- Works offline
- No bandwidth overhead

### Multi-Language Engine

- Language-agnostic execution
- Jupyter kernel integration
- Direct compiler support
- Database driver abstraction
- Extensible architecture

### Type-Safe Frontend

- TypeScript throughout
- React for UI
- Comprehensive testing
- Keyboard-accessible
- Performance optimized

---

## Support & Resources

- GitHub Issues: Report bugs or request features
- GitHub Discussions: Ask questions and share ideas
- Releases: View changelog and download binaries
- Documentation: GETTING_STARTED.md and docs/

---

## License

Proprietary Software - See LICENSE file for details

---

## Next Steps

1. **Install:** `npm install -g prismnote` or `brew install prismnote`
2. **Start:** `prismnote`
3. **Create:** Your first notebook
4. **Explore:** Try different languages
5. **Contribute:** Help improve PrismNote

Questions? Visit github.com/Mullassery/prismnote/discussions

Enjoy data science and systems programming without boundaries.
