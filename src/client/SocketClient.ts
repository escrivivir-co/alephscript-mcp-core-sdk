import { EventEmitter } from 'events';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { HandshakeAuth } from '../types/auth';
import { isLogable, Message } from '../utils';
import { getHash, IUserDetails } from '../types';

export interface SocketClientOptions {
	autoConnect?: boolean;
	auth?: HandshakeAuth | (() => HandshakeAuth | Promise<HandshakeAuth>);
	extraHeaders?: Record<string, string>;
	transports?: Array<'websocket' | 'polling'>;
	path?: string;
	withCredentials?: boolean;
	reconnection?: boolean;
	reconnectionAttempts?: number;
	reconnectionDelayMax?: number;
	timeout?: number;
}

type SocketIoClientOptions = Partial<ManagerOptions & SocketOptions>;

function isSocketClientOptions(value: boolean | SocketClientOptions | undefined): value is SocketClientOptions {
	return typeof value === 'object' && value !== null;
}

function normalizeClientOptions(optsOrAutoConnect?: boolean | SocketClientOptions): SocketClientOptions {
	if (isSocketClientOptions(optsOrAutoConnect)) {
		return optsOrAutoConnect;
	}

	return {
		autoConnect: optsOrAutoConnect ?? true
	};
}

function normalizeClientAuth(
	auth?: HandshakeAuth | (() => HandshakeAuth | Promise<HandshakeAuth>)
): SocketIoClientOptions['auth'] {
	if (!auth) {
		return undefined;
	}

	if (typeof auth !== 'function') {
		return auth;
	}

	return (callback) => {
		Promise.resolve(auth())
			.then((value) => callback(value ?? {}))
			.catch((error) => {
				console.warn('⚠️ SocketClient auth provider failed:', error);
				callback({});
			});
	};
}

function buildSocketOptions(options: SocketClientOptions): SocketIoClientOptions {
	return {
		autoConnect: options.autoConnect ?? true,
		auth: normalizeClientAuth(options.auth),
		extraHeaders: options.extraHeaders,
		transports: options.transports,
		path: options.path,
		withCredentials: options.withCredentials,
		reconnection: options.reconnection,
		reconnectionAttempts: options.reconnectionAttempts,
		reconnectionDelayMax: options.reconnectionDelayMax,
		timeout: options.timeout
	};
}

function isAuthLikeErrorMessage(message: string | undefined): boolean {
	if (!message) {
		return false;
	}

	return /unauthorized|auth|room not allowed/i.test(message);
}

export class SocketClient extends EventEmitter {

	public io: Socket;
	public options: SocketClientOptions;

	initTriggers: (() => void)[] = [];
	initTriggersDefinition: (() => void)[] = [];

	interval: any;

	configurationSet = false;
	protected skipDefaultBootstrap = false;

	constructor(
		public name = "AlephClient",
		public url: string = "http://localhost:3000",
		public namespace: string = "/",
		optsOrAutoConnect: boolean | SocketClientOptions = true,
	) {
		super();

		this.options = normalizeClientOptions(optsOrAutoConnect);
		this.skipDefaultBootstrap = Boolean(this.options.auth);

		this.io = io(url + namespace, buildSocketOptions(this.options));

		this.io.on("connect", () => {
			this.emit('connect', this.io.id);

			this.log((namespace || "--") + ".onConnect: ", "S: " +
				this.io.id + ":> Init Ts: " + this.initTriggersDefinition.length)

			// if (this.configurationSet) return;
			this.configurationSet = true;

			this.initTriggers = [...this.initTriggersDefinition];

			this.interval = setInterval(() => {

				while (this.initTriggers.length > 0) {
					const f = this.initTriggers.pop();
					if (f) f();
				};

			}, 1000)

			this.io.onAny((event, ...args: any) => {

				// console.log(event);

				const innerEvent = new Message(args, event).event;

				switch(event) {
					case "room_joined":
					case "room_left":
						console.log("socket-client", event, args)
						this.log(
							`${event}:> ${namespace}/${innerEvent}`
						)
						return;
					default:
				}
				if (!isLogable(innerEvent)) return;
				if (!isLogable(event)) return;

				/* this.log(
					namespace + "/Socket.OnAny" + "/" + innerEvent +
					`:> ${event} with data:`,
					args
				) */
			});

			if (!this.skipDefaultBootstrap) {
				this.io.emit("CLIENT_REGISTER", { usuario: this.name, sesion: getHash("") } as IUserDetails);
				this.io.emit("CLIENT_SUSCRIBE", { room: "ENGINE_THREADS" });
			}
		});

		this.io.on('auth_error', (payload) => {
			this.emit('auth_error', payload);
		});

		this.io.on("disconnect", () => {

			this.log("OnDisconnect");
			clearInterval(this.interval);
			this.emit('disconnect');
		});

		this.io.on("connect_error", (error) => {
			this.log("Error de conexión:", error.message);
			this.emit('connect_error', error);
			if (isAuthLikeErrorMessage(error.message)) {
				this.emit('auth_error', {
					message: error.message,
					error
				});
			}
		});

		this.io.on("connect_timeout", () => {
			this.log("Tiempo de conexión excedido");
			this.emit('connect_timeout');
		});

		this.io.on("reconnect", (attemptNumber) => {
			this.log("Reconectado al servidor en el intento:", attemptNumber);
			this.emit('reconnect', attemptNumber);
		});

		this.io.on("reconnect_attempt", (attemptNumber) => {
			this.log("Intento de reconexión:", attemptNumber);
			this.emit('reconnect_attempt', attemptNumber);
		});

		this.io.on("reconnecting", (attemptNumber) => {
			this.log("Intentando reconectar:", attemptNumber);
			this.emit('reconnecting', attemptNumber);
		});

		this.io.on("reconnect_error", (error) => {
			this.log("Error al reconectar:", error);
			this.emit('reconnect_error', error);
		});

		this.io.on("ping", () => {
			this.log("Ping enviado al servidor");
			this.emit('ping');
		});

		this.io.on("pong", (latency) => {
			this.log("Pong recibido del servidor, latencia:", latency);
			this.emit('pong', latency);
		});

		// this.io.connect();

		this.log("Conectando al backend...")
	}

	log(message: string, data: any = undefined) {
		console.log("\t -", this.name + ":>", message, data ? data : "");
	}

	room(event: string, data: any = {}, room: string = "ENGINE_THREADS") {

		// if (event != "SET_EXECUTION_PROCESS") console.log("Doing emit", event, room, data)
		this.io.emit(
			"ROOM_MESSAGE",
			{
				event,
				room,
				data
			}
		);
	}

	roomP(payload: any) {
		this.io.emit(
			"ROOM_MESSAGE",
			payload
		);
	}
}
