import { ChromaClient } from 'chromadb';
import { buildDefaultVectorMachineConfig, resolveCollectionName } from './config';
import type { MachineStatus, VectorMachine, VectorMachineConfig } from './types';

export class BasicVectorMachine implements VectorMachine {
    private status: MachineStatus;
    private tick: number;
    private timer: NodeJS.Timeout | null;
    private readonly config: VectorMachineConfig;
    private readonly chromaClient: ChromaClient;

    constructor(config: VectorMachineConfig = buildDefaultVectorMachineConfig()) {
        this.status = 'idle';
        this.tick = 0;
        this.timer = null;
        this.config = config;
        this.chromaClient = new ChromaClient(this.config.chroma);
    }

    public start(): void {
        if (this.status === 'running') return;
        if (this.status === 'paused') {
            throw new Error('Use resume() when machine is paused.');
        }

        this.tick = 0;
        this.status = 'running';
        this.runLoop();
        console.log('▶️ VectorMachine started');
    }

    public pause(): void {
        if (this.status !== 'running') {
            throw new Error(`Cannot pause from state "${this.status}".`);
        }
        this.status = 'paused';
        this.clearLoop();
        console.log('⏸️ VectorMachine paused');
    }

    public resume(): void {
        if (this.status !== 'paused') {
            throw new Error(`Cannot resume from state "${this.status}".`);
        }
        this.status = 'running';
        this.runLoop();
        console.log('⏯️ VectorMachine resumed');
    }

    public stop(): void {
        if (this.status === 'idle' || this.status === 'stopped') return;
        this.status = 'stopped';
        this.clearLoop();
        console.log(`⏹️ VectorMachine stopped at tick ${this.tick}`);
    }

    public getStatus(): MachineStatus {
        return this.status;
    }

    public getConfig(): VectorMachineConfig {
        return this.config;
    }

    public getChromaClient(): ChromaClient {
        return this.chromaClient;
    }

    public async connectChroma(): Promise<number> {
        return await this.chromaClient.heartbeat();
    }

    public async listCollectionNames(prefix?: string): Promise<string[]> {
        const collectionPrefix = prefix || this.config.collectionPrefix;
        const collections = await this.chromaClient.listCollections();

        return collections
            .map(resolveCollectionName)
            .filter(function(collectionName: string): boolean {
                return collectionName.indexOf(collectionPrefix) === 0;
            });
    }

    private runLoop(): void {
        this.clearLoop();
        this.timer = setInterval(() => {
            this.tick += 1;
            console.log(`tick=${this.tick} | status=${this.status}`);
        }, 300);
    }

    private clearLoop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
