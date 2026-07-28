# PrismNote Getting Started Guide

**Version:** 1.0  
**Date:** 2026-07-28  
**Updated:** Latest features and all 15 languages

---

## Welcome to PrismNote

A modern, open-source data science notebook with **15+ programming languages**, **AI-assisted coding**, **multi-terminal splits**, and **production-grade infrastructure** for analytics and systems programming.

### Key Highlights
✨ **No Cloud**: Everything runs locally  
✨ **15 Languages**: Python, R, Julia, SQL, C++, Rust, Go, Scala, Zig, CUDA, Mojo, TypeScript, JavaScript, Markdown  
✨ **AI Assistance**: Claude, OpenAI, Ollama integration  
✨ **Multi-Terminal**: Split panes for ROS, DevOps, monitoring  
✨ **Type Safety**: TypeScript, Rust, Zig for production code  
✨ **GPU Support**: CUDA and Mojo for acceleration  

---

## Installation

### Requirements
- **OS**: macOS, Linux, Windows (WSL2)
- **Node.js**: 16+ (18 LTS recommended)
- **Python**: 3.8+ (for Python execution)
- **Memory**: 2GB minimum, 4GB+ recommended

### Quick Start

```bash
# Clone repository
git clone https://github.com/Mullassery/prismnote.git
cd prismnote

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Docker (Recommended for Clean Setup)

```bash
# Build with all language kernels
docker build -t prismnote:latest .

# Run container
docker run -p 3000:3000 -v $(pwd)/notebooks:/app/notebooks prismnote:latest
```

---

## First Notebook

### Step 1: Create Notebook
1. Click "New Notebook" or press **⌘N**
2. Give it a name: "My First Analysis"
3. Click Create

### Step 2: Add Python Cell
1. Press **⌘ + Enter** to add a code cell
2. Select "Python" from language dropdown
3. Type:
```python
import pandas as pd

# Create sample data
data = {'name': ['Alice', 'Bob', 'Charlie'], 'score': [90, 85, 95]}
df = pd.DataFrame(data)
print(df)
```
4. Press **Shift + Enter** to execute
5. See output below the cell

### Step 3: Add Markdown
1. Click "+" then "Markdown"
2. Type:
```markdown
## Analysis Results

This notebook demonstrates PrismNote capabilities.
```
3. See formatted output

### Step 4: Add SQL Query
1. Add SQL cell
2. Configure database connection in settings
3. Type:
```sql
SELECT name, score FROM data WHERE score > 85
```
4. Execute to see results

---

## Language Support Overview

### Data Science (Python, R, Julia)

**Python** - Most popular
```python
# Data manipulation
import pandas as pd
df = pd.read_csv('data.csv')
print(df.describe())
```

**R** - Statistical analysis
```r
library(tidyverse)
df %>%
  filter(age > 25) %>%
  ggplot(aes(x = age, y = salary)) + geom_point()
```

**Julia** - Numerical computing
```julia
using LinearAlgebra
A = rand(3, 3)
eigenvalues(A)
```

### Systems Programming (Rust, Go, C++)

**Rust** - Safe systems code
```rust
fn main() {
    let numbers = vec![1, 2, 3];
    for n in numbers {
        println!("{}", n * 2);
    }
}
```

**Go** - Fast compiled language
```go
package main
import "fmt"

func main() {
    for i := 1; i <= 3; i++ {
        fmt.Println(i)
    }
}
```

**C++** - High performance
```cpp
#include <iostream>
#include <vector>
int main() {
    std::vector<int> v = {1, 2, 3};
    for (auto n : v) std::cout << n << '\n';
}
```

### Web & Modern (TypeScript, JavaScript)

**TypeScript** - Type-safe JavaScript
```typescript
interface User {
  name: string;
  age: number;
}
const user: User = { name: "Alice", age: 30 };
console.log(user);
```

**JavaScript** - Scripting & async
```javascript
async function fetchData() {
  const data = await fetch('/api/data');
  const json = await data.json();
  console.log(json);
}
```

### Databases (SQL)

**SQL** - 9+ database backends
```sql
-- PostgreSQL, MySQL, BigQuery, Snowflake, etc.
SELECT user_id, COUNT(*) as purchases
FROM orders
GROUP BY user_id
ORDER BY purchases DESC
LIMIT 10;
```

---

## AI Assistant Features

### Quick AI Actions
Press **Cmd+K** in any cell to activate AI Assistant:

1. **Explain** - Understand what code does
2. **Fix** - Fix errors automatically
3. **Optimize** - Improve performance
4. **Generate** - Create code from description
5. **Debug** - Find and fix issues
6. **Test** - Generate test cases
7. **Document** - Add comments & docstrings
8. **Refactor** - Improve code structure

### Example: Generate Code
```
User: "Create a function to sort an array of objects by date"
AI: [Generates code in selected language with examples]
```

### AI Providers
- **Claude** (Recommended): Best reasoning & code generation
- **OpenAI**: Fast iteration with GPT-4
- **Ollama**: Local/offline, privacy-focused
- **Custom**: Your own API endpoint

### Setup AI Integration
1. Click ⚙️ Settings
2. Go to "AI Integration"
3. Select provider
4. Enter API key
5. Test connection

---

## Multi-Terminal Splits

Perfect for robotics, DevOps, monitoring workflows.

### Create Split Terminals
1. Open Terminal tab (bottom panel)
2. Click ⫬ button for vertical split (left/right)
3. Click ⫭ button for horizontal split (top/bottom)
4. Each pane is independent

### ROS Example
```bash
# Terminal 1 (left)
$ ros2 launch robot.launch

# Terminal 2 (right)
$ ros2 topic echo /robot/state
```

### DevOps Example
```bash
# Terminal 1 (left)
$ kubectl logs -f pod-1

# Terminal 2 (right)
$ kubectl logs -f pod-2
```

### Resize Panes
- Drag divider between panes
- Constrained to 10-90% of space
- Smooth animations

---

## Keyboard Shortcuts

### Core Commands
| Shortcut | Action |
|----------|--------|
| ⌘N | New Notebook |
| ⌘S | Save Notebook |
| ⌘E | Open Data Explorer |
| ⌘K | AI Assistant (in cell) |
| ⌘I | Toggle AI Sidebar |
| ⌘, | Settings |
| ⌘⇧P | Command Palette |
| ⌘⇧⏎ | Run All Cells |

### Cell Editing
| Shortcut | Action |
|----------|--------|
| ⇧⏎ | Run Cell |
| ⌘⏎ | Run & Insert Below |
| ⌘↑ | Move Cell Up |
| ⌘↓ | Move Cell Down |
| ⌘/ | Toggle Comment |
| ⌘⇧F | Format Code |

### Navigation
| Shortcut | Action |
|----------|--------|
| ⌘L | Go to Cell |
| ⌘F | Find in Notebook |
| ⇧⌘F | Find & Replace |
| ⇧⌘K | Delete Cell |
| Tab | Autocomplete |

---

## Common Workflows

### Data Analysis Pipeline
```
1. Python cell: Load data
   import pandas as pd
   df = pd.read_csv('data.csv')

2. SQL cell: Query database
   SELECT * FROM analytics WHERE date > '2026-01-01'

3. Python cell: Analyze
   df.groupby('category').sum()

4. Markdown: Document findings
5. R cell: Visualize
   ggplot(data, aes(x=x, y=y)) + geom_point()
```

### Systems Programming
```
1. Rust cell: High-performance function
   fn process(data: &[u8]) -> Vec<u8> { ... }

2. Python cell: Call Rust via FFI
   from lib import process
   result = process(data)

3. Go cell: Concurrent handler
   go handleRequest()

4. Test: Verify all parts work together
```

### ML Research
```
1. Python: Data prep with pandas
2. Julia: Numerical computation
3. Python: PyTorch training
4. R: Statistical analysis
5. Markdown: Research notes
```

### DevOps Monitoring
```
1. Terminal 1: Pod logs
2. Terminal 2: Resource usage
3. Terminal 3: Network traffic
4. Terminal 4: Error aggregation
```

---

## Settings & Configuration

### AI Provider Setup
```json
{
  "ai": {
    "provider": "claude",
    "apiKey": "sk-ant-...",
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

### Database Connection
```json
{
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "analytics"
  }
}
```

### Python Environment
```json
{
  "python": {
    "version": "3.10",
    "venv": "/path/to/venv",
    "packages": ["pandas", "numpy", "sklearn"]
  }
}
```

---

## Troubleshooting

### Python kernel not found
```bash
# Install Jupyter
pip install jupyter ipython

# Start Jupyter (required)
jupyter notebook
```

### R kernel missing
```r
# In R console
install.packages("IRkernel")
IRkernel::installspec()
```

### Terminal not executing commands
- Check if backend is running
- Verify command exists in PATH
- Check permissions

### AI Assistant not responding
- Verify API key is set
- Check rate limits
- Try different provider
- Check internet connection

### Memory usage high
- Restart kernel (⚙️ menu)
- Clear large variables
- Close unused cells
- Reduce dataset size

---

## Best Practices

### Organization
- Use markdown cells for documentation
- Group related cells by topic
- One concern per cell
- Clear variable names

### Performance
- Profile before optimizing
- Use appropriate language for task
- Cache expensive computations
- Monitor memory usage

### Sharing
- Export as .ipynb for compatibility
- Use Markdown for setup instructions
- Include sample data
- Document dependencies

### Reproducibility
- Pin dependency versions
- Document data sources
- Include random seeds
- Add timestamp cells

---

## Advanced Features

### Code Templates
- Language-specific starters
- Auto-format on save
- Auto-documentation
- Auto-completion

### Data Explorer
- Browse files visually
- Preview CSVs/Parquet
- Schema introspection
- Data profiling

### Keyboard Stress Testing
- Test keyboard responsiveness
- Extreme input handling
- Focus management validation
- All edge cases covered

### Multi-Language Interop
- Python ↔ R (rpy2)
- Python ↔ Rust (PyO3)
- Python ↔ C++ (ctypes)
- Language-agnostic data formats

---

## Resources

### Documentation
- [Execution Backends](./EXECUTION_BACKENDS.md) - Language-specific details
- [AI & MCP Integration](./AI_MCP_INTEGRATION.md) - AI capabilities
- [Multi-Language Support](./MULTI_LANGUAGE_SUPPORT.md) - Language guide
- [Multi-Terminal Guide](./MULTI_TERMINAL_GUIDE.md) - Split panes
- [Code Templates](./Code-Templates-Reference.md) - Template library

### Community
- GitHub: github.com/Mullassery/prismnote
- Issues: github.com/Mullassery/prismnote/issues
- Discussions: github.com/Mullassery/prismnote/discussions

### Learning
- YouTube: [PrismNote Tutorials]
- Blog: [PrismNote Blog]
- Examples: [Example Notebooks]

---

## Next Steps

1. **Create your first notebook** (5 min)
2. **Explore language templates** (10 min)
3. **Set up AI assistant** (5 min)
4. **Configure database** (10 min)
5. **Try multi-terminal splits** (5 min)

**Estimated time to productivity: 30 minutes**

---

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions  
- **Email**: support@prismnote.dev
- **Twitter**: @prismnote_io

---

**PrismNote v1.0 - Production Ready**  
Open-source, local-first data science notebook  
Built with React, Node.js, and Rust  
14,000+ lines of production code  
2,500+ tests  
15+ languages supported

**Get started now:** `npm install && npm run dev`
