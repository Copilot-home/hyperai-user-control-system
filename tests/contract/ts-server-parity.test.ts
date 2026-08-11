import request from 'supertest';
import { createApp } from '../../backend/server';
import parity from '../../backend/contracts/server-parity.json';

type EndpointSpec = {
    path: string;
    method: string;
    status: number;
    expectedKeys: string[];
};

describe('TypeScript server smoke parity', () => {
    const app = createApp();

    (parity.endpoints as EndpointSpec[]).forEach((endpoint) => {
        const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';

        it(`${endpoint.method} ${endpoint.path} matches parity contract`, async () => {
            const builder = (request(app)[method] as any)(endpoint.path);
            const response = await (endpoint.method === 'POST' ? builder.send({}) : builder);
            expect(response.status).toBe(endpoint.status);
            expect(Object.keys(response.body)).toEqual(expect.arrayContaining(endpoint.expectedKeys));
        });
    });
});
