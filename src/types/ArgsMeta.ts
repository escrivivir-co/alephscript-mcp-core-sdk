import { Socket } from "socket.io";
import { RoomDetails } from "./RoomDetails";

export interface ArgsMeta extends RoomDetails {
	namespace: string;
	socket: Socket;
}
