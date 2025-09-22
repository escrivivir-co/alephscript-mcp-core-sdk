import { IUserDetails } from "@alephscript/types";
import { SocketClient } from "./SocketClient";

export class AlephScriptClient extends SocketClient {
  sus: string[] = [];
  disconnect() {
    this.sus = [];
    this.io.disconnect();
  }
  connect() {
    this.initTriggersDefinition.push(() => {
      const ROOM_NAME = this.name + "_ROOM";
      const REGISTER_PAYLOAD = {
        usuario: this.name,
        sesion: this.getHash("xS"),
      };
      this.io.emit("CLIENT_REGISTER", REGISTER_PAYLOAD as IUserDetails);
      this.io.emit("CLIENT_SUSCRIBE", { room: ROOM_NAME });
      this.room("MAKE_MASTER", { features: [] }, ROOM_NAME);
    });
  }

  run() {
    this.room("MAKE_MASTER", { features: ["kick-as-bot-feature-1"] });
    this.room(
      "MAKE_MASTER",
      { features: ["GET_LIST_OF_THREADS", "GET_ENGINE"] },
      "IDE-app"
    );

    this.sus.forEach((k) => this.io.off(k));
    this.io.on("GET_LIST_OF_THREADS", (...args) => {
      console.log(
        "Received (GET_LIST_OF_THREADS) from: " + args[0].requesterName
      );
    });

    this.io.on("SET_DOMAIN_BASE_DATA", (...args) => {
      const rData = args[0];
      console.log(this.name + ">> SET_DOMAIN_BASE_DATA ENGINE... to: ");
      const action = rData?.action;

      const engine = rData.engine;

      if (action == "SET_DATA") {
        const info = rData.blob;
        console.log("As master >>>> SETDATA", info);
      }
    });

    this.io.on("SET_MODEL_RPC_DATA", (...args) => {
      const rData = args[0];
      console.log(this.name + ">> SET_MODEL_RPC_DATA ENGINE... to: ", rData);
    });

    this.io.on("GET_ENGINE", (...args) => {
      const rData = args[0];
      console.log(this.name + ">> DO ENGINE... PAYLOAD >>: ");
    });
  }

  onMessage(arg0: (message: any) => void) {
    console.log("AlephScriptClient.onMessage");
  }

  broadcast(arg0: {
    type: string;
    event: string;
    data: any;
    timestamp: number;
  }) {
    console.log("broadcast");
  }

  getHash(key: string) {
    const l = (s: string) => s.substring(s.length - 2);
    const a = new Date().getTime().toString();
    const b = Math.random().toString();
    return key + ">" + l(a) + l(b);
  }
  constructor(
    public name = "AlephClient",
    public url: string = "http://localhost:3000",
    public namespace: string = "/",
    public autoConnect = true
  ) {
    super(name, url, namespace, autoConnect);
  }
}
