/**
 * MCP (Model Context Protocol) Client
 * Discovers and executes MCP tools for AI-powered code assistance
 *
 * ⚠️ TRANSPORT IMPLEMENTATION STATUS
 *
 * ✅ HTTP Transport: Fully implemented & production-ready
 *    - Works with real MCP servers
 *    - Tested and stable
 *
 * ❌ Stdio Transport: NOT IMPLEMENTED (returns error)
 *    - Currently returns error message
 *    - Full implementation planned for Phase 3
 *    - See: DEVELOPMENT_ROADMAP.md Phase 3.2.1
 *
 * ❌ Socket Transport: NOT IMPLEMENTED (falls back to HTTP with warning)
 *    - Currently falls back to HTTP
 *    - Full implementation planned for Phase 3
 *    - See: DEVELOPMENT_ROADMAP.md Phase 3.2.2
 */

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
}

export interface MCPRequest {
  tool: string
  args: Record<string, any>
}

export interface MCPResponse {
  success: boolean
  result?: any
  error?: string
  executionTime?: number
}

export interface MCPServerConfig {
  type: 'stdio' | 'http' | 'socket'
  command?: string
  url?: string
  port?: number
  timeout?: number
}

class MCPClient {
  private config: MCPServerConfig | null = null
  private tools: Map<string, MCPTool> = new Map()
  private isConnected = false
  private discoveryPromise: Promise<void> | null = null

  /**
   * Initialize MCP client with server config
   */
  async initialize(config: MCPServerConfig): Promise<boolean> {
    this.config = config
    try {
      await this.discover()
      this.isConnected = true
      return true
    } catch (error) {
      console.error('MCP initialization failed:', error)
      this.isConnected = false
      return false
    }
  }

  /**
   * Discover available MCP tools
   */
  async discover(): Promise<MCPTool[]> {
    if (this.discoveryPromise) {
      await this.discoveryPromise
      return Array.from(this.tools.values())
    }

    this.discoveryPromise = this._performDiscovery()
    await this.discoveryPromise
    this.discoveryPromise = null

    return Array.from(this.tools.values())
  }

  /**
   * Perform actual tool discovery
   */
  private async _performDiscovery(): Promise<void> {
    if (!this.config) throw new Error('MCP client not initialized')

    try {
      let response: any

      switch (this.config.type) {
        case 'http':
          response = await fetch(`${this.config.url}/tools`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then((r) => r.json())
          break

        case 'socket':
          response = await this._querySocket('/tools', {})
          break

        case 'stdio':
          response = await this._queryStdio('list_tools', {})
          break
      }

      if (response.tools) {
        response.tools.forEach((tool: MCPTool) => {
          this.tools.set(tool.name, tool)
        })
      }
    } catch (error) {
      console.warn('Tool discovery failed, using defaults:', error)
      this._loadDefaultTools()
    }
  }

  /**
   * Load default tools when server unavailable
   */
  private _loadDefaultTools(): void {
    const defaults: MCPTool[] = [
      {
        name: 'claude-code-generator',
        description: 'Generate code from natural language description',
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string', description: 'Programming language' },
            description: { type: 'string', description: 'What to generate' },
            context: { type: 'object', description: 'Additional context' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            explanation: { type: 'string' },
          },
        },
      },
      {
        name: 'code-formatter',
        description: 'Format code according to language standards',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
          },
        },
        outputSchema: { type: 'object', properties: { formatted: { type: 'string' } } },
      },
      {
        name: 'test-generator',
        description: 'Generate unit tests for code',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
            framework: { type: 'string' },
          },
        },
        outputSchema: { type: 'object', properties: { tests: { type: 'string' } } },
      },
      {
        name: 'performance-analyzer',
        description: 'Analyze code for performance issues',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            issues: { type: 'array' },
            recommendations: { type: 'array' },
          },
        },
      },
      {
        name: 'documentation-generator',
        description: 'Generate documentation for code',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
            style: { type: 'string' },
          },
        },
        outputSchema: { type: 'object', properties: { documentation: { type: 'string' } } },
      },
      {
        name: 'security-scanner',
        description: 'Scan code for security vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' },
          },
        },
        outputSchema: {
          type: 'object',
          properties: {
            vulnerabilities: { type: 'array' },
            severity: { type: 'array' },
          },
        },
      },
    ]

    defaults.forEach((tool) => this.tools.set(tool.name, tool))
  }

  /**
   * Execute MCP tool
   */
  async executeTool(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now()

    if (!this.isConnected) {
      return { success: false, error: 'MCP client not connected' }
    }

    const tool = this.tools.get(request.tool)
    if (!tool) {
      return { success: false, error: `Tool not found: ${request.tool}` }
    }

    try {
      let result: any

      switch (this.config?.type) {
        case 'http':
          result = await fetch(`${this.config.url}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: request.tool, args: request.args }),
          }).then((r) => r.json())
          break

        case 'socket':
          result = await this._querySocket('/execute', { tool: request.tool, ...request.args })
          break

        case 'stdio':
          result = await this._queryStdio('execute_tool', { tool: request.tool, args: request.args })
          break

        default:
          throw new Error('Unknown MCP transport type')
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        executionTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Query MCP server via socket transport
   * ⚠️ INCOMPLETE - socket transport falls back to HTTP
   *
   * Current Status:
   *   - Socket transport not fully implemented
   *   - Falls back to HTTP connection
   *   - This may cause issues with long-lived connections
   *
   * Timeline: Phase 3 (full implementation, 3-4 weeks)
   * Recommendation: Use HTTP transport for reliability
   *
   * What needs to be done:
   *   1. Setup WebSocket or socket.io connection
   *   2. Handle connection pooling & reuse
   *   3. Implement reconnection logic
   *   4. Test under concurrent load
   *
   * See: DEVELOPMENT_ROADMAP.md Phase 3.2.2
   */
  private async _querySocket(path: string, data: any): Promise<any> {
    console.warn(
      '⚠️ Socket transport incomplete, falling back to HTTP. ' +
      'Full socket support coming in Phase 3.'
    )

    // Temporary fallback to HTTP
    // This will be replaced with proper WebSocket implementation in Phase 3
    return fetch(`http://localhost:${this.config?.port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json())
  }

  /**
   * Query MCP server via stdio protocol
   * ❌ NOT IMPLEMENTED - stdio transport is in development
   *
   * Timeline: Phase 3 (3-4 weeks after Phase 2 completion)
   * Workaround: Use HTTP transport instead (http://localhost:3001)
   *
   * What needs to be done:
   *   1. Spawn MCP server process
   *   2. Setup stdin/stdout communication
   *   3. Implement JSON-RPC protocol
   *   4. Handle process lifecycle & errors
   *
   * See: DEVELOPMENT_ROADMAP.md Phase 3.2.1
   */
  private async _queryStdio(method: string, params: any): Promise<any> {
    throw new Error(
      'Stdio transport is not yet implemented.\n' +
      'Please use HTTP transport instead (http://localhost:3001).\n' +
      'Full implementation planned for Phase 3 (estimated 2-4 weeks).\n' +
      'Track progress: https://github.com/Mullassery/prismnote/issues/16'
    )
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Check connection status
   */
  isReady(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    this.isConnected = false
    this.tools.clear()
  }
}

/**
 * Global MCP client instance
 */
let mcpClient: MCPClient | null = null

/**
 * Get or create MCP client
 */
export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient()
  }
  return mcpClient
}

/**
 * Initialize MCP client with config
 */
export async function initializeMCP(config: MCPServerConfig): Promise<boolean> {
  const client = getMCPClient()
  return client.initialize(config)
}

/**
 * Discover MCP tools
 */
export async function discoverMCPTools(): Promise<MCPTool[]> {
  const client = getMCPClient()
  return client.discover()
}

/**
 * Execute MCP tool
 */
export async function executeMCPTool(request: MCPRequest): Promise<MCPResponse> {
  const client = getMCPClient()
  return client.executeTool(request)
}

/**
 * Get available MCP tools
 */
export function getAvailableMCPTools(): MCPTool[] {
  const client = getMCPClient()
  return client.getTools()
}

/**
 * Check if MCP is ready
 */
export function isMCPReady(): boolean {
  const client = getMCPClient()
  return client.isReady()
}

/**
 * Auto-discover and initialize MCP
 */
export async function autoInitializeMCP(): Promise<boolean> {
  // Try HTTP first
  if (await initializeMCP({ type: 'http', url: 'http://localhost:3001' })) {
    return true
  }

  // Try socket
  if (await initializeMCP({ type: 'socket', port: 3002 })) {
    return true
  }

  // Try stdio (spawn local process)
  if (await initializeMCP({ type: 'stdio', command: 'prismnote-mcp' })) {
    return true
  }

  // All failed, but client initialized with defaults
  return false
}
