import express, { Application, Request, Response } from 'express'
import { createServer } from 'node:http';
import path from 'path';

import cors from 'cors';
import { AlephScriptServer } from './AlephScriptServer';
import { SocketServer, SocketServerCorsOptions } from './SocketServer';
import { AuthValidator } from './auth/SharedSecretAuth';

export interface SocketIoMeshOptions {
	port?: number;
	host?: string;
	cors?: SocketServerCorsOptions;
	authValidator?: AuthValidator;
	exposeAdminUI?: boolean;
	exposeRootInfo?: boolean;
	healthPath?: string | false;
}

function createExpressCorsOptions(options?: SocketServerCorsOptions): cors.CorsOptions {
	const credentials = options?.credentials ?? true;
	const origins = options?.origins ?? '*';

	if (origins === '*') {
		return {
			origin: (_origin, callback) => callback(null, true),
			credentials
		};
	}

	const allowedOrigins = new Set(origins.map((origin) => origin.trim()).filter(Boolean));

	return {
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.has(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error(`origin not allowed: ${origin}`), false);
		},
		credentials
	};
}

/**
 * SocketIoMesh - Base Mesh Layer
 * 
 * Crea y configura la infraestructura Express + Socket.IO:
 * - Express app con CORS
 * - Admin UI (si disponible)
 * - AlephScriptServer (namespaces runtime/admin/base)
 * - Ruta raíz informativa
 * 
 * Las subclases añaden lógica de orquestación (REST, capabilities, etc.)
 * sin necesidad de recrear la infraestructura.
 */
export class SocketIoMesh {
	app!: Application;
	server: any;
	as!: AlephScriptServer;
	adminUIAvailable = false;
	protected port: number = 3010;
	protected host: string = process.env.ALEPHSCRIPT_BIND_HOST || '0.0.0.0';
	protected cors?: SocketServerCorsOptions;
	protected authValidator?: AuthValidator;
	protected exposeAdminUI = true;
	protected exposeRootInfo = true;
	protected healthPath: string | false = '/healthz';

	/**
	 * Getter para acceder al SocketServer subyacente
	 */
	get socketServer(): SocketServer {
		return this.as as SocketServer;
	}

	protected getDisplayHost(): string {
		return this.host === '0.0.0.0' ? 'localhost' : this.host;
	}

	/**
	 * Inicializa Express + Socket.IO server sin hacer listen().
	 * Las subclases pueden override onSetup() para registrar endpoints adicionales.
	 */
	async init(portOrOptions: number | SocketIoMeshOptions = this.port): Promise<void> {
		const options = typeof portOrOptions === 'number'
			? { port: portOrOptions }
			: portOrOptions;

		this.port = options.port ?? this.port;
		this.host = options.host ?? (process.env.ALEPHSCRIPT_BIND_HOST || this.host);
		this.cors = options.cors;
		this.authValidator = options.authValidator;
		this.exposeAdminUI = options.exposeAdminUI ?? true;
		this.exposeRootInfo = options.exposeRootInfo ?? true;
		this.healthPath = options.healthPath === undefined ? '/healthz' : options.healthPath;
		this.app = express();
		this.app.use(cors(createExpressCorsOptions(this.cors)));
		this.app.use(express.json());

		if (this.exposeAdminUI) {
			this.setupAdminUI();
			if (this.authValidator && this.adminUIAvailable) {
				console.warn('⚠️  Socket.IO Admin UI static assets are available, but instrumentation is disabled because authValidator is active.');
			}
		} else {
			this.adminUIAvailable = false;
		}

		if (this.exposeRootInfo) {
			this.setupRootRoute();
		}
		this.setupHealthRoute();

		this.server = createServer(this.app);
		this.as = new AlephScriptServer(this.server, {
			activateInstrumens: this.exposeAdminUI,
			authValidator: this.authValidator,
			cors: this.cors
		});

		// Hook para que subclases registren endpoints/listeners
		this.onSetup();

		this.server.listen(this.port, this.host, () => {
			const address = this.server.address();
			if (address && typeof address === 'object') {
				this.port = address.port;
			}

			this.onServerStarted();
		});
	}

	/**
	 * Hook para subclases: se invoca después de crear app + server pero antes de listen.
	 * Override este método para registrar endpoints REST, listeners, etc.
	 */
	protected onSetup(): void {
		// Base: no-op. Subclases lo sobreescriben.
	}

	/**
	 * Callback cuando el server arranca. Override para personalizar.
	 */
	protected onServerStarted(): void {
		console.log(`🚀 SocketIoMesh - Server escuchando en ${this.host}:${this.port}`);
		console.log("📦 Usando @alephscript/mcp-core-sdk");
		if (this.healthPath) {
			console.log(`🩺 Health endpoint disponible en http://${this.getDisplayHost()}:${this.port}${this.healthPath}`);
		}
	}

	private setupAdminUI(): void {
		try {
			const adminUIPath = path.dirname(require.resolve('@socket.io/admin-ui/package.json'));
			const adminUIDistPath = path.join(adminUIPath, 'ui', 'dist');
			this.app.use('/ui', express.static(adminUIDistPath));
			this.adminUIAvailable = true;
			console.log('✅ Socket.IO Admin UI disponible en /ui');
		} catch (error) {
			console.warn('⚠️  Socket.IO Admin UI no está disponible. Instala @socket.io/admin-ui para habilitarlo.');
			this.adminUIAvailable = false;
		}
	}

	private setupRootRoute(): void {
		this.app.get('/', (_req: Request, res: Response) => {
			const response: any = {
				message: 'AlephScript Socket.IO Server',
				endpoints: {
					socket: {
						runtime: '/runtime',
						admin: '/admin',
						base: '/'
					}
				}
			};

			if (this.adminUIAvailable) {
				response.adminUI = '/admin';
			} else {
				response.note = 'Admin UI no disponible. Instala @socket.io/admin-ui para habilitarlo.';
			}

			res.json(response);
		});
	}

	private setupHealthRoute(): void {
		if (!this.healthPath) {
			return;
		}

		this.app.get(this.healthPath, (_req: Request, res: Response) => {
			res.status(200).send('ok');
		});
	}
}
