/**
 * AI Integration & MCP Support System
 *
 * Integrates Claude, other LLMs, and MCP tools for code generation,
 * explanation, optimization, and debugging assistance.
 *
 * Architecture:
 * - Provider abstraction (Claude, OpenAI, Ollama, etc.)
 * - MCP tool discovery and execution
 * - Context management (notebook state, selected code)
 * - Caching and rate limiting
 */

import { CellLanguage } from './languages'

export type AIProvider = 'claude' | 'openai' | 'ollama' | 'custom'
export type AIAction =
  | 'explain'
  | 'fix'
  | 'optimize'
  | 'generate'
  | 'debug'
  | 'test'
  | 'document'
  | 'refactor'

export interface AIRequest {
  action: AIAction
  code: string
  language: CellLanguage
  context?: {
    notebook_state?: Record<string, any>
    previous_cells?: string[]
    error?: string
    requirements?: string[]
  }
  provider?: AIProvider
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  generated_code?: string
  explanation?: string
  suggestions?: string[]
  alternatives?: string[]
  execution_plan?: string
  potential_issues?: string[]
  references?: {
    url: string
    title: string
  }[]
  provider: AIProvider
  tokens_used?: number
}

export interface MCPTool {
  name: string
  description: string
  input_schema: Record<string, any>
  output_schema: Record<string, any>
  provider: string
}

export interface MCPRequest {
  tool_name: string
  arguments: Record<string, any>
  context?: Record<string, any>
}

export interface MCPResponse {
  result: any
  metadata?: {
    execution_time?: number
    tokens_used?: number
    cached?: boolean
  }
}

/**
 * AI Provider Configuration
 */
export const AI_PROVIDERS: Record<AIProvider, {
  name: string
  api_key_env: string
  base_url?: string
  models: string[]
  default_model: string
}> = {
  claude: {
    name: 'Anthropic Claude',
    api_key_env: 'ANTHROPIC_API_KEY',
    base_url: 'https://api.anthropic.com',
    models: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'],
    default_model: 'claude-opus-4-8',
  },
  openai: {
    name: 'OpenAI GPT',
    api_key_env: 'OPENAI_API_KEY',
    base_url: 'https://api.openai.com',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    default_model: 'gpt-4-turbo',
  },
  ollama: {
    name: 'Ollama (Local)',
    api_key_env: 'OLLAMA_API_KEY',
    base_url: 'http://localhost:11434',
    models: ['llama2', 'mistral', 'neural-chat', 'deepseek-coder'],
    default_model: 'neural-chat',
  },
  custom: {
    name: 'Custom LLM',
    api_key_env: 'CUSTOM_LLM_API_KEY',
    base_url: undefined,
    models: [],
    default_model: '',
  },
}

/**
 * AI Actions with prompts per language
 */
export const AI_ACTIONS: Record<AIAction, {
  name: string
  description: string
  prompt_template: string
}> = {
  explain: {
    name: 'Explain Code',
    description: 'Explain what this code does',
    prompt_template: 'Explain this {language} code in simple terms:\n\n```{language}\n{code}\n```',
  },
  fix: {
    name: 'Fix Error',
    description: 'Fix the error in this code',
    prompt_template: 'Fix this {language} code that has an error:\n\n```{language}\n{code}\n```\n\nError: {error}',
  },
  optimize: {
    name: 'Optimize',
    description: 'Optimize this code for performance',
    prompt_template: 'Optimize this {language} code for performance:\n\n```{language}\n{code}\n```',
  },
  generate: {
    name: 'Generate Code',
    description: 'Generate code for a task',
    prompt_template: 'Generate {language} code for: {requirements}',
  },
  debug: {
    name: 'Debug',
    description: 'Debug this code',
    prompt_template: 'Help debug this {language} code:\n\n```{language}\n{code}\n```',
  },
  test: {
    name: 'Write Tests',
    description: 'Write tests for this code',
    prompt_template: 'Write {language} tests for this code:\n\n```{language}\n{code}\n```',
  },
  document: {
    name: 'Document',
    description: 'Add documentation to this code',
    prompt_template: 'Add documentation and comments to this {language} code:\n\n```{language}\n{code}\n```',
  },
  refactor: {
    name: 'Refactor',
    description: 'Refactor this code',
    prompt_template: 'Refactor this {language} code for better readability and maintainability:\n\n```{language}\n{code}\n```',
  },
}

/**
 * MCP Tool Categories
 */
export const MCP_TOOL_CATEGORIES = {
  code_generation: 'Generate code from descriptions',
  code_analysis: 'Analyze code structure and quality',
  testing: 'Generate tests and test data',
  documentation: 'Generate and improve documentation',
  optimization: 'Optimize code performance',
  debugging: 'Debug and troubleshoot code',
  refactoring: 'Refactor and improve code',
  integration: 'Integrate with external services',
}

/**
 * Available MCP Tools (discovered at runtime)
 */
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'claude-code-generator',
    description: 'Generate code using Claude based on natural language description',
    input_schema: {
      language: 'string',
      description: 'string',
      context: 'object',
    },
    output_schema: {
      code: 'string',
      explanation: 'string',
    },
    provider: 'claude',
  },
  {
    name: 'code-formatter',
    description: 'Format code according to language standards',
    input_schema: {
      code: 'string',
      language: 'string',
    },
    output_schema: {
      formatted_code: 'string',
    },
    provider: 'general',
  },
  {
    name: 'test-generator',
    description: 'Generate unit tests for code',
    input_schema: {
      code: 'string',
      language: 'string',
      test_framework: 'string',
    },
    output_schema: {
      tests: 'string',
      coverage_estimate: 'number',
    },
    provider: 'claude',
  },
  {
    name: 'performance-analyzer',
    description: 'Analyze code for performance issues',
    input_schema: {
      code: 'string',
      language: 'string',
    },
    output_schema: {
      issues: 'array',
      recommendations: 'array',
    },
    provider: 'claude',
  },
  {
    name: 'documentation-generator',
    description: 'Generate documentation for code',
    input_schema: {
      code: 'string',
      language: 'string',
      style: 'string',
    },
    output_schema: {
      documentation: 'string',
    },
    provider: 'claude',
  },
  {
    name: 'security-scanner',
    description: 'Scan code for security vulnerabilities',
    input_schema: {
      code: 'string',
      language: 'string',
    },
    output_schema: {
      vulnerabilities: 'array',
      severity_levels: 'array',
    },
    provider: 'claude',
  },
]

/**
 * Process AI request with context
 */
export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
  const provider = request.provider || 'claude'
  const action = AI_ACTIONS[request.action]

  // Build prompt with context
  const prompt = buildPrompt(action.prompt_template, request)

  // Route to appropriate provider
  switch (provider) {
    case 'claude':
      return callClaudeAPI(prompt, request)
    case 'openai':
      return callOpenAIAPI(prompt, request)
    case 'ollama':
      return callOllamaAPI(prompt, request)
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

/**
 * Execute MCP tool
 */
export async function executeMCPTool(request: MCPRequest): Promise<MCPResponse> {
  const tool = MCP_TOOLS.find(t => t.name === request.tool_name)

  if (!tool) {
    throw new Error(`MCP tool not found: ${request.tool_name}`)
  }

  // This would connect to actual MCP server
  // For now, return placeholder
  return {
    result: null,
    metadata: {
      execution_time: 0,
    },
  }
}

/**
 * Build prompt from template
 */
function buildPrompt(template: string, request: AIRequest): string {
  let prompt = template
    .replace(/{language}/g, request.language)
    .replace(/{code}/g, request.code)

  if (request.context?.error) {
    prompt = prompt.replace(/{error}/g, request.context.error)
  }

  if (request.context?.requirements) {
    prompt = prompt.replace(/{requirements}/g, request.context.requirements.join(', '))
  }

  // Add context from notebook
  if (request.context?.previous_cells?.length) {
    prompt += '\n\nPrevious cells in notebook:\n' + request.context.previous_cells.join('\n---\n')
  }

  return prompt
}

/**
 * Call Claude API
 */
async function callClaudeAPI(prompt: string, request: AIRequest): Promise<AIResponse> {
  // This would make actual API call to Claude
  // For now, return placeholder
  return {
    generated_code: '',
    explanation: 'AI assistance pending',
    provider: 'claude',
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(prompt: string, request: AIRequest): Promise<AIResponse> {
  // This would make actual API call to OpenAI
  return {
    generated_code: '',
    explanation: 'AI assistance pending',
    provider: 'openai',
  }
}

/**
 * Call Ollama API (local)
 */
async function callOllamaAPI(prompt: string, request: AIRequest): Promise<AIResponse> {
  // This would make actual API call to local Ollama
  return {
    generated_code: '',
    explanation: 'AI assistance pending',
    provider: 'ollama',
  }
}

/**
 * Discover available MCP tools
 */
export async function discoverMCPTools(): Promise<MCPTool[]> {
  // This would connect to MCP server and discover tools
  return MCP_TOOLS
}

/**
 * Get suggested actions for current code
 */
export function getSuggestedActions(language: CellLanguage, hasError: boolean): AIAction[] {
  const base: AIAction[] = ['explain', 'optimize', 'document', 'refactor']

  if (hasError) {
    return ['fix', 'debug', ...base]
  }

  return base
}

/**
 * Check AI provider health
 */
export async function checkProviderHealth(provider: AIProvider): Promise<boolean> {
  try {
    // Would make test request to provider
    return true
  } catch {
    return false
  }
}

/**
 * Get AI usage stats
 */
export interface AIUsageStats {
  total_requests: number
  total_tokens: number
  requests_by_action: Record<AIAction, number>
  requests_by_language: Record<CellLanguage, number>
  providers_used: AIProvider[]
}

export async function getAIUsageStats(): Promise<AIUsageStats> {
  // Would fetch from local storage or backend
  return {
    total_requests: 0,
    total_tokens: 0,
    requests_by_action: {} as any,
    requests_by_language: {} as any,
    providers_used: [],
  }
}
