import request from 'supertest';
import { app } from '../../src/main'; // Adjust the import based on your app's entry point

describe('API Integration Tests', () => {
    it('should return the health check status', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should process empathy request', async () => {
        const response = await request(app)
            .post('/empathy/process')
            .send({
                message: 'Hello, how are you?',
                context: {},
                frequency: 269,
                cultural_mode: 'vietnamese',
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('empathy_score');
    });

    it('should analyze Vietnamese text', async () => {
        const response = await request(app)
            .post('/vietnamese/analyze')
            .send({
                text: 'Xin chào',
                analysis_type: 'full',
                include_cultural_context: true,
                include_traditional_wisdom: true,
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('original_text', 'Xin chào');
    });

    it('should get symphony status', async () => {
        const response = await request(app).get('/symphony/status');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('empathy_circulation');
    });

    it('should generate cultural content', async () => {
        const response = await request(app)
            .post('/cultural/generate')
            .send({
                prompt: 'Write a poem about Vietnam',
                cultural_style: 'traditional',
                empathy_level: 'high',
                target_audience: 'enterprise',
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('generated_content');
    });
});