import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';

const router = Router();

// Lấy danh sách missions (stub)
router.get('/missions', (req: Request, res: Response) => {
    res.json({
        generated_at: new Date().toISOString(),
        bindings: []
    });
});

// Nhận 1 mission từ giao diện UI và kích hoạt OODA Loop thực sự!
router.post('/missions', (req: Request, res: Response) => {
    const { task, mission_type, prompt } = req.body;
    
    // Nếu payload gửi lên có task, hoặc prompt, lấy cái đó làm mô tả nhiệm vụ
    const taskDescription = task || prompt || "Mission không xác định";
    
    console.log(`[Workspace API] Nhận được Mission mới: "${taskDescription}"`);
    console.log(`[Workspace API] Kích hoạt True Autonomous OODA Loop...`);
    
    // Đường dẫn tuyệt đối trỏ về tools/hyperai_ooda_loop.py ở thư mục gốc
    const workspaceRoot = path.resolve(__dirname, '../../../'); 
    const oodaLoopPath = path.join(workspaceRoot, 'tools', 'hyperai_ooda_loop.py');
    
    // Spawn tiến trình OODA Loop
    const command = `python "${oodaLoopPath}" --task "${taskDescription}" --once`;
    
    exec(command, { cwd: workspaceRoot }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[OODA Error]: ${error.message}`);
            return res.status(500).json({ status: 'error', message: error.message });
        }
        
        console.log(`[OODA Output]: ${stdout}`);
        
        res.json({
            status: 'success',
            mission_id: `mission-${Date.now()}`,
            message: 'OODA Loop hoàn tất',
            output: stdout
        });
    });
});

// Các stub khác để app UI không bị crash
router.get('/session', (req: Request, res: Response) => res.json({ id: 'local-session' }));
router.get('/graph', (req: Request, res: Response) => res.json({ nodes: [] }));
router.get('/lanes', (req: Request, res: Response) => res.json({ lanes: [] }));
router.get('/runtimes', (req: Request, res: Response) => res.json({ runtimes: [] }));
router.get('/connectors', (req: Request, res: Response) => res.json({ connectors: [] }));
router.get('/proof', (req: Request, res: Response) => res.json({ proof_valid: true }));
router.get('/providers', (req: Request, res: Response) => res.json({ active_providers: [] }));

export default router;
