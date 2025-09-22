import express, { Application, Request, Response } from 'express'
import { createServer } from 'node:http';
import path from 'path';

import cors from 'cors';
import { AlephScriptClient } from '@alephscript/client';
import { AlephScriptServer } from 'server/AlephScriptServer';

const PORT = 3010;
export class SocketIoMesh {
	app!: Application;
	server: any;
	as!: AlephScriptServer;
	asCli!: AlephScriptClient;
	noPath!: AlephScriptClient;
	adminUIAvailable = false;

	async init(port: number = PORT) {
		this.app = express();
		const corsOptions = {
			origin: (origin: any, callback: any) => {
				callback(null, true);
			},
			credentials: true
		};
		this.app.use(cors(corsOptions));

		// Servir el Socket.IO Admin UI - Usando require.resolve para encontrar el módulo correctamente
		try {
			const adminUIPath = path.dirname(require.resolve('@socket.io/admin-ui/package.json'));
			const adminUIDistPath = path.join(adminUIPath, 'dist');
			this.app.use('/admin', express.static(adminUIDistPath));
			this.adminUIAvailable = true;
			console.log('✅ Socket.IO Admin UI disponible en /admin');
		} catch (error) {
			console.warn('⚠️  Socket.IO Admin UI no está disponible. Instala @socket.io/admin-ui para habilitarlo.');
			this.adminUIAvailable = false;
		}

		// Ruta raíz informativa
		this.app.get('/', (req: Request, res: Response) => {
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

		this.server = createServer(this.app);

		this.as = new AlephScriptServer(this.server);

		this.server.listen(PORT, this.onServerLog)
	}

	onServerLog() {
		console.log(`🚀 Socket Gym Demo - Server escuchando en el puerto ${PORT}`);
		console.log("📦 Usando @alephscript/core library");

		// Crear clientes usando la librería
		this.asCli = new AlephScriptClient("SERVER_cRUNTIME", `http://localhost:${PORT}`, "/runtime");
		// THIS IS UI APP ADMIN DASHBOARD, DON'T CONNECT const asCliA = new AlephScriptClient("SERVER_cADMIN", `http://localhost:${PORT}`, "/admin");
		this.noPath = new AlephScriptClient("SERVER_cNOPATH", `http://localhost:${PORT}`, "/");

		// Configurar triggers usando la librería
		this.asCli.initTriggersDefinition.push(() => {

			this.asCli.io.on("SET_LIST_OF_THREADS", (...args: any[]) => {
				console.log("📥 Receiving list of threads from @alephscript/core...")
			})
			this.asCli.room("GET_LIST_OF_THREADS");

			this.asCli.io.on("SET_SERVER_STATE", (...args: any[]) => {
				console.log("📊 Receiving server state from @alephscript/core...")
			})
			this.asCli.room("GET_SERVER_STATE");
		})

		console.log("✅ Demo aplicación configurada correctamente usando @alephscript/core");
		// as.startPing();
	}
}
