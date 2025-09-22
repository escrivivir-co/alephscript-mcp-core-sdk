import { IUserDetails, roomId } from "./IUserDetails";

export interface IRoomDetails {
	roomId: roomId;
	miembros: IUserDetails[];
}
