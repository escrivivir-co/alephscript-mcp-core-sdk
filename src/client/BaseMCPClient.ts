/**
 * Base MCP Client Implementation with HTTP Streamable Transport
 * Provides common functionality for all MCP clients using @modelcontextprotocol/sdk
 * 
 * This is the client counterpart to BaseMCPServer in the server module.
 * Implements IMCPDriver interface for single-server use cases.
 * 
 * @module @alephscript/mcp-core-sdk/client/BaseMCPClient
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { 
  MCPLogger, 
  BaseMCPClientConfig, 
  MCPToolResult,
} from "../types/mcp";
import { createDefaultLogger } from "../types/mcp";
import type { IMCPDriver, MCPServerTransportConfig } from "./IMCPDriver";

// Re-export types for convenience
export type { MCPLogger, BaseMCPClientConfig, MCPToolResult } from "../types/mcp";
export { createDefaultLogger } from "../types/mcp";

/**
 * Base class for MCP clients with HTTP Streamable transport.
 * Implements IMCPDriver for single-server use cases.
 * Extend this class to create domain-specific MCP clients (e.g., MCPPrologClient).
 * 
 * For multi-server scenarios, use MCPClientPool instead.
 */
export class BaseMCPClient implements Partial<IMCPDriver> {
  protected client: Client | null = null;
  protected transport: Transport | null = null;
  protected config: BaseMCPClientConfig;
  protected logger: MCPLogger;
  protected connected: boolean = false;
  
  /** Server config for IMCPDriver compatibility */
  protected serverConfig: MCPServerTransportConfig | null = null;

  constructor(config: BaseMCPClientConfig, logger?: MCPLogger) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    this.logger = logger || createDefaultLogger(`${config.name}: `);
    
    // Create server config from base config
    this.serverConfig = {
      id: config.name,
      name: config.name,
      url: config.serverUrl,
      timeout: config.timeout,
    };
  }

  // ===== IMCPDriver: Server Management =====

  /**
   * Add/replace server configuration (single-server: replaces current)
   */
  addServer(config: MCPServerTransportConfig): void {
    this.serverConfig = config;
    this.config.serverUrl = config.url;
    this.config.name = config.name;
    this.logger.info(`Server configured: ${config.name} at ${config.url}`);
  }

  /**
   * Remove server (single-server: disconnects and clears config)
   */
  async removeServer(serverId: string): Promise<boolean> {
    if (this.serverConfig?.id === serverId) {
      await this.disconnect();
      this.serverConfig = null;
      return true;
    }
    return false;
  }

  /**
   * Get all servers (single-server: returns array with one element)
   */
  getServers(): MCPServerTransportConfig[] {
    return this.serverConfig ? [this.serverConfig] : [];
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerTransportConfig | undefined {
    return this.serverConfig?.id === serverId ? this.serverConfig : undefined;
  }

  // ===== IMCPDriver: Core Operations =====

  /**
   * Execute a tool (IMCPDriver interface)
   * @param serverId Ignored for single-server client
   */
  async executeTool(serverId: string, toolName: string, params: Record<string, unknown>): Promise<unknown> {
    return this.callTool(toolName, params);
  }

  /**
   * Get a resource (IMCPDriver interface)
   * @param serverId Ignored for single-server client
   */
  async getResource(serverId: string, resourceId: string, params?: Record<string, unknown>): Promise<unknown> {
    await this.ensureConnected();
    
    try {
      const result = await this.client!.readResource({
        uri: resourceId,
      });
      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Resource read failed`, { resourceId, error: err.message });
      throw err;
    }
  }

  /**
   * Health check (IMCPDriver interface)
   */
  async healthCheck(serverId: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      // Simple ping - list tools to verify connection
      await this.client!.listTools();
      return true;
    } catch {
      return false;
    }
  }

  // ===== Core Connection Methods =====

  /**
   * Connect to the MCP Server via HTTP Streamable Transport
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.info(`${this.config.name}: Already connected`);
      return;
    }

    try {
      this.client = new Client({
        name: this.config.name,
        version: this.config.version,
      });

      // Use StreamableHTTPClientTransport for HTTP connection
      const serverUrl = new URL(this.config.serverUrl);
      this.transport = new StreamableHTTPClientTransport(serverUrl, {
        requestInit: this.config.requestInit,
      });

      await this.client.connect(this.transport);
      this.connected = true;
      this.logger.info(`${this.config.name}: Connected via HTTP`, { url: this.config.serverUrl });
    } catch (error: unknown) {
      const err = error instanceof Error ? { message: error.message } : { message: String(error) };
      this.logger.error(`${this.config.name}: Failed to connect`, err);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP Server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
    this.connected = false;
    this.logger.info(`${this.config.name}: Disconnected`);
  }

  /**
   * Alias for disconnect (IMCPDriver interface)
   */
  async close(): Promise<void> {
    return this.disconnect();
  }

  /**
   * Ensure client is connected (lazy connection on first use)
   */
  protected async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    if (!this.client) {
      throw new Error(`${this.config.name}: Not connected`);
    }
  }

  /**
   * Call a tool on the MCP server
   */
  protected async callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    await this.ensureConnected();
    
    try {
      const result = await this.client!.callTool({
        name,
        arguments: args,
      });

      const text = this.parseToolResult(result);
      return JSON.parse(text) as T;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`${this.config.name}: Tool call failed`, { tool: name, error: err.message });
      throw err;
    }
  }

  /**
   * Parse MCP tool result to string
   */
  protected parseToolResult(result: unknown): string {
    const mcpResult = result as MCPToolResult;
    if (mcpResult.content && mcpResult.content[0]?.type === 'text') {
      return mcpResult.content[0].text;
    }
    throw new Error('Unexpected response format from MCP server');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the underlying MCP client instance
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Get the current configuration
   */
  getConfig(): BaseMCPClientConfig {
    return { ...this.config };
  }
}

export default BaseMCPClient;
