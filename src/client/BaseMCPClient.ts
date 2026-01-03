/**
 * Base MCP Client Implementation with HTTP Streamable Transport
 * Provides common functionality for all MCP clients using @modelcontextprotocol/sdk
 * 
 * This is the client counterpart to BaseMCPServer in the server module.
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

// Re-export types for convenience
export type { MCPLogger, BaseMCPClientConfig, MCPToolResult } from "../types/mcp";
export { createDefaultLogger } from "../types/mcp";

/**
 * Base class for MCP clients with HTTP Streamable transport.
 * Extend this class to create domain-specific MCP clients (e.g., MCPPrologClient).
 */
export class BaseMCPClient {
  protected client: Client | null = null;
  protected transport: Transport | null = null;
  protected config: BaseMCPClientConfig;
  protected logger: MCPLogger;
  protected connected: boolean = false;

  constructor(config: BaseMCPClientConfig, logger?: MCPLogger) {
    this.config = {
      timeout: 30000,
      ...config,
    };
    this.logger = logger || createDefaultLogger(`${config.name}: `);
  }

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
