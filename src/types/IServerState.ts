import { Socket } from "socket.io-client";
import { IRoomDetails } from "./IRoomDetails";
import { IUserDetails } from "./IUserDetails";
import { INamespaceDetails } from "./INamespaceDetails";

export interface IServerState {
	action: string;
	socketId: string;
	clientId: string;
	socketsPerNamespace: INamespaceDetails[];
	sockets: Partial<Socket>[];
	clients: number;
	miembros: IUserDetails[];
	rooms: IRoomDetails[];
}
