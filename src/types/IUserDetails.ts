import { ISocketDetails } from "./ISocketDetails";

export type masterSocketId = string;
export type roomId = string;
export type socketId = string;
export type namespaceId = string;

export interface IUserDetails extends ISocketDetails {
	usuario: string;
	sesion?: string;
	sesiones?: string[]
}

export function getHash(key: string) {

	const l = (s: string) => s.substring(s.length - 2)
	const a = new Date().getTime().toString()
	const b = Math.random().toString()
	return key + ">" + l(a) + l(b)
}
