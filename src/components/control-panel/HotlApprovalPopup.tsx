import React, { useEffect, useState } from 'react';
import { decideHotlApproval, getHotlApprovals, HotlApprovalRequest } from '../../services/api/hotlApprovalAPI';
import styles from './HotlApprovalPopup.module.css';

const POLL_MS = 2000;

export const HotlApprovalPopup: React.FC = () => {
    const [request, setRequest] = useState<HotlApprovalRequest | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        try {
            const pending = await getHotlApprovals();
            setRequest(pending[0] || null);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Approval channel unavailable.');
        }
    };

    useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => void refresh(), POLL_MS);
        return () => window.clearInterval(timer);
    }, []);

    const decide = async (decision: 'approve' | 'reject') => {
        if (!request || busy) return;
        setBusy(true);
        try {
            await decideHotlApproval(request.request_id, decision);
            setRequest(null);
            setError(null);
            await refresh();
        } catch (decisionError) {
            setError(decisionError instanceof Error ? decisionError.message : 'Approval decision failed.');
        } finally {
            setBusy(false);
        }
    };

    if (!request) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="hotl-approval-title">
            <div className={styles.card}>
                <div className={styles.badge}>HUMAN GATE</div>
                <h2 id="hotl-approval-title">{request.title}</h2>
                <p className={styles.summary}>{request.summary}</p>
                <div className={styles.meta}>
                    <span>Risk: {request.risk_class}</span>
                    <span>Action: {request.action}</span>
                    {request.mission_id && <span>Mission: {request.mission_id}</span>}
                    {request.task_id && <span>Task: {request.task_id}</span>}
                </div>
                {request.required_fields.length > 0 && (
                    <div className={styles.fields}>
                        <strong>Needs confirmation</strong>
                        <ul>{request.required_fields.map((field) => <li key={field}>{field}</li>)}</ul>
                    </div>
                )}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                    <button type="button" className={styles.reject} onClick={() => void decide('reject')} disabled={busy}>
                        NO
                    </button>
                    <button type="button" className={styles.approve} onClick={() => void decide('approve')} disabled={busy}>
                        YES
                    </button>
                </div>
                <div className={styles.footer}>Agent pauses here. Your click becomes the authorization receipt.</div>
            </div>
        </div>
    );
};

export default HotlApprovalPopup;
