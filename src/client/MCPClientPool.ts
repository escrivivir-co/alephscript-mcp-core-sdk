/**
 * MCP Client Pool - Multi-Server MCP Client with Health Checks
 * 
 * Provides connection pooling, health monitoring, request mutex,
 * auto-reconnection, and event emission for multiple MCP servers.
 * 
 * Based on StateMachine/src/drivers/MCPClientDriver.ts
 * 
 * @module @alephscript/mcp-core-sdk/client/MCPClientPool
 */

import { EventEmitter } from "events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { 
  MCPLogger, 
  MCPToolResult,
  MCPEventType,
  MCPEvent,
} from "../types/mcp";
import { createDefaultLogger, MCP_DEFAULTS } from "../types/mcp";
import type { IMCPDriver, MCPServerTransportConfig } from "./IMCPDriver";

// Re-export for convenience
export type { IMCPDriver, MCPServerTransportConfig } from "./IMCPDriver";

/**
 * Configuration for MCPClientPool
 */
export interface MCPClientPoolConfig {
  /** Pool name for logging */
  name?: string;
  /** Client version */
  version?: string;
  /** Enable health check intervals */
  enableHealthChecks?: boolean;
  /** Health check interval in ms (default: 60000) */
  healthCheckInterval?: number;
  /** Enable auto-reconnect on connection loss */
  enableAutoReconnect?: boolean;
  /** Custom logger */
  logger?: MCPLogger;
}

/**
 * MCP Client Pool - Multi-server MCP client with advanced features
 * 
 * Features:
 * - Multi-server connection management
 * - Health check intervals
 * - Request mutex to prevent concurrent requests per server
 * - Auto-reconnection on sync errors
 * - Event emission for monitoring
 */
export class MCPClientPool extends EventEmitter implements IMCPDriver {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, Transport> = new Map();
  private configs: Map<string, MCPServerTransportConfig> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private healthIntervals: Map<string, NodeJS.Timeout> = new Map();
  private requestMutex: Map<string, Promise<unknown>> = new Map();
  
  protected logger: MCPLogger;
  protected poolConfig: Required<MCPClientPoolConfig>;

  constructor(config: MCPClientPoolConfig = {}) {
    super();
    
    this.poolConfig = {
      name: config.name ?? 'MCPClientPool',
      version: config.version ?? '1.0.0',
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? MCP_DEFAULTS.HEALTH_CHECK_INTERVAL,
      enableAutoReconnect: config.enableAutoReconnect ?? true,
      logger: config.logger ?? createDefaultLogger('MCPClientPool: '),
    };
    
    this.logger = this.poolConfig.logger;
    this.logger.verbose('MCPClientPool initialized');

    // Set up global sync error handler for auto-reconnect
    if (this.poolConfig.enableAutoReconnect) {
      this.on('mcp-sync-error', async (event: MCPEvent) => {
        this.logger.warn(`Auto-handling sync error for server ${event.serverId}`);
        const resolved = await this.reconnectClient(event.serverId);
        if (resolved) {
          this.logger.info(`Auto-resolved sync error for ${event.serverId}`);
        } else {
          this.logger.error(`Failed to auto-resolve sync error for ${event.serverId}`);
        }
      });
    }
  }

  // ===== IMCPDriver: Server Management =====

  /**
   * Add a new MCP server to the pool
   */
  async addServer(config: MCPServerTransportConfig): Promise<void> {
    try {
      this.validateServerConfig(config);

      const existing = this.configs.get(config.id);
      if (existing) {
        this.logger.info(`Server ${config.id} already configured, skipping`);
        return;
      }

      // Store configuration
      this.configs.set(config.id, config);

      // Create MCP client
      const client = new Client({
        name: `${this.poolConfig.name}_${config.id}`,
        version: this.poolConfig.version,
      }, {
        capabilities: {},
      });

      // Set up error handler
      client.onerror = (error) => {
        this.logger.error(`Client error for ${config.id}:`, { error: error.message });
        this.handleClientError(config.id, error);
      };

      // Create transport
      const baseUrl = new URL(config.url);
      const transport = new StreamableHTTPClientTransport(baseUrl);

      // Connect to server
      try {
        await client.connect(transport);
        this.healthStatus.set(config.id, true);
      } catch (err) {
        this.logger.warn(`Failed to connect to ${config.id}, marking unhealthy`);
        this.healthStatus.set(config.id, false);
      }

      // Store client and transport
      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);

      this.logger.info(`Added server ${config.name} at ${config.url}`);

      // Start health check interval if enabled
      if (this.poolConfig.enableHealthChecks) {
        this.startHealthCheckInterval(config.id);
      }

      // Emit event
      this.emitEvent(config.id, 'server_connected', { config });

    } catch (error) {
      this.logger.error(`Failed to add server ${config.id}:`, { error });
      this.healthStatus.set(config.id, false);
      throw error;
    }
  }

  /**
   * Remove a server from the pool
   */
  async removeServer(serverId: string): Promise<boolean> {
    try {
      // Stop health check
      const interval = this.healthIntervals.get(serverId);
      if (interval) {
        clearInterval(interval);
        this.healthIntervals.delete(serverId);
      }

      // Close transport
      const transport = this.transports.get(serverId);
      if (transport) {
        await transport.close();
      }

      // Clean up
      const removed = this.configs.delete(serverId);
      this.clients.delete(serverId);
      this.transports.delete(serverId);
      this.healthStatus.delete(serverId);
      this.requestMutex.delete(serverId);

      if (removed) {
        this.logger.info(`Removed server ${serverId}`);
        this.emitEvent(serverId, 'server_disconnected', {});
      }

      return removed;
    } catch (error) {
      this.logger.error(`Error removing server ${serverId}:`, { error });
      return false;
    }
  }

  /**
   * Get all configured servers
   */
  getServers(): MCPServerTransportConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerTransportConfig | undefined {
    return this.configs.get(serverId);
  }

  // ===== IMCPDriver: Core Operations =====

  /**
   * Execute a tool on the specified server
   */
  async executeTool(serverId: string, toolName: string, params: Record<string, unknown>): Promise<unknown> {
    const startTime = Date.now();

    try {
      // Wait for any ongoing request to this server
      const ongoingRequest = this.requestMutex.get(serverId);
      if (ongoingRequest) {
        this.logger.verbose(`Waiting for ongoing request to ${serverId}`);
        await ongoingRequest;
      }

      const client = this.getClient(serverId);

      // Create request promise and store in mutex
      const requestPromise = client.callTool({
        name: toolName,
        arguments: params,
      });
      this.requestMutex.set(serverId, requestPromise);

      const result = await requestPromise;

      // Clear mutex
      this.requestMutex.delete(serverId);

      const executionTime = Date.now() - startTime;
      this.logger.verbose(`Tool ${toolName} executed on ${serverId}`, { executionTime });

      // Parse and return result
      return this.parseToolResult(result);

    } catch (error) {
      this.requestMutex.delete(serverId);
      this.handleToolError(serverId, toolName, error);
      throw error;
    }
  }

  /**
   * Get a resource from the specified server
   */
  async getResource(serverId: string, resourceId: string, params?: Record<string, unknown>): Promise<unknown> {
    try {
      const client = this.getClient(serverId);

      const result = await client.readResource({
        uri: resourceId,
      });

      this.logger.verbose(`Resource ${resourceId} retrieved from ${serverId}`);
      return result;

    } catch (error) {
      this.logger.error(`Resource read failed:`, { serverId, resourceId, error });
      throw error;
    }
  }

  /**
   * Get a prompt from the specified server
   */
  async getPrompt(serverId: string, promptId: string, variables?: Record<string, unknown>): Promise<string> {
    try {
      const client = this.getClient(serverId);

      const result = await client.getPrompt({
        name: promptId,
        arguments: variables as Record<string, string>,
      });

      // Extract text from prompt messages
      const text = result.messages
        .map(m => m.content.type === 'text' ? m.content.text : '')
        .join('\n');

      this.logger.verbose(`Prompt ${promptId} retrieved from ${serverId}`);
      return text;

    } catch (error) {
      this.logger.error(`Prompt retrieval failed:`, { serverId, promptId, error });
      throw error;
    }
  }

  // ===== IMCPDriver: Health Monitoring =====

  /**
   * Check health of a specific server
   */
  async healthCheck(serverId: string): Promise<boolean> {
    try {
      const client = this.clients.get(serverId);
      if (!client) {
        return false;
      }

      // Ping by listing tools
      await client.listTools();
      this.healthStatus.set(serverId, true);
      return true;
    } catch {
      this.healthStatus.set(serverId, false);
      return false;
    }
  }

  /**
   * Check health of all servers
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    const checks = Array.from(this.configs.keys()).map(async (serverId) => {
      const healthy = await this.healthCheck(serverId);
      results.set(serverId, healthy);
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * Get cached health status (no network calls)
   */
  getHealthStatus(): Map<string, boolean> {
    return new Map(this.healthStatus);
  }

  // ===== IMCPDriver: Lifecycle =====

  /**
   * Check if connected to any server
   */
  isConnected(): boolean {
    return Array.from(this.healthStatus.values()).some(h => h);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    // Stop all health checks
    for (const interval of this.healthIntervals.values()) {
      clearInterval(interval);
    }
    this.healthIntervals.clear();

    // Close all transports
    for (const [serverId, transport] of this.transports) {
      try {
        await transport.close();
        this.logger.verbose(`Closed transport for ${serverId}`);
      } catch (err) {
        this.logger.warn(`Error closing transport for ${serverId}:`, { error: err });
      }
    }

    // Clear all maps
    this.clients.clear();
    this.transports.clear();
    this.configs.clear();
    this.healthStatus.clear();
    this.requestMutex.clear();

    this.logger.info('MCPClientPool closed');
  }

  // ===== Reconnection =====

  /**
   * Reconnect a specific client
   */
  async reconnectClient(serverId: string): Promise<boolean> {
    try {
      this.logger.verbose(`Attempting to reconnect ${serverId}`);

      const config = this.configs.get(serverId);
      const client = this.clients.get(serverId);
      const transport = this.transports.get(serverId);

      if (!config || !client) {
        this.logger.error(`Cannot reconnect - missing config/client for ${serverId}`);
        return false;
      }

      // Close existing transport
      if (transport) {
        try {
          await transport.close();
        } catch (err) {
          this.logger.warn(`Error closing transport for ${serverId}:`, { error: err });
        }
      }

      // Create new transport
      const baseUrl = new URL(config.url);
      const newTransport = new StreamableHTTPClientTransport(baseUrl);

      // Reconnect
      await client.connect(newTransport);

      // Update stored transport
      this.transports.set(serverId, newTransport);
      this.healthStatus.set(serverId, true);

      this.logger.info(`Successfully reconnected ${serverId}`);
      this.emitEvent(serverId, 'server_reconnected', {});

      return true;
    } catch (err) {
      this.logger.error(`Failed to reconnect ${serverId}:`, { error: err });
      this.healthStatus.set(serverId, false);
      return false;
    }
  }

  // ===== Private Helpers =====

  private validateServerConfig(config: MCPServerTransportConfig): void {
    if (!config.id) {
      throw new Error('Server config must have an id');
    }
    if (!config.url) {
      throw new Error('Server config must have a url');
    }
    if (!config.name) {
      config.name = config.id;
    }
  }

  private getClient(serverId: string): Client {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No client found for server ${serverId}`);
    }
    return client;
  }

  private parseToolResult(result: unknown): unknown {
    const mcpResult = result as MCPToolResult;
    if (mcpResult.content && mcpResult.content[0]?.type === 'text') {
      try {
        return JSON.parse(mcpResult.content[0].text);
      } catch {
        return mcpResult.content[0].text;
      }
    }
    return mcpResult.content;
  }

  private handleClientError(serverId: string, error: Error): void {
    // Check for sync errors
    if (error.message.includes('unknown message ID')) {
      this.logger.warn(`Sync error detected for ${serverId}`);
      this.emitEvent(serverId, 'sync_error', { error: error.message });
    } else {
      this.emitEvent(serverId, 'server_error', { error: error.message });
    }
  }

  private handleToolError(serverId: string, toolName: string, error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (err.message.includes('unknown message ID')) {
      this.logger.warn(`Sync error during tool execution on ${serverId}`);
      this.emitEvent(serverId, 'sync_error', { 
        error: err.message, 
        context: { toolName } 
      });
    }

    this.logger.error(`Tool execution failed:`, { serverId, toolName, error: err.message });
  }

  private startHealthCheckInterval(serverId: string): void {
    const interval = setInterval(async () => {
      const healthy = await this.healthCheck(serverId);
      this.emitEvent(serverId, 'health_check', { healthy });
    }, this.poolConfig.healthCheckInterval);

    this.healthIntervals.set(serverId, interval);
  }

  private emitEvent(serverId: string, action: string, data: unknown): void {
    const event: MCPEvent = {
      type: action as MCPEventType,
      action,
      serverId,
      timestamp: Date.now(),
      data,
    };
    this.emit(`mcp-${action}`, event);
    this.emit('mcp-event', event);
  }
}

export default MCPClientPool;
