export interface HotlApprovalRequest {
    request_id: string;
    mission_id: string | null;
    task_id: string | null;
    title: string;
    summary: string;
    action: string;
    risk_class: string;
    required_fields: string[];
    evidence?: unknown;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    resolved_at: string | null;
    resolution: { decision: string; operator: string; at: string } | null;
}

const json = async (response: Response) => {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${response.status}`);
    }
    return response.json();
};

export const getHotlApprovals = async (): Promise<HotlApprovalRequest[]> => {
    const response = await fetch('/api/hotl/approvals');
    const payload = await json(response);
    return payload.requests || [];
};
export const decideHotlApproval = async (requestId: string, decision: 'approve' | 'reject') => {
    const response = await fetch(`/api/hotl/approvals/${encodeURIComponent(requestId)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, operator: 'human-on-the-loop' }),
    });
    return json(response) as Promise<HotlApprovalRequest>;
};
