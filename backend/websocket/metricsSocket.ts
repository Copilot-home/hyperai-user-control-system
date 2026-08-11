import { Server } from "socket.io";

const metricsSocket = (server) => {
    const io = new Server(server);

    io.on("connection", (socket) => {
        console.log("New metrics socket connection");

        // Emit metrics data to the client every 5 seconds
        const metricsInterval = setInterval(() => {
            const metricsData = {
                timestamp: new Date().toISOString(),
                // Add your metrics data here
                cpuUsage: process.cpuUsage(),
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
            };
            socket.emit("metricsUpdate", metricsData);
        }, 5000);

        socket.on("disconnect", () => {
            console.log("Metrics socket disconnected");
            clearInterval(metricsInterval);
        });
    });
};

export default metricsSocket;