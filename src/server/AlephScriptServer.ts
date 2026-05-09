import { Namespace } from "socket.io";
import { ServerInstance, SocketServer, SocketServerOptions } from "./SocketServer";

export class AlephScriptServer extends SocketServer {

	runtime: Namespace | undefined;
	admin: Namespace | undefined;
	base: Namespace | undefined;

	constructor(public server: ServerInstance, options?: SocketServerOptions) {

		super("ASsrv", server, options);

		this.createNamespace("admin");
		this.createNamespace("runtime");
		this.createNamespace("");

		this.runtime = this.ioG("runtime");

		this.runtime?.on("Menu_State", (socket) => {
			console.log("Piden Menu_State")
		})

		this.runtime?.on("Menu_State", (socket) => {
			console.log("Piden Menu_State")
		})

		this.admin = this.ioG("admin");
 
		this.base = this.ioG("");

	}

}
