/**
 * AAIA MCP Types
 * Types for AAIA (Arquitectura de Agentes de IA Autónomos) MCP integration
 * 
 * @épica MCP-AAIA-SERVER-1.0.0
 */

// ============================================
// Core Types from AAIAGallery
// ============================================

/**
 * Estados de ejecución de FIAs y Mundos
 */
export enum RunStateEnum {
    PLAY = "PLAY",
    PLAY_STEP = "PLAY_STEP",
    PAUSE = "PAUSE",
    STOP = "STOP"
}

/**
 * Los 10 paradigmas de Inteligencia Artificial soportados
 */
export type FIAParadigma = 
    | 'logica'        // Prolog, razonamiento declarativo
    | 'simbolica'     // Procesamiento simbólico
    | 'conexionista'  // Redes neuronales, ML
    | 'sbc'           // Sistemas basados en conocimiento
    | 'sbr'           // Sistemas basados en reglas
    | 'situada'       // Agentes IoT, sensores/actuadores
    | 'sistemas'      // Teoría de sistemas
    | 'cientifica'    // Método científico
    | 'gramaticas'    // NLP, procesamiento de lenguaje
    | 'hibrido';      // Combinación de paradigmas

/**
 * Percepto: Estímulo del entorno hacia las FIAs
 */
export interface IPercepto {
    tipo: 'sensor' | 'evento' | 'comando';
    fuente?: string;
    payload: Record<string, unknown>;
    timestamp?: string;
}

/**
 * Eferencia: Salida/acción de una FIA
 */
export interface IEferencia {
    tipo: 'accion' | 'dato' | 'evento' | 'estado' | 'noop';
    payload: Record<string, unknown>;
    timestamp?: string;
}

/**
 * Información básica de una FIA
 */
export interface IFIAInfo {
    index: number;
    nombre: string;
    paradigma: FIAParadigma;
    runState: RunStateEnum;
    runAsync: boolean;
    capacidades?: string[];
}

/**
 * Estado del mundo AAIA
 */
export interface IMundoState {
    nombre: string;
    vivo: boolean;
    runState: RunStateEnum;
    modelo: Record<string, unknown>;
    fiasCount: number;
    renderer?: string;
}

// ============================================
// Session Types
// ============================================

/**
 * Sesión AAIA con runtime aislado
 */
export interface AAIASession {
    sessionId: string;
    appId: string;
    createdAt: Date;
    lastUsedAt: Date;
    mundo: IMundoState;
    fias: IFIAInfo[];
}

/**
 * Metadata de sesión para listado
 */
export interface AAIASessionMeta {
    sessionId: string;
    appId: string;
    createdAt: string;
    lastUsedAt: string;
    ageMinutes: number;
    fiasCount: number;
    mundoState: RunStateEnum;
}

// ============================================
// App Types (Aplicaciones AAIA)
// ============================================

/**
 * Definición de una App AAIA
 */
export interface IAAIAApp {
    id: string;
    nombre: string;
    descripcion?: string;
    paradigmaPrincipal: FIAParadigma;
    fias: IFIAConfig[];
    mundoConfig?: IMundoConfig;
}

/**
 * Configuración de FIA dentro de una App
 */
export interface IFIAConfig {
    nombre: string;
    paradigma: FIAParadigma;
    clase: string;           // Nombre de la clase a instanciar
    modulo?: string;         // Módulo donde buscar la clase
    runAsync?: boolean;
    config?: Record<string, unknown>;
}

/**
 * Configuración del Mundo
 */
export interface IMundoConfig {
    nombre: string;
    modeloInicial?: Record<string, unknown>;
    renderer?: string;
}

// ============================================
// MCP Tool Arguments & Results
// ============================================

export interface AAIACreateSessionArgs {
    appId: string;
}

export interface AAIACreateSessionResult {
    success: boolean;
    sessionId?: string;
    appId?: string;
    error?: string;
    fiasCount?: number;
}

export interface AAIAListFIAsArgs {
    sessionId: string;
}

export interface AAIAListFIAsResult {
    success: boolean;
    sessionId: string;
    fias?: IFIAInfo[];
    error?: string;
}

export interface AAIAStepFIAArgs {
    sessionId: string;
    fiaIndex: number;
}

export interface AAIAStepFIAResult {
    success: boolean;
    fiaIndex: number;
    runState: RunStateEnum;
    cycles?: number;
    eferencia?: IEferencia;
    executionTimeMs?: number;
    error?: string;
}

export interface AAIASendPerceptoArgs {
    sessionId: string;
    percepto: IPercepto;
}

export interface AAIASendPerceptoResult {
    success: boolean;
    sessionId: string;
    percepto?: IPercepto;
    processedBy?: number[];  // Índices de FIAs que procesaron
    error?: string;
}

export interface AAIAQueryMundoArgs {
    sessionId: string;
}

export interface AAIAQueryMundoResult {
    success: boolean;
    sessionId: string;
    mundo?: IMundoState;
    error?: string;
}

export interface AAIASetFIAStateArgs {
    sessionId: string;
    fiaIndex: number;
    state: RunStateEnum;
}

export interface AAIASetFIAStateResult {
    success: boolean;
    fiaIndex: number;
    previousState?: RunStateEnum;
    newState?: RunStateEnum;
    error?: string;
}

// ============================================
// Socket.IO / PersefonBot Types
// ============================================

/**
 * Capacidades de PersefonBot en AAIA_ROOM
 */
export type PersefonBotCapability =
    | 'AAIA_GET_APPS'
    | 'AAIA_CREATE_SESSION'
    | 'AAIA_LIST_SESSIONS'
    | 'AAIA_DESTROY_SESSION'
    | 'AAIA_LIST_FIAS'
    | 'AAIA_START_FIA'
    | 'AAIA_STOP_FIA'
    | 'AAIA_STEP_FIA'
    | 'AAIA_PLAY_FIA'
    | 'AAIA_PAUSE_FIA'
    | 'AAIA_SEND_PERCEPTO'
    | 'AAIA_GET_EFERENCIA'
    | 'AAIA_QUERY_MUNDO';

/**
 * Evento Socket.IO de AAIA_ROOM
 */
export interface AAIARoomEvent {
    eventType: PersefonBotCapability;
    sessionId?: string;
    payload?: Record<string, unknown>;
    timestamp: string;
}

// ============================================
// Default Config
// ============================================

export const DEFAULT_AAIA_MCP_SERVER_CONFIG = {
    id: 'aaia-mcp-server',
    name: 'AAIA MCP Server',
    version: '1.0.0',
    port: 3007,
    description: 'Exposes AAIA Runtime (FIAs + Mundos) to MCP clients',
    capabilities: {
        tools: true,
        resources: true,
        prompts: true,
    },
    socketMeshUrl: 'http://localhost:3010',
    roomName: 'AAIA_ROOM',
    botName: 'PersefonBot',
};

export default {
    RunStateEnum,
    DEFAULT_AAIA_MCP_SERVER_CONFIG,
};
