# Execution Backends Documentation

**Version:** 1.0  
**Date:** 2026-07-28  
**Status:** Complete architecture with installation guides

---

## Overview

PrismNote supports 15+ languages through specialized execution backends. Each backend is optimized for its language's runtime model and use cases.

### Execution Model Comparison

| Language | Runtime | Stateful | Startup | Memory |
|----------|---------|----------|---------|--------|
| Python | IPython kernel | Yes | <1s | Moderate |
| R | R kernel (IRkernel) | Yes | <2s | High |
| Julia | IJulia kernel | Yes | <3s | Moderate |
| SQL | Native drivers | No | <0.5s | Low |
| C++ | xeus-cling | Yes | <1s | Low |
| Rust | cargo/rustc | No | <2s | Low |
| Go | go run | No | <1s | Low |
| Scala | Scala REPL | Yes | <3s | High |
| Zig | zig build/run | No | <1s | Low |
| CUDA | NVIDIA Toolkit | No | <2s | GPU |
| Mojo | Mojo compiler | No | <1s | Moderate |
| TypeScript | ts-node/Deno | No | <0.5s | Low |
| JavaScript | Node.js | No | <0.5s | Low |

---

## Scripting Languages (Jupyter Kernels)

### Python 3.8+

**Backend:** IPython kernel (Jupyter)  
**Protocol:** HTTP REST to localhost:8888  
**State:** Persistent across cells in same session

```python
# Cell 1
x = 10

# Cell 2 (can access x)
print(x * 2)  # Output: 20
```

**Installation:**
```bash
# Already included with most Python setups
python -m pip install jupyter ipython

# Start Jupyter
jupyter notebook
# Or: jupyter kernel
```

**Features:**
- Magic commands (%time, %timeit, etc.)
- Interactive visualization (matplotlib)
- DataFrame support (pandas)
- NumPy/SciPy integration
- IPython extensions

**Error Handling:**
- Tracebacks parsed and marked in editor
- Suggestions for common errors
- Variable introspection available

---

### R 4.0+

**Backend:** R kernel (IRkernel)  
**Protocol:** HTTP REST to localhost:8888  
**State:** Persistent variable environment

```r
# Cell 1
df <- data.frame(x = 1:5, y = c("a","b","c","d","e"))

# Cell 2 (can access df)
summary(df)
```

**Installation:**
```bash
# Install R first
brew install r  # macOS
# or from cran.r-project.org

# Install IRkernel
R
> install.packages("IRkernel")
> IRkernel::installspec()
```

**Features:**
- ggplot2 integration
- tidyverse support
- Data frame visualization
- Statistical functions
- Package management (install.packages)

**Popular Packages:**
- tidyverse: data manipulation
- ggplot2: visualization
- shiny: interactive apps
- caret: machine learning

---

### Julia 1.6+

**Backend:** IJulia kernel  
**Protocol:** HTTP REST to localhost:8888  
**State:** Persistent module state

```julia
# Cell 1
using Plots

# Cell 2
x = 1:10
plot(x.^2)
```

**Installation:**
```bash
# Install Julia from julialang.org/downloads

# Add IJulia kernel
julia
> ] add IJulia
> using IJulia
> installkernel("Julia")
```

**Features:**
- Multiple dispatch
- Composable libraries
- GPU acceleration (@cuda)
- Differential equations (DifferentialEquations.jl)
- Plots.jl for visualization

**Scientific Packages:**
- DifferentialEquations.jl
- MLJ.jl (machine learning)
- Flux.jl (neural networks)
- Optimization.jl

---

### Scala 3.0+

**Backend:** Scala REPL via Almond kernel  
**Protocol:** HTTP REST to localhost:8888  
**State:** JVM session persistence

```scala
// Cell 1
val data = (1 to 10).toList

// Cell 2 (can access data)
data.map(_ * 2)
```

**Installation:**
```bash
# Install Coursier first
curl -fL https://github.com/coursier/launchers/raw/master/cs-x86_64-pc-linux.gz | gunzip > cs
chmod +x cs
./cs install scala

# Install Almond kernel
cs install almond --channels=releases
```

**Features:**
- JVM ecosystem access
- Apache Spark integration
- Functional programming
- Pattern matching
- Case classes

**Big Data:**
- Spark: distributed computing
- Kafka: streaming
- Scala Collections framework

---

## Compiled Languages

### C++17/20

**Backend:** xeus-cling interactive C++ compiler  
**Protocol:** HTTP REST to localhost:8888  
**Compilation:** Immediate (just-in-time)

```cpp
// Cell 1
#include <iostream>
int x = 10;

// Cell 2
std::cout << "x = " << x << std::endl;
```

**Installation:**
```bash
conda install -c conda-forge xeus-cling
# or
mamba install -c conda-forge xeus-cling
```

**Features:**
- Interactive compilation
- STL access
- Boost libraries
- C++17/20 features
- Direct system access

**Limitations:**
- Can't use files (in-memory only)
- Some headers may not compile
- Requires modern C++ toolchain

---

### Rust 1.70+

**Backend:** rustc + cargo wrapper  
**Protocol:** HTTP backend API  
**Compilation:** Full compilation cycle

```rust
// Cell 1
fn main() {
    let x = vec![1, 2, 3];
    println!("{:?}", x);
}
```

**Installation:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup update
```

**Features:**
- Ownership system
- Zero-cost abstractions
- Error handling (Result/Option)
- Async/await
- Macro system

**Ecosystem:**
- tokio: async runtime
- serde: serialization
- rayon: data parallelism
- PyO3: Python interop

---

### Go 1.20+

**Backend:** go run command  
**Protocol:** HTTP backend API  
**Execution:** Direct binary execution

```go
// Cell 1
func main() {
    messages := make(chan string, 1)
    messages <- "hello"
    msg := <-messages
    println(msg)
}
```

**Installation:**
```bash
brew install go  # macOS
# or from golang.org/dl

go version
```

**Features:**
- Goroutines (lightweight concurrency)
- Channels (CSP)
- Fast compilation
- Built-in networking
- Cross-platform

**Common Packages:**
- net/http: web services
- encoding/json: JSON handling
- database/sql: databases
- context: cancellation

---

### Zig 0.11+

**Backend:** zig build/run  
**Protocol:** HTTP backend API  
**Execution:** Compiled binary

```zig
const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const stdout = std.io.getStdOut().writer();
    try stdout.print("Hello, Zig!\n", .{});
}
```

**Installation:**
```bash
brew install zig  # macOS
# or from ziglang.org/download
```

**Features:**
- Explicit memory management
- Compile-time execution
- Error handling without exceptions
- C interoperability
- Performance tuning

**Use Cases:**
- Systems programming
- Embedded systems
- Performance-critical code
- C library bindings

---

## GPU & Emerging Languages

### CUDA C++ 12.0

**Backend:** NVIDIA CUDA Toolkit  
**Protocol:** HTTP backend API  
**Execution:** GPU kernel compilation

```cuda
__global__ void add(float *a, float *b, float *c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) c[i] = a[i] + b[i];
}
```

**Installation:**
```bash
# Download from developer.nvidia.com/cuda-downloads
# Requires NVIDIA GPU (any compute capability 3.0+)

nvcc --version
```

**Features:**
- GPU kernel programming
- Grid/block/thread model
- Shared memory optimization
- Memory coalescing
- Warp-level primitives

**Performance:**
- 100-1000x speedup for parallel workloads
- Best for matrix ops, image processing
- Requires GPU memory transfers

**Libraries:**
- cuBLAS: linear algebra
- cuDNN: deep learning
- Thrust: C++ templates for GPU

---

### Mojo

**Backend:** Mojo compiler  
**Protocol:** HTTP backend API  
**Compilation:** JIT compiled

```mojo
def main():
    let x = 10
    print("Mojo:", x)
```

**Installation:**
```bash
curl -s https://get.modular.com | bash
modular install mojo
```

**Features:**
- Python syntax + systems performance
- GPU support (MLIR-based)
- SIMD operations
- Parametric programming
- Emerging ecosystem

**Status:** Early development, API may change

---

## Web Languages

### TypeScript

**Backend:** ts-node or Deno  
**Protocol:** HTTP backend API  
**Execution:** JIT compiled to JavaScript

```typescript
interface User {
  name: string;
  age: number;
}

const user: User = { name: "Alice", age: 30 };
console.log(`${user.name} is ${user.age} years old`);
```

**Installation:**
```bash
# Using ts-node
npm install -g ts-node typescript

# Or using Deno (recommended)
curl -fsSL https://deno.land/install.sh | sh
```

**Features:**
- Static type checking
- ES2020+ syntax
- Async/await
- Module system
- npm package access

**Advantages:**
- Better than JavaScript for complex projects
- Type safety prevents errors
- Great IDE support
- Large ecosystem

---

### JavaScript (Node.js)

**Backend:** Node.js runtime  
**Protocol:** HTTP backend API  
**Execution:** V8 JIT compiled

```javascript
const fs = require('fs');
const data = fs.readFileSync('file.txt', 'utf8');
console.log(data);
```

**Installation:**
```bash
brew install node  # macOS
# or from nodejs.org
# Current recommended: LTS version
```

**Features:**
- Event-driven architecture
- Non-blocking I/O
- npm package manager (millions of packages)
- Server-side JavaScript
- File system access

**Ecosystem:**
- express: web framework
- axios: HTTP client
- lodash: utilities
- jest: testing

---

## Data Query Language

### SQL

**Backend:** Native database drivers  
**Protocol:** HTTP backend API  
**Execution:** Direct query execution

```sql
SELECT user_id, COUNT(*) as events
FROM events
WHERE date > NOW() - INTERVAL 7 DAY
GROUP BY user_id
ORDER BY events DESC;
```

**Installation:**
```bash
# Drivers installed based on database type
# Set connection via environment:
export DB_CONNECTION_STRING="postgresql://..."
export DB_TYPE="postgresql"
```

**Supported Databases:**
- PostgreSQL: open-source RDBMS
- MySQL/MariaDB: web databases
- BigQuery: data warehouse (cloud)
- Snowflake: cloud data platform
- Redshift: AWS data warehouse
- DuckDB: in-process OLAP
- SQLite: embedded database
- T-SQL: SQL Server
- Oracle: enterprise database

**Features by DB:**
- BigQuery: cost estimation, partition pruning
- Snowflake: semi-structured data (JSON), Time Travel
- DuckDB: Parquet/Arrow native support
- SQLite: portable, zero-setup
- PostgreSQL: JSON, full-text search, PostGIS

---

## Backend Architecture

### Request Flow

```
User Code
    ↓
Language Executor Function
    ↓
Protocol Handler (Jupyter, REST, Direct)
    ↓
Backend Runtime/Compiler
    ↓
Output/Error Capture
    ↓
Visualization Processing
    ↓
Display in UI
```

### Kernel-Based Execution (Python, R, Julia, C++, Scala)

```
PrismNote → Jupyter REST API → Kernel Process → Runtime
```

**Advantages:**
- Stateful execution (variables persist)
- REPL-like experience
- Visualization support
- Rich output types

**Requirements:**
- Jupyter server on localhost:8888
- Appropriate kernel installed

### Compiler-Based Execution (Rust, Go, Zig, CUDA, Mojo)

```
PrismNote → Backend API → Compiler/Interpreter → Binary → Execution
```

**Advantages:**
- No long-running server needed
- Type safety at compile time
- Performance optimized

**Requirements:**
- Compiler/interpreter in PATH
- Backend API wrapper

### Direct Execution (TypeScript, JavaScript)

```
PrismNote → Backend API → Node.js/Deno → V8/JavaScript
```

---

## Error Handling

### Compile-Time Errors
- Syntax errors caught immediately
- Type errors reported with line numbers
- Suggestions for common mistakes

### Runtime Errors
- Exceptions/panics captured
- Stack traces displayed
- Variable values at failure shown

### Timeout Errors
- Code takes too long (>30s default)
- Process terminated
- "Execution timeout" message

---

## Performance Characteristics

### First Execution
- Kernel startups: 1-3 seconds
- Compiler startups: 0.5-2 seconds
- Overhead dominates for simple code

### Subsequent Executions
- Much faster (no startup)
- Kernel reuses session
- Good for iterative development

### Memory Usage
- Kernels: 100-500 MB baseline
- Compiled code: varies (10-1000 MB)
- GPU: VRAM depends on data size

---

## Troubleshooting

### "Kernel/Backend unavailable"
1. Check if backend is running
2. Verify port/connection settings
3. Check system PATH for compilers
4. Review installation instructions

### Slow First Execution
- Normal: startup time varies by language
- Subsequent cells faster
- Consider using compiled languages if many cells

### Out of Memory
- Reduce dataset size
- Use streaming for large data
- Check for memory leaks (especially Python)
- Restart kernel (⚙️ menu)

### Import Errors
- Install missing packages (pip, cargo, etc.)
- Check import paths
- Verify package names (case-sensitive)

---

## Future Improvements

1. **Parallel Execution**: Run multiple cells simultaneously
2. **Kernel Pooling**: Reuse kernels across sessions
3. **Memory Profiling**: Track memory usage per cell
4. **Debugger Integration**: Step-through debugging
5. **Package Management UI**: Install packages from UI
6. **Docker Isolation**: Run each language in container
7. **Remote Kernels**: SSH to remote Jupyter servers

---

## Conclusion

PrismNote provides a unified interface to 15+ languages with optimized backends for each. Whether you're doing data science (Python/R), systems programming (Rust/Go), numerical computing (Julia), or GPU work (CUDA), PrismNote offers the right tools with minimal setup.

**Key Features:**
- ✅ Stateful execution (Python, R, Julia, etc.)
- ✅ Zero startup overhead (TypeScript, JavaScript)
- ✅ GPU acceleration (CUDA)
- ✅ Database integration (SQL)
- ✅ Multiple databases supported
- ✅ Type safety options (TypeScript, Rust)
- ✅ Performance-critical code (C++, Go, Zig)

Choose the right language for each task and combine them seamlessly in one notebook!

---

**Document Status**: Complete  
**Last Updated**: 2026-07-28  
**Languages Covered**: 15+  
**Backends**: 13+
