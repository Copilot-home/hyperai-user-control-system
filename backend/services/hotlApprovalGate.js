const fs = require('fs');
const path = require('path');

const queuePath = path.resolve(__dirname, '..', '..', '..', 'runtime', 'hotl-approval-queue.json');

const load = () => {
    try {
        if (!fs.existsSync(queuePath)) return { version: 1, requests: [] };
        const value = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        return value && Array.isArray(value.requests) ? value : { version: 1, requests: [] };
    } catch {
        return { version: 1, requests: [] };
    }
};

const save = (state) => {
    fs.mkdirSync(path.dirname(queuePath), { recursive: true });
    fs.writeFileSync(queuePath, JSON.stringify(state, null, 2) + '\n', 'utf8');
};

const now = () => new Date().toISOString();

const create = (input = {}) => {
    const state = load();
    const request = {
        request_id: input.request_id || ('hotl-' + Date.now()),
        mission_id: input.mission_id || null,
        task_id: input.task_id || null,
        title: input.title || 'Human approval required',
        summary: input.summary || 'The mission reached an authority boundary.',
        action: input.action || 'unknown',
        risk_class: input.risk_class || 'unknown',
        required_fields: Array.isArray(input.required_fields) ? input.required_fields : [],
        evidence: input.evidence || null,
        status: 'pending',
        created_at: now(),
        resolved_at: null,
        resolution: null,
    };
    state.requests.unshift(request);
    state.requests = state.requests.slice(0, 100);
    save(state);
    return request;
};

const pending = () => load().requests.filter((item) => item.status === 'pending');
const resolve = (requestId, decision, operator = 'human-on-the-loop') => {
    const state = load();
    const request = state.requests.find((item) => item.request_id === requestId);
    if (!request) return null;
    if (request.status !== 'pending') return request;
    const normalized = decision === 'approve' || decision === 'reject' ? decision : null;
    if (!normalized) throw new Error('Decision must be approve or reject.');
    request.status = normalized === 'approve' ? 'approved' : 'rejected';
    request.resolution = { decision: normalized, operator, at: now() };
    request.resolved_at = request.resolution.at;
    save(state);
    return request;
};

const get = (requestId) => load().requests.find((item) => item.request_id === requestId) || null;

module.exports = {
    queuePath,
    create,
    pending,
    resolve,
    get,
};
