/**
 * MCP Server Configuration
 * 
 * Re-exports BaseMCPServerConfig from types/mcp for backwards compatibility.
 * Local MCPServerConfig kept for mesh-specific extended fields.
 */

import { MCPServerCapabilities } from "./MCPTypes";

// Re-export from types/mcp
export { BaseMCPServerConfig } from "../types/mcp";

/**
 * Configuration for an MCP server connection (mesh-specific with extended fields)
 */
export interface MCPServerConfig {
    /** Server port */
    port?: number;
    script?: string;
    /** Unique identifier for this server */
    id: string;
    /** Human-readable name for this server */
    name?: string;
    /** Base URL for the MCP server */
    url?: string;
    /** Optional API key for authentication */
    apiKey?: string;
    /** Connection timeout in milliseconds */
    timeout?: number;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Additional headers to send with requests */
    headers?: Record<string, string>;
    /** Server capabilities (populated after connection) */
    capabilities?: MCPServerCapabilities;
    capabilitiesCheck?: {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
    };
    version?: string;
    description?: string;
    features?: {
        enableManagers?: boolean;
        enableWebConsole?: boolean;
        enableHealthChecks?: boolean;
    };
    autoRestart?: boolean;
    healthCheckInterval?: number;
    args?: string[];
    env?: Record<string, string>;
}