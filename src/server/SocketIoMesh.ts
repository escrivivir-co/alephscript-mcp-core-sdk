import express, { Application, Request, Response } from 'express'
import { createServer } from 'node:http';
import path from 'path';

import cors from 'cors';
import { AlephScriptServer } from './AlephScriptServer';
import { SocketServer } from './SocketServer';

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

	/**
	 * Getter para acceder al SocketServer subyacente
	 */
	get socketServer(): SocketServer {
		return this.as as SocketServer;
	}

	/**
	 * Inicializa Express + Socket.IO server sin hacer listen().
	 * Las subclases pueden override onSetup() para registrar endpoints adicionales.
	 */
	async init(port: number = this.port): Promise<void> {
		this.port = port;
		this.app = express();
		const corsOptions = {
			origin: (origin: any, callback: any) => {
				callback(null, true);
			},
			credentials: true
		};
		this.app.use(cors(corsOptions));
		this.app.use(express.json());

		this.setupAdminUI();
		this.setupRootRoute();

		this.server = createServer(this.app);
		this.as = new AlephScriptServer(this.server);

		// Hook para que subclases registren endpoints/listeners
		this.onSetup();

		this.server.listen(this.port, () => this.onServerStarted());
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
		console.log(`🚀 SocketIoMesh - Server escuchando en el puerto ${this.port}`);
		console.log("📦 Usando @alephscript/mcp-core-sdk");
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
}
