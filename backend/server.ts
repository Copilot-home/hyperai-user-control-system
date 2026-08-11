import express, { Request, Response } from 'express';
import { createServer, Server } from 'http';
import cors from 'cors';
import symphonyRoutes from './routes/symphony.routes';
import empathyRoutes from './routes/empathy.routes';
import vietnameseRoutes from './routes/vietnamese.routes';
import userRoutes from './routes/user.routes';
import notebookRoutes from './routes/notebooklm.routes';

const buildRuntimeCapabilities = () => ({
    status: 'ok',
    version: 'ts-candidate',
    message: 'Runtime capabilities mirror the canonical backend stub.',
    generated_at: new Date().toISOString(),
});

export const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (_req: Request, res: Response) => {
        res.status(200).json({
            status: 'OK',
            message: 'APO-NET Core Active',
        });
    });

    app.get('/api/runtime/capabilities', (_req: Request, res: Response) => {
        res.status(200).json(buildRuntimeCapabilities());
    });

    app.use('/api/symphony', symphonyRoutes);
    app.use('/api/empathy', empathyRoutes);
    app.use('/api/vietnamese', vietnameseRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/notebooklm', notebookRoutes);

    app.use((_req, res) => {
        res.status(404).json({ message: 'Not found' });
    });

    return app;
};

export const startServer = (port = Number(process.env.PORT || 5000)) => {
    const app = createApp();
    const server: Server = createServer(app);
    return server.listen(port, () => {
        console.log(`TS candidate server is running on port ${port}`);
    });
};

if (require.main === module && process.env.HYPERAI_TS_AUTOSTART !== '0') {
    startServer();
}
