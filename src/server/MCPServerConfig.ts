/**
 * MCP Server Configuration
 */

import { MCPServerCapabilities } from "./MCPTypes";

/**
 * Configuration for an MCP server connection
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

export interface BaseMCPServerConfig extends MCPServerConfig {

}