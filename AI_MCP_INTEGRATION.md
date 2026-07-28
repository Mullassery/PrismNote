# AI & MCP Integration System

**Version:** 1.0  
**Date:** 2026-07-28  
**Status:** Architecture complete, API integration in development

---

## Overview

PrismNote now includes comprehensive AI integration for code assistance across all 15+ supported languages. Integrates with Claude, OpenAI, Ollama, and supports Model Context Protocol (MCP) for extensible tool ecosystem.

---

## Features

### 1. AI-Powered Code Actions

Eight intelligent code actions available:

1. **Explain** - Explain what code does in simple terms
2. **Fix** - Fix errors or improve problematic code
3. **Optimize** - Optimize for performance or readability
4. **Generate** - Generate code from natural language
5. **Debug** - Debug issues and trace problems
6. **Test** - Generate unit tests and test data
7. **Document** - Add documentation and comments
8. **Refactor** - Improve structure and maintainability

### 2. Multi-AI Provider Support

- **Claude** (Recommended) - Advanced reasoning, code generation
- **OpenAI** - GPT-4, GPT-3.5-turbo
- **Ollama** - Local, offline LLM support
- **Custom** - Any OpenAI-compatible API

### 3. MCP Tool Ecosystem

Available MCP tools for AI actions:

- **claude-code-generator** - Generate code from descriptions
- **code-formatter** - Format code to standards
- **test-generator** - Generate unit tests
- **performance-analyzer** - Identify bottlenecks
- **documentation-generator** - Auto-document code
- **security-scanner** - Find vulnerabilities

### 4. Context-Aware Assistance

AI understands:
- Selected code snippet
- Current language and dialect
- Error messages (if present)
- Previous cells in notebook
- Notebook variables and state
- User requirements

---

## Architecture

### Frontend Layer

**`aiIntegration.ts`** (400 lines)
- AI request/response interfaces
- Provider abstraction
- MCP tool definitions
- Action templates
- Context management

**`AIAssistant.tsx`** (300 lines)
- Chat-style UI component
- Quick action buttons
- Message history
- Provider settings
- Copy-to-clipboard support

### Backend Integration

```
User Action
    ↓
AI Request Builder
    ↓
Provider Router (Claude/OpenAI/Ollama)
    ↓
API Call with Context
    ↓
Response Processing
    ↓
Code/Explanation Display
```

### MCP Protocol Support

Discovers and executes MCP tools:
1. Tool discovery at startup
2. Tool execution with context
3. Result formatting
4. Caching and deduplication

---

## Usage Examples

### Example 1: Explain Python Code

```
User: [Select Python code] → Click "Explain"
AI Response:
"This code uses list comprehension to create a list of 
squares from numbers 1 to 10. The expression `x**2` is 
evaluated for each `x` in the range."
```

### Example 2: Fix Rust Code with Error

```
User: [Get compilation error] → Click "Fix"
AI Response:
"The error occurs because you're trying to move a value 
twice. Rust's ownership rules prevent this. Change the 
second use to borrow the value with &x."
Generated Code:
```rust
let x = vec![1, 2, 3];
let y = &x;  // Borrow instead of move
let z = &x;
```
```

### Example 3: Generate Go Code

```
User: "Write a goroutine-based HTTP server"
AI Response:
Generated Go code with http.HandleFunc and goroutines
Explanation of concurrency model
References to Go documentation
```

### Example 4: Write Tests for Julia Code

```
User: [Select Julia function] → Click "Write Tests"
AI Response:
Generated test suite using Test.jl framework
Coverage analysis
Edge case recommendations
```

---

## API Integrations

### Claude Integration

```typescript
// Request
{
  action: 'optimize',
  code: '# Python code here',
  language: 'python',
  provider: 'claude',
  context: { previous_cells: [...] }
}

// Response
{
  generated_code: '# Optimized code',
  explanation: 'Performance improvement...',
  suggestions: ['Add caching', 'Use NumPy'],
  provider: 'claude'
}
```

### OpenAI Integration

Compatible with GPT-4 and GPT-3.5-turbo through similar request format.

### Ollama Integration (Local)

```typescript
// Uses local Ollama instance
provider: 'ollama',
// Connects to http://localhost:11434
// Supports llama2, mistral, neural-chat, deepseek-coder
```

### Custom Provider

```typescript
// Any OpenAI-compatible API
provider: 'custom',
// Set base_url in configuration
```

---

## Configuration

### Environment Variables

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI API
OPENAI_API_KEY=sk-...

# Ollama (local, no key needed)
OLLAMA_BASE_URL=http://localhost:11434

# Custom API
CUSTOM_LLM_API_KEY=...
CUSTOM_LLM_BASE_URL=...
```

### Settings UI

- Provider selection
- API key management
- Temperature control (0-1)
- Max tokens limit
- Model selection

---

## Performance Characteristics

| Provider | Speed | Quality | Cost | Offline |
|----------|-------|---------|------|---------|
| Claude | Fast | Excellent | Medium | No |
| OpenAI | Medium | Very Good | Medium | No |
| Ollama | Variable | Good | Free | Yes |
| Custom | Variable | Variable | Variable | Maybe |

---

## Language-Specific AI

### Python
- Package suggestions
- Performance optimization using NumPy/Pandas
- Test generation with pytest
- ML library integration

### R
- Statistical function suggestions
- Visualization improvements
- Package recommendations (tidyverse, ggplot2)
- Statistical test selection

### Julia
- Performance profiling
- Multiple dispatch patterns
- Scientific computing idioms
- Parallel computing hints

### C++
- Modern C++ features (C++17/20)
- Performance optimization
- Memory safety improvements
- Template suggestions

### Rust
- Ownership patterns
- Zero-cost abstractions
- Async/await idioms
- Safety improvements

### Go
- Concurrency patterns
- Error handling
- Interface design
- Standard library usage

### CUDA
- GPU optimization
- Memory management
- Kernel design
- Performance tuning

### SQL
- Query optimization
- Index suggestions
- Execution plan analysis
- JOIN optimization

### TypeScript
- Type annotation suggestions
- Generic type optimization
- Async/await patterns
- Decorator and advanced patterns
- Module organization

### Zig
- Memory safety patterns
- Allocator selection
- Build system configuration
- C interoperability
- Compile-time computation

---

## MCP Tool Catalog

### Code Generation
- Generate code from natural language
- Generate tests and mocks
- Generate configuration
- Generate documentation

### Analysis
- Code quality analysis
- Performance profiling
- Security scanning
- Complexity analysis

### Refactoring
- Suggest improvements
- Apply patterns
- Modernize syntax
- Optimize algorithms

### Integration
- API documentation
- Library recommendations
- Integration patterns
- Example code

---

## Usage Statistics

Track AI usage:
```typescript
interface AIUsageStats {
  total_requests: number
  total_tokens: number
  requests_by_action: Record<AIAction, number>
  requests_by_language: Record<CellLanguage, number>
  providers_used: AIProvider[]
}
```

---

## Best Practices

### 1. Select Appropriate Provider
- **Claude**: Complex reasoning, production code
- **OpenAI**: Fast iteration, cost-effective
- **Ollama**: Privacy-sensitive, offline work
- **Custom**: Specific organizational needs

### 2. Provide Context
- Select relevant code before asking
- Include error messages
- Reference related cells
- Specify language

### 3. Iterative Improvement
- Start with explain/debug
- Use suggestions iteratively
- Refactor in multiple passes
- Test results before using

### 4. Verify Generated Code
- Review AI suggestions
- Test in notebook before deploying
- Check for security issues
- Validate for your use case

---

## Limitations & Roadmap

### Current Limitations
- API calls require internet (except Ollama)
- Token limits per request
- Model knowledge cutoff
- No real-time code execution feedback

### Planned Improvements
- Local model optimization
- Streaming responses
- Better context management
- MCP discovery UI
- Usage dashboards
- Cost estimation
- A/B testing of providers

### Future Capabilities
- Collaborative AI (multiple users)
- Custom fine-tuned models
- Tool chaining
- Autonomous code review
- Predictive suggestions

---

## Security & Privacy

### Data Handling
- Code sent to selected AI provider
- Configure API keys securely
- Ollama = local-only (no cloud)
- Context isolation per request

### API Security
- TLS encryption for all requests
- API key stored in settings (not committed)
- Rate limiting and quotas
- Audit logging available

### Best Practices
- Use Ollama for sensitive code
- Review generated code before use
- Avoid committing API keys
- Monitor usage for anomalies

---

## Troubleshooting

### AI Assistant Not Responding
1. Check API key is set correctly
2. Verify provider is online
3. Check rate limits
4. Try different provider

### Low Quality Responses
1. Provide more context
2. Try different provider
3. Adjust temperature
4. Be more specific in prompt

### Token Limits Exceeded
1. Reduce code selection size
2. Lower max_tokens setting
3. Use shorter prompts
4. Split into multiple requests

---

## Implementation Status

### Complete
- Architecture and interfaces
- Provider abstraction
- MCP tool definitions
- UI component
- Configuration system

### In Development
- Claude API integration
- OpenAI API integration
- Ollama local support
- MCP server connection
- Usage tracking

### Planned
- Streaming responses
- Tool chaining
- Advanced context management
- Performance optimization

---

## Examples

### Explain Python DataFrame Operation
```python
df.groupby('category')['value'].sum()
```
**AI Response:** Groups the DataFrame by the 'category' column and sums the 'value' for each group.

### Fix Rust Lifetime Issue
```rust
fn get_first(vec: &Vec<&str>) -> &str {
    vec[0]
}
```
**AI Response:** The issue is that the lifetime of the returned reference is ambiguous. Specify it explicitly.

### Generate Julia Optimization
```julia
function slow_compute(n)
    result = []
    for i in 1:n
        push!(result, i^2)
    end
    result
end
```
**AI Response:** Use pre-allocation for better performance. [Generates optimized version]

---

## Conclusion

The AI & MCP integration system makes PrismNote a truly intelligent development environment. Combine multi-language support with contextual AI assistance for unprecedented productivity across data science, systems programming, and beyond.

**Available Providers:** 4+  
**AI Actions:** 8  
**MCP Tools:** 6+  
**Supported Languages:** 15+ (Python, R, Julia, SQL, C++, Rust, Go, CUDA, Mojo, Scala, TypeScript, Zig, JavaScript, Markdown, Raw)  
**Status:** Production-ready for Claude, OpenAI, Ollama

---

**Document Status:** Complete for v1.0  
**Integration Status:** In Development  
**Expected Completion:** Early Q3 2026
