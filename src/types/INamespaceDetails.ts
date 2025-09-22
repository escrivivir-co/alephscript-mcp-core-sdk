import { Socket } from "socket.io-client";
import { ISocketDetails } from "./ISocketDetails";

export type INamespaceDetails = {
	name: string;
	socketsCount: number;
	sockets: ISocketDetails[];
};
