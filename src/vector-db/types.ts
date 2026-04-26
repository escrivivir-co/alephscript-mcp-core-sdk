import type { ChromaClient, ChromaClientArgs, Collection } from 'chromadb';

export type MachineStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface VectorMachineEnv extends NodeJS.ProcessEnv {
    HOME?: string;
    USERPROFILE?: string;
    VECTOR_MACHINE_REPO_ROOT?: string;
    VECTOR_MACHINE_CHROMA_PATH?: string;
    VECTOR_MACHINE_CHROMA_HOST?: string;
    VECTOR_MACHINE_CHROMA_PORT?: string;
    VECTOR_MACHINE_CHROMA_SSL?: string;
    VECTOR_MACHINE_CHROMA_TENANT?: string;
    VECTOR_MACHINE_CHROMA_DATABASE?: string;
    VECTOR_MACHINE_COLLECTION_PREFIX?: string;
}

export type ResolvedChromaConfig =
    ChromaClientArgs &
    Required<Pick<ChromaClientArgs, 'host' | 'port' | 'ssl' | 'tenant' | 'database'>>;

export interface VectorMachineConfig {
    repoRoot: string;
    sdkRoot: string;
    collectionPrefix: string;
    chroma: ResolvedChromaConfig;
}

export interface VectorMachine {
    start(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    getStatus(): MachineStatus;
    getConfig(): VectorMachineConfig;
    getChromaClient(): ChromaClient;
    connectChroma(): Promise<number>;
    listCollectionNames(prefix?: string): Promise<string[]>;
}

export type CollectionNameSource = string | Pick<Collection, 'name'>;
