/**
 * BaseRoomManager - @alephscript/mcp-core-sdk
 * 
 * Implementación base abstracta del protocolo MASTER-ROOM.
 * Los servidores MCP extienden esta clase para exponer capabilities via Socket.IO.
 * 
 * @package @alephscript/mcp-core-sdk
 * @module client/BaseRoomManager
 */

import { AlephScriptClient } from './AlephScriptClient';
import {
    IRoomManager,
    IRoomManagerConfig,
    IRoomCapability,
    CapabilityHandler,
    CapabilityId,
    RoomId,
    ICapabilityContext,
    RoomProtocolEvent,
    IRoomMessagePayload,
} from '../types/room-protocol';

/**
 * Implementación base del gestor de rooms
 * 
 * @example
 * ```typescript
 * const manager = new BaseRoomManager({
 *   roomId: 'DevOps_ROOM',
 *   masterName: 'DevOpsServer',
 *   meshConfig: { url: 'http://localhost:3010', namespace: '/runtime' }
 * });
 * 
 * manager.registerCapability(
 *   { id: 'GET_STATUS', description: 'Get server status' },
 *   async (input, ctx) => ({ status: 'ok' })
 * );
 * 
 * await manager.registerAsMaster(['GET_STATUS']);
 * ```
 */
export class BaseRoomManager implements IRoomManager {
    readonly roomId: RoomId;
    readonly capabilities: Map<CapabilityId, IRoomCapability> = new Map();
    
    protected client: AlephScriptClient;
    protected handlers: Map<CapabilityId, CapabilityHandler> = new Map();
    protected masterName: string;
    protected isMaster: boolean = false;

    constructor(config: IRoomManagerConfig) {
        this.roomId = config.roomId;
        this.masterName = config.masterName;
        
        // Crear cliente Socket.IO
        this.client = new AlephScriptClient(
            config.masterName,
            config.meshConfig.url,
            config.meshConfig.namespace || '/',
            config.meshConfig.autoConnect ?? true
        );

        // Registrar capabilities iniciales
        if (config.initialCapabilities) {
            for (const cap of config.initialCapabilities) {
                this.capabilities.set(cap.id, cap);
            }
        }

        // Setup listeners para el protocolo
        this.setupProtocolListeners();
    }

    /**
     * Configura los listeners del protocolo MASTER-ROOM
     */
    protected setupProtocolListeners(): void {
        // Listener para requests GET_*
        this.client.initTriggersDefinition.push(() => {
            // Escuchar todas las requests que llegan al master
            this.client.io.onAny((event: string, ...args: any[]) => {
                this.handleIncomingEvent(event, args[0]);
            });

            // Listener específico para GET_CAPABILITIES
            this.client.io.on(RoomProtocolEvent.GET_CAPABILITIES, (data: any) => {
                this.handleGetCapabilities(data);
            });
        });
    }

    /**
     * Maneja eventos entrantes y los rutea a handlers
     */
    protected async handleIncomingEvent(event: string, data: IRoomMessagePayload): Promise<void> {
        // Solo procesar eventos GET_* si somos master
        if (!this.isMaster) return;
        if (!event.startsWith('GET_')) return;

        const capabilityId = event;
        const handler = this.handlers.get(capabilityId);

        if (handler) {
            const context: ICapabilityContext = {
                requesterId: data.requester || '',
                requesterName: data.requesterName || 'unknown',
                roomId: this.roomId,
                timestamp: Date.now(),
            };

            try {
                const result = await handler(data.data, context);
                
                // Responder con SET_*
                const responseEvent = event.replace('GET_', 'SET_');
                this.client.room(responseEvent, result, this.roomId);
                
            } catch (error) {
                console.error(`[${this.masterName}] Error handling ${event}:`, error);
                // Enviar error response
                const responseEvent = event.replace('GET_', 'SET_');
                this.client.room(responseEvent, { 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                }, this.roomId);
            }
        }
    }

    /**
     * Maneja requests de GET_CAPABILITIES
     */
    protected handleGetCapabilities(data: IRoomMessagePayload): void {
        const capabilities = this.getCapabilities();
        this.client.room(RoomProtocolEvent.SET_CAPABILITIES, {
            roomId: this.roomId,
            masterName: this.masterName,
            capabilities,
        }, this.roomId);
    }

    /**
     * Registrarse como MASTER de la room
     */
    async registerAsMaster(features: string[]): Promise<void> {
        return new Promise((resolve) => {
            this.client.initTriggersDefinition.push(() => {
                // Registrar cliente
                this.client.io.emit(RoomProtocolEvent.CLIENT_REGISTER, {
                    usuario: this.masterName,
                    sesion: this.client.getHash('master'),
                });

                // Suscribirse a la room
                this.client.io.emit(RoomProtocolEvent.CLIENT_SUSCRIBE, {
                    room: this.roomId,
                });

                // Declararse MASTER
                this.client.room(RoomProtocolEvent.MAKE_MASTER, {
                    features,
                    metadata: {
                        masterName: this.masterName,
                        capabilities: this.getCapabilities(),
                        registeredAt: Date.now(),
                    }
                }, this.roomId);

                this.isMaster = true;
                console.log(`[${this.masterName}] Registered as MASTER of ${this.roomId}`);
                console.log(`[${this.masterName}] Features: ${features.join(', ')}`);
                
                resolve();
            });

            // Forzar conexión si no está conectado
            if (!this.client.io.connected) {
                this.client.io.connect();
            }
        });
    }

    /**
     * Liberar el rol de MASTER
     */
    async releaseMaster(): Promise<void> {
        if (!this.isMaster) return;

        this.client.room(RoomProtocolEvent.RELEASE_MASTER, {
            masterName: this.masterName,
        }, this.roomId);

        this.isMaster = false;
        console.log(`[${this.masterName}] Released MASTER role of ${this.roomId}`);
    }

    /**
     * Registrar una capability con su handler
     */
    registerCapability<TInput, TOutput>(
        capability: IRoomCapability,
        handler: CapabilityHandler<TInput, TOutput>
    ): void {
        this.capabilities.set(capability.id, capability);
        this.handlers.set(capability.id, handler as CapabilityHandler);
        
        // Registrar listener específico para este capability
        const eventName = capability.id; // GET_* events
        this.client.io.on(eventName, async (data: IRoomMessagePayload<TInput>) => {
            if (!this.isMaster) return;
            
            const context: ICapabilityContext = {
                requesterId: data.requester || '',
                requesterName: data.requesterName || 'unknown',
                roomId: this.roomId,
                timestamp: Date.now(),
            };

            try {
                const result = await handler(data.data as TInput, context);
                const responseEvent = eventName.replace('GET_', 'SET_');
                this.client.room(responseEvent, result, this.roomId);
            } catch (error) {
                const responseEvent = eventName.replace('GET_', 'SET_');
                this.client.room(responseEvent, {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, this.roomId);
            }
        });

        console.log(`[${this.masterName}] Registered capability: ${capability.id}`);
    }

    /**
     * Desregistrar una capability
     */
    unregisterCapability(capabilityId: CapabilityId): void {
        this.capabilities.delete(capabilityId);
        this.handlers.delete(capabilityId);
        this.client.io.off(capabilityId);
        console.log(`[${this.masterName}] Unregistered capability: ${capabilityId}`);
    }

    /**
     * Obtener lista de capabilities
     */
    getCapabilities(): IRoomCapability[] {
        return Array.from(this.capabilities.values());
    }

    /**
     * Invocar una capability (para uso como cliente, no como master)
     */
    async invokeCapability<TInput, TOutput>(
        capabilityId: CapabilityId,
        input: TInput
    ): Promise<TOutput> {
        return new Promise((resolve, reject) => {
            const responseEvent = capabilityId.replace('GET_', 'SET_');
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout waiting for ${responseEvent}`));
            }, 10000);

            this.client.io.once(responseEvent, (data: TOutput) => {
                clearTimeout(timeout);
                resolve(data);
            });

            this.client.room(capabilityId, input, this.roomId);
        });
    }

    /**
     * Conectar al mesh
     */
    connect(): void {
        this.client.connect();
    }

    /**
     * Desconectar del mesh
     */
    disconnect(): void {
        this.releaseMaster();
        this.client.disconnect();
    }

    /**
     * Obtener el cliente subyacente (para uso avanzado)
     */
    getClient(): AlephScriptClient {
        return this.client;
    }
}
