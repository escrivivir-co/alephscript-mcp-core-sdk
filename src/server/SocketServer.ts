import http from "http";
import { Socket, Server, Namespace } from 'socket.io';
import type { Server as HTTPSServer } from "https";
import type { Http2SecureServer, Http2Server } from "http2";
const { instrument } = require("@socket.io/admin-ui");
import { isLogable, Message } from "../utils";
import { 
	NamespaceDetails, 
	RoomDetails, 
	IRoomDetails, 
	SuscriptionDetails, 
	ArgsMeta, 
	namespaceId, 
	socketId, 
	IUserDetails, 
	roomId, 
	masterSocketId,
	IServerState,
	INamespaceDetails,
	ISocketDetails
} from "../types";

export type ServerInstance = http.Server | HTTPSServer | Http2SecureServer | Http2Server;

const corsOptions = {
    origin: (origin: any, callback: any) => {
        callback(null, true);
    },
    credentials: true // Habilitar el soporte para credenciales
};

export class SocketServer {

	namespaces = new Map<namespaceId, Namespace>();
	sockets = new Map<socketId, IUserDetails>();
	rooms = new Map<roomId, masterSocketId>();
	roomsSockets = new Map<roomId, socketId[]>();

	io: Server;

	constructor(
		public name = "ASsrv",
		server: ServerInstance,
		activateInstrumens = true,
		public autoBroadcast = true
	) {

		this.io = new Server( server, { cors: corsOptions } );

		// Permite usar la aplicación Aleph-ws-server-ui para admin del server
		if (activateInstrumens) {
			instrument(this.io, {
				auth: false
			});
		}

	}

	createNamespace(namespace: string) {

		const socket = this.io.of('/' + namespace);

		socket.on("connection", (socket) => this.onConnection(namespace, socket))

		this.namespaces.set(namespace, socket);

	}

	onConnection(namespace: string, socket: Socket) {

		this.log((namespace || "--") + ".onConnection: ", "S: " + socket.id);

		socket.on("disconnect", (args) => this.onDisconnect(namespace, socket, args))
		socket.on('error', (error) => {
			console.error('Socket error:', error);
		});

		if (this.autoBroadcast) {

			socket.on("CLIENT_REGISTER", (data, ...args)=> { this.onClientRegister(namespace, socket, data) })
			socket.on("CLIENT_SUSCRIBE", (data, ...args)=> { this.onClientSuscribe(namespace, socket, data) })
			socket.on("ROOM_MESSAGE", (data, ...args)=> { this.onRoomMessage(namespace, socket, data) });

			socket.onAny((event, ...args: any) => {

				//console.log("Event", event, "args", args)
				if (args.event != "SET_EXECUTION_PROCESS" ) console.log("onAny EVENT SERVER", event, args);
				const innerEvent = new Message(args, event).event;

				if (isLogable(innerEvent) && isLogable(event)) {
					this.log(
						namespace + "/Socket.OnAny" + "/" + innerEvent +
						`:> Broadcasting event: ${event} with data:`,
						args
					)
					socket.broadcast.emit(event, args);
				}
			});
		}

	}

	onDisconnect(namespace: string, socket: Socket, reason: any) {


		const roomsids: string[] = []
		for(const r of this.rooms.keys()) {
			if (this.rooms.get(r) === socket.id) {
				roomsids.push(r)
			}
		}

		console.log("--> Deleting rooms", roomsids)
		roomsids.forEach(s => this.roomsSockets.delete(s))
		roomsids.forEach(s => this.rooms.delete(s))

		this.log(
			(namespace || "--") + ".onDisconnect." + this.socketName(socket)
			+ ": [" + reason + "] " +
		  	(roomsids.length > 0 ? "Removed from masters of rooms: " + roomsids.length : "")
		);
		this.sockets.delete(socket.id);
	}

	onClientRegister(namespace: string, socket: Socket, args: IUserDetails) {

		this.log(namespace + ".onClientRegister: " +
			"N/S [" + args.usuario + args.sesion + "][" + socket.id + "]");

		args.name = args.usuario + args.sesion
		this.sockets.set(socket.id, args as IUserDetails);

	}

	onClientSuscribe(namespace: string, socket: Socket, args: SuscriptionDetails) {

		const message = namespace + ".onClientSuscribe." +
		this.sockets.get(socket.id)?.name || "El socket no se ha registrado: " + socket.id;
		if (args.out) {
			socket.leave(args.room);
			this.purgarSocketDeRoom(socket.id, args.room)
		} else {
			socket.join(args.room);
			const sockets = this.roomsSockets.get(args.room) || []
			sockets.push(socket.id)
			this.roomsSockets.set(args.room, sockets)
			console.log("JOIN ROOM:>", args)
		}
		this.log(
			message + ": " +
			(args.out ? "leaved" : "joined") +
			" [" + args.room + "]"
		)

	}

	purgarSocketDeRoom(socketId: string, roomId: string) {
		const sockets = (this.roomsSockets.get(roomId) || [])
		const i = sockets.findIndex(s => s == socketId)
		if (i > - 1) {
			sockets.splice(i, 1)
			this.roomsSockets.set(roomId, sockets)
		}
	}

	onRoomMessage(namespace: string, socket: Socket, args: RoomDetails) {

		const message = namespace + ".onRoomMessage." +
			this.socketName(socket) +
			": " + args.room + "/" + args.event;
		if (args.event != "SET_EXECUTION_PROCESS" ) this.log(args.event);

		const argsMeta = { ...args, namespace, socket};

		if (!args.room) {
			this.log("Warning!!!! onRoomMessage. Missing room. Args", args)
		}

		/*
			COMMUNICATION WITH SERVER
		*/
		switch(args.event) {
			case "GET_SERVER_STATE": {
				this.broadcastServerState("SET_SERVER_STATE", argsMeta);
				return;
			}
			case "SET_SERVER_STATE": {
				this.log("Warning!!!! onRoomMessage. THIS EVENT SHOULD NOT BE FIRED", args)
				return;

			}
		}

		/*
			COMMUNICATION BETWEEN PEER FOLLOWING MASTER-ROOM PROTOCOL
		*/
		const isGETTER = args.event?.substring(0, 4) == "GET_";
		if (isGETTER) {
			this.forwardRequestToMaster(argsMeta)
			return;
		}

		const isSETTER = args.event?.substring(0, 4) == "SET_";
		if (isSETTER) {
			this.forwardAnswerToRequester(argsMeta)
			return;
		}

		switch(args.event) {
			case "MAKE_MASTER": {
				this.declareMasterOfARoom(argsMeta)
				break;
			}
			default: {
				this.braodcast(argsMeta)
			}
		}

	}

	socketName(socket: Partial<Socket>): string {
		if (!socket.id) return "<-->";
		return (this.sockets.get(socket.id)?.name) || "--"
	}

	startPing() {
		setInterval(() => {
			console.log("PingInterval", 5000)
			const namespaces: NamespaceDetails[] = [];

			this.io._nsps.forEach((namespace) => {

				const sockets: Partial<Socket>[] = [];
				for(const s of namespace.sockets.values()) {
					sockets.push({
						id: s.id
					});
				}

				namespaces.push({
					name: namespace.name,
					socketsCount: namespace.sockets.size,
					sockets: JSON.parse(JSON.stringify(sockets))
				});
			});

			const state = {
				socketId: 0,
				clientId: 0,
				socketsPerNamespace: namespaces,
				clients: this.io.engine?.clientsCount
			}
			this.io.emit("Server_State", state);
		}, 30000)
	}

	getNamespacesList(): INamespaceDetails[] {

		const namespaces: INamespaceDetails[] = [];

		this.io._nsps.forEach((namespace) => {

			const sockets: ISocketDetails[] = [];
			for(const s of namespace.sockets.values()) {
				sockets.push({
					id: "/" + this.socketName(s)
				});
			}

			namespaces.push({
			  name: namespace.name,
			  socketsCount: namespace.sockets.size,
			  sockets
			});

		});
		return namespaces;

	}

	broadcastServerState(event: string, arg: ArgsMeta) {

		const rooms: IRoomDetails[] = []
		for(let r of this.roomsSockets.keys()) {
			const sid = this.roomsSockets.get(r)
			if (sid) {
				const miembros: IUserDetails[] = sid.map(s => this.sockets.get(s)).filter((s): s is IUserDetails => s != undefined);
				rooms.push({
					roomId: r,
					miembros
				})
			}
		}

		const socketUsers: IUserDetails[] = []
		for(let r of this.sockets.keys()) {
			const sid = this.sockets.get(r)
			if (sid) {
				socketUsers.push(sid)
			}
		}
		const miembros: IUserDetails[] = socketUsers.reduce((ac, cu) => {

			const exists = ac.find((a: IUserDetails) => a.usuario == cu.usuario)
			if (exists) {
				exists.sesiones?.push(cu.sesion || "")
			} else {
				ac.push({
					usuario: cu.usuario,
					sesiones: [cu.sesion || ""]
				})
			}
			return ac
		}, [] as IUserDetails[])

		const state: IServerState = {
			action: event,
			socketId: arg.socket.id,
			clientId: (arg.socket?.client as any)?.id,
			socketsPerNamespace: this.getNamespacesList(),
			clients: this.io.engine?.clientsCount,
			miembros,
			rooms,
			sockets: []
		}

		arg.socket.emit(event, state);
		this.log(
			arg.namespace + ".onLogServerState." + this.socketName(arg.socket)
			+ ": " + arg.room + "/" + event);
	}

	log(message: string, data: any = undefined) {

		console.log(new Date(), "-",
			this.name + ":> ",
			message,
			data ? data : ""
		);

	}

	ioG(namespace: string): Namespace | undefined {

		return this.namespaces.get(namespace);
	}

	/*
		Will attach this socket to args.room, any topic prefixed with GET_<topic>
		will be forwarded to master who will notify to same topic but SET_<topic>
	*/
	declareMasterOfARoom(args: ArgsMeta) {
		this.log(args.namespace + ".OnMakeMaster." +
			this.socketName(args.socket) + ": Is now master of: " + args.namespace + "/" + args.room)
		console.log("Features:>", args.data)
		this.rooms.set(args.room, args.socket.id);
	}

	/**
	 * If master has register in this room, it will receive the request
	 */
	forwardRequestToMaster(args: ArgsMeta) {
		console.log("forwardRequestToMaster" /*, args*/)
		const master = this.rooms.get(args.room);
		if (master) {
			this.log(args.namespace + ".OnGet." + this.socketName(args.socket) +
				": forward>>" + args.room + "/" + args.event + "/" +
				this.socketName({ id: master }))
			const requesterData: any = {
				...args,
				requester: args.socket.id,
				requesterName: this.socketName(args.socket)
			}
			delete requesterData?.socket
			args.socket.to(master).emit(args.event, requesterData);
		} else {
			this.log(args.namespace + ".onRoomMessage: WARNING! No GET/SET agent at room: [" + args.room + "]")
		}

	}

	/**
	 * if (ars.requester, the messabe will be broadcast to args.room)
	 */
	forwardAnswerToRequester(args: ArgsMeta) {
		console.log("forwardAnswerToRequester", args.room, args.event /*, args.data*/)
		// this.log("Resolving SETTER... has receiver? " + this.socketName({ id: args.requester}))
		let target = args.requester;
		const requesterData = {
			...args.data,
			sender: args.socket.id
		}

		// DEV-DISABLE
		target = "";
		if (target) {
			// SEND TO TARGET
			this.log(target +
				":> Resolving SETTER... master found, emit [" + args.event + "] TO!",
				this.socketName({ id: target }))
			args.socket.to(target).emit(args.event, requesterData);
		} else {
			// SEND TO ROOM
			console.log("Sent to room", args.room)
			args.socket.to(args.room).emit(args.event, requesterData);
		}
	}

	/**
	 * Broadcast to args.room in given namespace
	 */
	braodcast(args: ArgsMeta) {
		this.ioG(args.namespace)?.to(args.room).emit(args.event, args.data);
	}
}
