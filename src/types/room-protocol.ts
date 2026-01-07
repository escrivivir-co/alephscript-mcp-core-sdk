/**
 * Room Protocol Types - @alephscript/mcp-core-sdk
 * 
 * Definiciones del protocolo MASTER-ROOM para comunicación entre
 * servidores MCP y clientes AlephScript.
 * 
 * @package @alephscript/mcp-core-sdk
 * @module types/room-protocol
 */

// ============================================
// Core Types
// ============================================

export type RoomId = string;
export type CapabilityId = string;
export type SocketId = string;

/**
 * Capability expuesta por un MASTER de room
 */
export interface IRoomCapability {
    /** Identificador único (ej: "GET_SERVER_STATUS") */
    id: CapabilityId;
    /** Descripción para UI/docs */
    description: string;
    /** Schema de input esperado (JSON Schema compatible) */
    inputSchema?: Record<string, unknown>;
    /** Schema de output (JSON Schema compatible) */
    outputSchema?: Record<string, unknown>;
    /** Tags para categorización */
    tags?: string[];
}

/**
 * Estado de una room gestionada por un MASTER
 */
export interface IRoomState {
    /** ID de la room */
    roomId: RoomId;
    /** Socket ID del MASTER */
    masterSocketId: SocketId;
    /** Nombre del MASTER (ej: "DevOpsServer") */
    masterName: string;
    /** Capabilities expuestas */
    capabilities: IRoomCapability[];
    /** Miembros conectados */
    members: IRoomMember[];
    /** Timestamp de creación */
    createdAt: number;
    /** Metadata adicional */
    metadata?: Record<string, unknown>;
}

/**
 * Miembro de una room
 */
export interface IRoomMember {
    socketId: SocketId;
    name: string;
    role: 'master' | 'subscriber' | 'requester';
    joinedAt: number;
}

// ============================================
// Protocol Events
// ============================================

/**
 * Eventos del protocolo MASTER-ROOM
 */
export enum RoomProtocolEvent {
    // Registro y suscripción
    CLIENT_REGISTER = 'CLIENT_REGISTER',
    CLIENT_SUSCRIBE = 'CLIENT_SUSCRIBE',
    ROOM_MESSAGE = 'ROOM_MESSAGE',
    
    // Master protocol
    MAKE_MASTER = 'MAKE_MASTER',
    RELEASE_MASTER = 'RELEASE_MASTER',
    
    // Capability discovery
    GET_CAPABILITIES = 'GET_CAPABILITIES',
    SET_CAPABILITIES = 'SET_CAPABILITIES',
    
    // Server state
    GET_SERVER_STATE = 'GET_SERVER_STATE',
    SET_SERVER_STATE = 'SET_SERVER_STATE',
    
    // Room lifecycle
    ROOM_JOINED = 'room_joined',
    ROOM_LEFT = 'room_left',
}

/**
 * Payload para MAKE_MASTER
 */
export interface IMakeMasterPayload {
    /** Features/capabilities que expone el master */
    features: string[];
    /** Metadata adicional del master */
    metadata?: Record<string, unknown>;
}

/**
 * Payload para GET/SET capabilities
 */
export interface ICapabilitiesPayload {
    roomId: RoomId;
    capabilities: IRoomCapability[];
}

/**
 * Payload genérico de room message
 */
export interface IRoomMessagePayload<T = unknown> {
    event: string;
    room: RoomId;
    data?: T;
    requester?: SocketId;
    requesterName?: string;
    sender?: SocketId;
}

// ============================================
// Handler Types
// ============================================

/**
 * Handler para una capability específica
 */
export type CapabilityHandler<TInput = unknown, TOutput = unknown> = (
    input: TInput,
    context: ICapabilityContext
) => Promise<TOutput>;

/**
 * Contexto pasado a los handlers de capabilities
 */
export interface ICapabilityContext {
    /** Socket ID del requester */
    requesterId: SocketId;
    /** Nombre del requester */
    requesterName: string;
    /** Room donde se hizo la request */
    roomId: RoomId;
    /** Timestamp de la request */
    timestamp: number;
}

// ============================================
// Room Manager Interface (Abstract)
// ============================================

/**
 * Interfaz abstracta para gestores de room
 * Implementable por cualquier servidor MCP
 */
export interface IRoomManager {
    /** ID de la room que gestiona */
    readonly roomId: RoomId;
    
    /** Capabilities registradas */
    readonly capabilities: Map<CapabilityId, IRoomCapability>;
    
    /** Registrar como MASTER de la room */
    registerAsMaster(features: string[]): Promise<void>;
    
    /** Liberar el rol de MASTER */
    releaseMaster(): Promise<void>;
    
    /** Registrar una capability con su handler */
    registerCapability<TInput, TOutput>(
        capability: IRoomCapability,
        handler: CapabilityHandler<TInput, TOutput>
    ): void;
    
    /** Desregistrar una capability */
    unregisterCapability(capabilityId: CapabilityId): void;
    
    /** Obtener lista de capabilities */
    getCapabilities(): IRoomCapability[];
    
    /** Invocar una capability (para clientes) */
    invokeCapability<TInput, TOutput>(
        capabilityId: CapabilityId,
        input: TInput
    ): Promise<TOutput>;
}

// ============================================
// Configuration Types
// ============================================

/**
 * Configuración para conectar a un SocketIoMesh
 */
export interface ISocketMeshConfig {
    /** URL del servidor Socket.IO */
    url: string;
    /** Namespace (ej: "/runtime") */
    namespace?: string;
    /** Auto-conectar al crear */
    autoConnect?: boolean;
    /** Timeout de conexión (ms) */
    connectionTimeout?: number;
    /** Reintentos de conexión */
    maxRetries?: number;
}

/**
 * Configuración para un Room Manager
 */
export interface IRoomManagerConfig {
    /** ID de la room a gestionar */
    roomId: RoomId;
    /** Nombre del master (para identificación) */
    masterName: string;
    /** Configuración de conexión al mesh */
    meshConfig: ISocketMeshConfig;
    /** Capabilities iniciales */
    initialCapabilities?: IRoomCapability[];
}
