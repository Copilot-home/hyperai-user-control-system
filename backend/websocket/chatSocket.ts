import { Server } from "socket.io";

const chatSocket = (server) => {
    const io = new Server(server);

    io.on("connection", (socket) => {
        console.log("A user connected");

        socket.on("joinChat", (room) => {
            socket.join(room);
            console.log(`User joined room: ${room}`);
        });

        socket.on("sendMessage", (message) => {
            io.to(message.room).emit("receiveMessage", message);
            console.log("Message sent:", message);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    return io;
};

export default chatSocket;