import { Socket } from "socket.io";

export type NamespaceDetails = {
	name: string;
	socketsCount: number;
	sockets: Partial<Socket>[];
};
