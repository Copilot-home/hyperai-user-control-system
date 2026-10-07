const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/workspace/missions', (req, res) => {
    const { task, mission_type } = req.body;
    const taskDescription = task || "Nhiệm vụ không xác định";
    
    console.log(`\n======================================================`);
    console.log(`[Backend API] Nhận được Mission từ UI: "${taskDescription}"`);
    console.log(`[Backend API] Đang kích hoạt HyperAI OODA Loop...`);
    console.log(`======================================================\n`);
    
    const workspaceRoot = path.resolve(__dirname, '../../'); 
    const oodaLoopPath = path.join(workspaceRoot, 'tools', 'hyperai_ooda_loop.py');
    
    const process = spawn('python', [oodaLoopPath, '--task', taskDescription, '--once'], { cwd: workspaceRoot });
    
    let output = '';
    process.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`[OODA] ${data}`);
    });
    
    process.stderr.on('data', (data) => {
        console.error(`[OODA Error] ${data}`);
    });
    
    process.on('close', (code) => {
        console.log(`[Backend API] OODA Loop hoàn tất với mã ${code}`);
        res.json({
            status: 'success',
            mission_id: `mission-${Date.now()}`,
            output: output
        });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🔥 Mission API Server đang chạy tại http://127.0.0.1:${PORT}`);
});
