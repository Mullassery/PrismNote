# PrismNote Settings Reference

Structured settings guide for AI agents and automation.

## Storage Location

```
~/.prismnote/
├── ai_config.json      # AI provider configuration
├── notebooks/          # User notebooks
└── settings/           # User preferences
```

## AI Provider Settings

### Configuration File

**Path:** `~/.prismnote/ai_config.json`

**Format:**
```json
{
  "provider": "claude|ollama|openai",
  "ollama_url": "http://localhost:11434",
  "ollama_model": "qwen2.5-coder",
  "claude_model": "claude-sonnet-4-6",
  "claude_key_set": true,
  "openai_model": "gpt-4o",
  "openai_key_set": false,
  "tavily_key_set": true
}
```

---

## Provider Options

### Ollama (Local)

| Setting | Value | Type | Description |
|---------|-------|------|-------------|
| provider | `ollama` | enum | Select Ollama backend |
| ollama_url | `http://localhost:11434` | string | Ollama server URL |
| ollama_model | `qwen2.5-coder` | string | Model name (auto-detect if blank) |

**Models:**
- qwen2.5-coder (coding)
- llama2 (general)
- mistral (fast)
- neural-chat (conversational)
- dolphin-mixtral (advanced)

**Start Ollama:**
```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

---

### Claude (Anthropic)

| Setting | Value | Type | Description |
|---------|-------|------|-------------|
| provider | `claude` | enum | Select Claude backend |
| claude_model | `claude-sonnet-4-6` | string | Model selection |
| claude_api_key | `sk-ant-...` | secret | API key from Anthropic |
| claude_key_set | true/false | boolean | Whether key is saved |

**Available Models:**
- `claude-opus-4-8` (most capable)
- `claude-sonnet-4-6` (recommended)
- `claude-haiku-4-5-20251001` (fast)
- `claude-fable-5` (lightweight)

**Get API Key:** https://console.anthropic.com

---

### OpenAI

| Setting | Value | Type | Description |
|---------|-------|------|-------------|
| provider | `openai` | enum | Select OpenAI backend |
| openai_model | `gpt-4o` | string | Model selection |
| openai_api_key | `sk-...` | secret | API key from OpenAI |
| openai_key_set | true/false | boolean | Whether key is saved |

**Available Models:**
- `gpt-4o` (latest)
- `gpt-4o-mini` (fast)
- `gpt-4-turbo` (previous)
- `gpt-4` (older)

**Get API Key:** https://platform.openai.com/api-keys

---

### Tavily (Web Search - Optional)

| Setting | Value | Type | Description |
|---------|-------|------|-------------|
| tavily_api_key | `tvly-...` | secret | API key from Tavily |
| tavily_key_set | true/false | boolean | Whether key is saved |

**When Used:**
- Optional (not required for AI Agent)
- Only when web search toggle is enabled
- Calls Tavily API to fetch real-time data

**Get API Key:** https://tavily.com/sign-in

---

## Execution Settings

### Stored In

**Browser localStorage:**
```
localStorage.getItem('pn-query-timeout')     // Integer: seconds
localStorage.getItem('pn-output-trunc')      // Integer: characters
localStorage.getItem('pn-default-lang')      // String: language
localStorage.getItem('pn-autosave')          // Boolean: true/false
```

### Options

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Default cell language | select | python, sql, javascript | python | Language for new cells |
| Query timeout | slider | 5–300 seconds | 30 | Max execution time |
| Output truncation | slider | 1KB–100KB | 10KB | Max output per cell |
| Auto-save | toggle | true/false | true | Save notebook automatically |

---

## Search Settings

### Stored In

**Browser localStorage:**
```
localStorage.getItem('pn-search-results')    // Integer: 1-10
localStorage.getItem('pn-search-depth')      // String: basic|advanced
```

### Options

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Search results | slider | 1–10 | 5 | Results per Tavily query |
| Search depth | select | basic, advanced | basic | Search thoroughness |

**Search Depth:**
- `basic`: Faster, fewer results
- `advanced`: Thorough, more results

---

## Appearance Settings

### Theme

**Stored In:** `localStorage.getItem('pn-theme')`

**Options:**
- `dark` - Dark theme (recommended)
- `light` - Light theme

---

### Font Size

**Stored In:** `localStorage.getItem('pn-code-size')`

**Range:** 10–28 pixels
**Default:** 14px

**CSS Variable:** `--pn-code-size`

---

## Layout Settings

### Panels

**Stored In:** Browser UI state (not persistent)

**Available Panels:**
- Files (left sidebar)
- Terminal (bottom)
- Notebook (center)
- Data Explorer (bottom)
- Plots (right)
- AI Agent (right)

**Toggle:** ⌘, Settings → Layout section

---

## Web Search Toggle

### Stored In

**Browser localStorage:**
```
localStorage.getItem('pn-ai-web-search')     // String: "true"|"false"
```

**Default:** `true` (if Tavily key is set)

**Behavior:**
- Only appears if Tavily key is configured
- When enabled: AI queries may use web search
- When disabled: AI works offline (if using Ollama)

---

## Editor Preferences

### Keyboard Bindings

| Shortcut | Action | Configurable |
|----------|--------|--------------|
| ⌘K | Quick actions | No |
| ⌘, | Settings | No |
| ⌘E | Data Explorer | No |
| ⌘S | Save | No |
| ⌘⇧P | Command palette | No |
| Shift+Enter | New line | No |
| Enter | Run cell | No |

Current bindings are fixed (customization in v1.8+).

---

## Programmatic Access

### Read Settings
```javascript
// Get from localStorage
const fontSize = localStorage.getItem('pn-code-size')
const webSearch = localStorage.getItem('pn-ai-web-search')

// Get from API
fetch('http://localhost:8000/api/ai/config')
  .then(r => r.json())
  .then(config => console.log(config))
```

### Set Settings
```javascript
// Via API
fetch('http://localhost:8000/api/ai/config', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'claude',
    claude_api_key: 'sk-ant-...'
  })
})

// Via localStorage
localStorage.setItem('pn-query-timeout', '60')
```

---

## Default Values

```json
{
  "provider": "ollama",
  "ollama_url": "http://localhost:11434",
  "ollama_model": null,
  "claude_model": "claude-sonnet-4-6",
  "openai_model": "gpt-4o",
  "theme": "dark",
  "fontSize": 14,
  "defaultLanguage": "python",
  "queryTimeout": 30,
  "outputTruncation": 10000,
  "autoSave": true,
  "searchResults": 5,
  "searchDepth": "basic",
  "webSearchEnabled": true,
  "panels": {
    "files": true,
    "terminal": true,
    "notebook": true
  }
}
```

---

## Validation Rules

| Setting | Rule | Error Message |
|---------|------|---------------|
| ollama_url | Must be valid URL | "Invalid URL format" |
| query_timeout | 5–300 | "Timeout must be 5–300 seconds" |
| output_trunc | 1000–100000 | "Truncation must be 1KB–100KB" |
| search_results | 1–10 | "Results must be 1–10" |
| language | python, sql, javascript | "Invalid language" |

---

## Environment Variables

**For Automated Setup:**

```bash
export PRISMNOTE_AI_PROVIDER=claude
export PRISMNOTE_CLAUDE_KEY=sk-ant-...
export PRISMNOTE_TAVILY_KEY=tvly-...
export PRISMNOTE_QUERY_TIMEOUT=60
```

Not yet implemented (v1.7+). Currently via `ai_config.json`.

---

## Security & Privacy

**What's stored locally:**
- AI provider settings (file: `~/.prismnote/ai_config.json`)
- API keys (encrypted in config, plaintext in memory)
- Execution preferences (browser localStorage)
- Notebook files (.ipynb)

**What's NOT stored:**
- Query results (unless exported by user)
- Conversation history (session-only, unless explicitly saved)
- User data (except explicitly created notebooks)

**Recommendations:**
- Don't share `ai_config.json` (contains API keys)
- Use environment variables for automation
- Rotate API keys regularly
- Disable web search if using sensitive data

---

## Migration & Backup

### Backup Settings
```bash
cp ~/.prismnote/ai_config.json ~/.prismnote/ai_config.backup.json
```

### Restore Settings
```bash
cp ~/.prismnote/ai_config.backup.json ~/.prismnote/ai_config.json
```

### Export Settings
```bash
cat ~/.prismnote/ai_config.json | jq '.' > settings.json
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Settings not persisting | Check `~/.prismnote/` exists and is writable |
| API key rejected | Verify key format and expiration |
| Ollama not detected | Check URL and OLLAMA_ORIGINS env var |
| Web search not working | Ensure Tavily key is valid and web search toggle is ON |
| Query timeout too short | Increase in Settings → Execution |

---

Last updated: July 20, 2026
