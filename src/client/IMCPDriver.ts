/**
 * Unified MCP Driver Interface
 * Provides a common interface for MCP clients (single-server and multi-server)
 * 
 * This interface unifies:
 * - BaseMCPClient (single server, HTTP streamable)
 * - MCPClientPool (multi-server with health checks)
 * - Legacy MCPClientDriver from StateMachine
 * 
 * @module @alephscript/mcp-core-sdk/client/IMCPDriver
 */

/**
 * Configuration for an MCP server transport connection
 */
export interface MCPServerTransportConfig {
  /** Unique identifier for this server */
  id: string;
  /** Human-readable name for this server */
  name: string;
  /** Base URL for the MCP server (HTTP endpoint) */
  url: string;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Additional headers to send with requests */
  headers?: Record<string, string>;
  /** Optional API key for authentication */
  apiKey?: string;
}

/**
 * Unified interface for MCP drivers
 * 
 * Implemented by:
 * - BaseMCPClient (single server)
 * - MCPClientPool (multi-server)
 */
export interface IMCPDriver {
  // ===== Server Management =====
  
  /**
   * Add a new MCP server configuration
   * For single-server clients, this may replace the current server
   */
  addServer(config: MCPServerTransportConfig): void | Promise<void>;
  
  /**
   * Remove a server configuration by ID
   * @returns true if server was found and removed
   */
  removeServer(serverId: string): boolean | Promise<boolean>;
  
  /**
   * Get all configured servers
   */
  getServers(): MCPServerTransportConfig[];
  
  /**
   * Get a specific server configuration by ID
   */
  getServer(serverId: string): MCPServerTransportConfig | undefined;

  // ===== Core MCP Operations =====
  
  /**
   * Execute a tool on the specified MCP server
   * @param serverId Server to execute on (ignored for single-server clients)
   * @param toolName Name of the tool to execute
   * @param params Parameters to pass to the tool
   */
  executeTool(serverId: string, toolName: string, params: Record<string, unknown>): Promise<unknown>;
  
  /**
   * Get a resource from the specified MCP server
   * @param serverId Server to query (ignored for single-server clients)
   * @param resourceId URI of the resource
   * @param params Optional parameters
   */
  getResource(serverId: string, resourceId: string, params?: Record<string, unknown>): Promise<unknown>;

  // ===== State Management (optional) =====
  
  /**
   * Load a state graph from the server
   */
  loadStateGraph?(serverId: string, graphId: string): Promise<unknown>;
  
  /**
   * Save state to the server
   */
  saveState?(serverId: string, state: unknown): Promise<void>;
  
  /**
   * Load state for a specific user/graph
   */
  loadState?(serverId: string, graphId: string, userId: string): Promise<unknown>;
  
  /**
   * Get a prompt template from the server
   */
  getPrompt?(serverId: string, promptId: string, variables?: Record<string, unknown>): Promise<string>;

  // ===== Health Monitoring =====
  
  /**
   * Check health of a specific server
   */
  healthCheck(serverId: string): Promise<boolean>;
  
  /**
   * Check health of all configured servers
   */
  healthCheckAll?(): Promise<Map<string, boolean>>;
  
  /**
   * Get cached health status (without making requests)
   */
  getHealthStatus?(): Map<string, boolean>;

  // ===== Lifecycle =====
  
  /**
   * Check if connected to any server
   */
  isConnected(): boolean;
  
  /**
   * Close all connections and clean up resources
   */
  close?(): Promise<void>;
}

/**
 * Type guard to check if a driver supports multi-server operations
 */
export function isMultiServerDriver(driver: IMCPDriver): driver is IMCPDriver & {
  healthCheckAll(): Promise<Map<string, boolean>>;
  getHealthStatus(): Map<string, boolean>;
} {
  return typeof (driver as any).healthCheckAll === 'function';
}

export default IMCPDriver;
