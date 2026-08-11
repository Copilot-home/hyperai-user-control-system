import { Server } from 'socket.io';

const symphonySocket = (server) => {
    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('A user connected to the symphony socket');

        // Handle incoming messages from clients
        socket.on('symphonyMessage', (data) => {
            console.log('Received symphony message:', data);
            // Process the message and emit a response
            io.emit('symphonyResponse', { message: 'Message received', data });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected from the symphony socket');
        });
    });

    return io;
};

export default symphonySocket;