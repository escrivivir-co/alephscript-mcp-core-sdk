/**
 * MCP Types - Shared types for MCP client/server ecosystem
 * 
 * These types are shared between:
 * - MCPGallery/mcp-core-sdk/src/client/BaseMCPClient.ts
 * - MCPGallery/mcp-core-sdk/src/server/BaseMCPServer.ts
 * - PrologEditor/backend (MCP client implementations)
 * - Any MCP client that extends BaseMCPClient
 * 
 * @module @alephscript/mcp-core-sdk/types/mcp
 */

// ============================================
// MCP Protocol Types
// ============================================

/**
 * MCP text content in tool results
 */
export interface MCPTextContent {
  type: 'text';
  text: string;
}

/**
 * MCP image content in tool results
 */
export interface MCPImageContent {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
}

/**
 * MCP tool result content
 */
export type MCPContent = MCPTextContent | MCPImageContent;

/**
 * MCP tool result wrapper
 */
export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
}

/**
 * MCP resource contents
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded binary
}

/**
 * MCP resource read result
 */
export interface MCPResourceResult {
  contents: MCPResourceContent[];
}

// ============================================
// Logger Interface
// ============================================

/**
 * Logger interface for consistent logging across MCP clients and servers
 */
export interface MCPLogger {
  info: (message: string, meta?: object) => void;
  error: (message: string, meta?: object) => void;
  debug: (message: string, meta?: object) => void;
  warn: (message: string, meta?: object) => void;
  verbose: (message: string, meta?: object) => void;
}

/**
 * Default console logger implementation
 */
export const createDefaultLogger = (prefix: string = ''): MCPLogger => ({
  info: (message: string, meta?: object) => 
    console.log(`[INFO] ${new Date().toISOString()} ${prefix}${message}`, meta ? JSON.stringify(meta) : ''),
  error: (message: string, meta?: object) => 
    console.error(`[ERROR] ${new Date().toISOString()} ${prefix}${message}`, meta ? JSON.stringify(meta) : ''),
  debug: (message: string, meta?: object) => 
    console.log(`[DEBUG] ${new Date().toISOString()} ${prefix}${message}`, meta ? JSON.stringify(meta) : ''),
  warn: (message: string, meta?: object) => 
    console.warn(`[WARN] ${new Date().toISOString()} ${prefix}${message}`, meta ? JSON.stringify(meta) : ''),
  verbose: (message: string, meta?: object) => 
    console.log(`[VERBOSE] ${new Date().toISOString()} ${prefix}${message}`, meta ? JSON.stringify(meta) : ''),
});

// ============================================
// Client Configuration
// ============================================

/**
 * Base configuration for MCP clients
 */
export interface BaseMCPClientConfig {
  /** Name of the client (for identification) */
  name: string;
  /** Version of the client */
  version: string;
  /** URL of the MCP server (HTTP endpoint) */
  serverUrl: string;
  /** Connection timeout in ms */
  timeout?: number;
  /** Request init options for fetch */
  requestInit?: RequestInit;
}

// ============================================
// Server Configuration
// ============================================

/**
 * MCP Server capabilities
 */
export interface MCPServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
}

/**
 * MCP Server features
 */
export interface MCPServerFeatures {
  enableManagers?: boolean;
  enableWebConsole?: boolean;
  enableHealthChecks?: boolean;
}

/**
 * Base configuration for MCP servers
 */
export interface BaseMCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** HTTP port */
  port: number;
  /** Server description */
  description?: string;
  /** Enabled capabilities */
  capabilities?: MCPServerCapabilities;
  /** Server features */
  features?: MCPServerFeatures;
}

// ============================================
// Connection State
// ============================================

/**
 * MCP connection state
 */
export type MCPConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP connection status
 */
export interface MCPConnectionStatus {
  state: MCPConnectionState;
  serverUrl?: string;
  connectedAt?: string; // ISO date
  error?: string;
}

// ============================================
// Health Check Types
// ============================================

/**
 * Health check response
 */
export interface MCPHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  server: string;
  version: string;
  timestamp: string; // ISO date
  details?: Record<string, unknown>;
  /** Whether the server is healthy (legacy compat) */
  healthy?: boolean;
  /** Server uptime in milliseconds */
  uptime?: number;
  /** Additional health metrics */
  metrics?: Record<string, unknown>;
}

// ============================================
// Tool Request/Response Types
// ============================================

/**
 * Request to execute a tool on an MCP server
 */
export interface MCPToolRequest {
  /** Name of the tool to execute */
  toolName: string;
  /** Parameters to pass to the tool */
  params: Record<string, unknown>;
  /** Optional timeout for this specific request */
  timeout?: number;
}

/**
 * Response from executing a tool
 */
export interface MCPToolResponse {
  /** Whether the tool execution was successful */
  success: boolean;
  /** Result data from the tool */
  result?: unknown;
  /** Error message if execution failed */
  error?: string;
  /** Additional metadata about the execution */
  metadata?: Record<string, unknown>;
  /** Execution time in milliseconds */
  executionTime?: number;
}

// ============================================
// Resource Request/Response Types
// ============================================

/**
 * Request to get a resource from an MCP server
 */
export interface MCPResourceRequest {
  /** ID of the resource to retrieve */
  resourceId: string;
  /** Optional parameters for resource retrieval */
  params?: Record<string, unknown>;
}

/**
 * Response containing a resource
 */
export interface MCPResourceResponse {
  /** Whether the resource retrieval was successful */
  success: boolean;
  /** The resource data */
  data?: unknown;
  /** Content type of the resource */
  contentType?: string;
  /** Error message if retrieval failed */
  error?: string;
  /** Resource metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// Prompt Request/Response Types
// ============================================

/**
 * Request to get a prompt from an MCP server
 */
export interface MCPPromptRequest {
  /** ID of the prompt to retrieve */
  promptId: string;
  /** Variables to interpolate into the prompt */
  variables?: Record<string, unknown>;
}

/**
 * Response containing a prompt
 */
export interface MCPPromptResponse {
  /** Whether the prompt retrieval was successful */
  success: boolean;
  /** The generated prompt text */
  prompt?: string;
  /** Error message if retrieval failed */
  error?: string;
  /** Prompt metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// Client Configuration (Extended)
// ============================================

/**
 * Configuration for MCP client behavior
 */
export interface MCPClientConfig {
  /** Default timeout for requests in milliseconds */
  defaultTimeout: number;
  /** Default number of retry attempts */
  defaultRetries: number;
  /** Connection pool size */
  poolSize: number;
  /** Enable request/response logging */
  enableLogging: boolean;
}

// ============================================
// Statistics and Metrics
// ============================================

/**
 * Statistics about MCP operations
 */
export interface MCPStats {
  /** Total number of requests made */
  totalRequests: number;
  /** Number of successful requests */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Number of active connections */
  activeConnections: number;
  /** Requests per server */
  requestsByServer: Record<string, number>;
}

// ============================================
// Event Types
// ============================================

/**
 * Event types emitted by MCP operations
 */
export enum MCPEventType {
  SERVER_CONNECTED = 'server_connected',
  SERVER_DISCONNECTED = 'server_disconnected',
  SERVER_ERROR = 'server_error',
  TOOL_EXECUTED = 'tool_executed',
  RESOURCE_RETRIEVED = 'resource_retrieved',
  PROMPT_RETRIEVED = 'prompt_retrieved',
  HEALTH_CHECK = 'health_check',
}

/**
 * Error types that can occur in MCP operations
 */
export enum MCPErrorType {
  CONNECTION_ERROR = 'connection_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  VALIDATION_ERROR = 'validation_error',
  SERVER_ERROR = 'server_error',
  NOT_FOUND_ERROR = 'not_found_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
}

/**
 * Detailed error information for MCP operations
 */
export interface MCPError extends Error {
  /** Type of MCP error */
  type: MCPErrorType;
  /** Server ID where error occurred */
  serverId?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// ============================================
// Default Configurations
// ============================================

/**
 * Default configurations for MCP operations
 */
export const MCP_DEFAULTS = {
  /** Default timeout in milliseconds */
  TIMEOUT: 30000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Connection pool size */
  POOL_SIZE: 10,
  /** Health check interval in milliseconds */
  HEALTH_CHECK_INTERVAL: 60000,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 10000,
} as const;

/**
 * Type for MCP_DEFAULTS values
 */
export type MCPDefaultsType = typeof MCP_DEFAULTS;
