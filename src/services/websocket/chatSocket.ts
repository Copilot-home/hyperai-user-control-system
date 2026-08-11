import { io } from "socket.io-client";
import { runtimeConfig } from '../runtimeConfig';

const CHAT_SERVER_URL = runtimeConfig.socketNamespace('/chat');
const CHAT_SOCKET_RUNTIME_ENABLED =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ENABLE_WEBSOCKET_RUNTIME === 'true';

class ChatSocket {
    private socket: SocketIOClient.Socket;

    constructor() {
        this.socket = io(CHAT_SERVER_URL, { autoConnect: false });
        if (CHAT_SOCKET_RUNTIME_ENABLED) {
            this.socket.connect();
            this.initializeListeners();
        }
    }

    private initializeListeners() {
        this.socket.on("connect", () => {
            console.log("Connected to chat server");
        });

        this.socket.on("disconnect", () => {
            console.log("Disconnected from chat server");
        });

        this.socket.on("message", (message: string) => {
            console.log("New message received:", message);
            // Handle incoming message
        });

        this.socket.on("error", (error: string) => {
            console.error("Chat socket error:", error);
        });
    }

    public sendMessage(message: string) {
        if (!CHAT_SOCKET_RUNTIME_ENABLED) {
            return;
        }
        this.socket.emit("message", message);
    }

    public onMessage(callback: (message: string) => void) {
        if (!CHAT_SOCKET_RUNTIME_ENABLED) {
            return;
        }
        this.socket.on("message", callback);
    }

    public disconnect() {
        this.socket.disconnect();
    }
}

export default new ChatSocket();
