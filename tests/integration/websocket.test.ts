import { WebSocket } from 'ws';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('WebSocket Integration Tests', () => {
    let socket: WebSocket;

    beforeAll((done) => {
        socket = new WebSocket('ws://localhost:8000/symphony/live');

        socket.on('open', () => {
            done();
        });
    });

    afterAll((done) => {
        socket.close();
        done();
    });

    it('should connect to the WebSocket server', () => {
        expect(socket.readyState).toBe(WebSocket.OPEN);
    });

    it('should receive live data from the server', (done) => {
        socket.on('message', (data) => {
            const parsedData = JSON.parse(data.toString());
            expect(parsedData).toHaveProperty('timestamp');
            expect(parsedData).toHaveProperty('empathy_pulse');
            expect(parsedData).toHaveProperty('factory_metrics');
            done();
        });
    });

    it('should handle errors gracefully', (done) => {
        socket.on('error', (error) => {
            expect(error).toBeUndefined();
            done();
        });
    });
});