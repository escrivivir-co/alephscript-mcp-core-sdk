import path from 'path';
import type {
    CollectionNameSource,
    ResolvedChromaConfig,
    VectorMachineConfig,
    VectorMachineEnv,
} from './types';

export const DEFAULT_VECTOR_MACHINE_COLLECTION_PREFIX = 'mo_mapas_';
export const DEFAULT_CHROMA_HOST = 'localhost';
export const DEFAULT_CHROMA_PORT = 8000;
export const DEFAULT_CHROMA_SSL = false;
export const DEFAULT_CHROMA_TENANT = 'default_tenant';
export const DEFAULT_CHROMA_DATABASE = 'default_database';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }

    return value === '1' || value.toLowerCase() === 'true';
}

function parsePort(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }

    const port = Number.parseInt(value, 10);
    return Number.isFinite(port) ? port : fallback;
}

function toChromaUrl(rawUrl: string): URL {
    const normalizedUrl = /^[a-z]+:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
    return new URL(normalizedUrl);
}

export function resolveHomeDirectory(env: VectorMachineEnv): string {
    const homeDirectory = env.HOME || env.USERPROFILE;
    if (!homeDirectory) {
        throw new Error('HOME / USERPROFILE is required to resolve VectorMachineSDK paths.');
    }
    return homeDirectory;
}

export function resolveRepoRoot(env: VectorMachineEnv): string {
    return env.VECTOR_MACHINE_REPO_ROOT ||
        path.join(resolveHomeDirectory(env), 'OASIS', 'aleph-scriptorium');
}

export function resolveCollectionName(collection: CollectionNameSource): string {
    return typeof collection === 'string' ? collection : collection.name;
}

export function buildDefaultChromaConfig(env: VectorMachineEnv): ResolvedChromaConfig {
    const tenant = env.VECTOR_MACHINE_CHROMA_TENANT || DEFAULT_CHROMA_TENANT;
    const database = env.VECTOR_MACHINE_CHROMA_DATABASE || DEFAULT_CHROMA_DATABASE;
    const pathValue = env.VECTOR_MACHINE_CHROMA_PATH;

    if (pathValue) {
        const chromaUrl = toChromaUrl(pathValue);

        return {
            host: chromaUrl.hostname || DEFAULT_CHROMA_HOST,
            port: chromaUrl.port ? parsePort(chromaUrl.port, DEFAULT_CHROMA_PORT) : DEFAULT_CHROMA_PORT,
            ssl: chromaUrl.protocol === 'https:',
            path: chromaUrl.toString(),
            tenant,
            database,
        };
    }

    return {
        host: env.VECTOR_MACHINE_CHROMA_HOST || DEFAULT_CHROMA_HOST,
        port: parsePort(env.VECTOR_MACHINE_CHROMA_PORT, DEFAULT_CHROMA_PORT),
        ssl: parseBoolean(env.VECTOR_MACHINE_CHROMA_SSL, DEFAULT_CHROMA_SSL),
        tenant,
        database,
    };
}

export function buildDefaultVectorMachineConfig(
    env: VectorMachineEnv = process.env as VectorMachineEnv,
): VectorMachineConfig {
    const repoRoot = resolveRepoRoot(env);

    return {
        repoRoot,
        sdkRoot: path.join(repoRoot, 'VectorMachineSDK'),
        collectionPrefix: env.VECTOR_MACHINE_COLLECTION_PREFIX || DEFAULT_VECTOR_MACHINE_COLLECTION_PREFIX,
        chroma: buildDefaultChromaConfig(env),
    };
}
