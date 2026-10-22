// @ts-nocheck
import React from 'react';
import { useSymphonyContext } from '../../contexts/SymphonyContext';

export const EmpathyLiveFeed: React.FC = () => {
    const { symphonyState, liveData, wsConnected } = useSymphonyContext();

    return (
        <div className="card empathy-live-feed">
            <h2>🇻🇳 Empathy Symphony Live</h2>
            <div className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
                {wsConnected ? '🟢 WebSocket Connected (269Hz)' : '🔴 WebSocket Disconnected'}
            </div>
            
            <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="metric-box" style={{ padding: '1rem', background: 'var(--surface-color, #1e1e1e)', borderRadius: '8px' }}>
                    <h3>Tần số Cảm xúc (Hz)</h3>
                    <div className="value" style={{ fontSize: '2rem', color: '#00ff9d' }}>{symphonyState.frequency || 269}</div>
                </div>
                <div className="metric-box" style={{ padding: '1rem', background: 'var(--surface-color, #1e1e1e)', borderRadius: '8px' }}>
                    <h3>Broadcasts Ca Dao</h3>
                    <div className="value" style={{ fontSize: '2rem', color: '#00ff9d' }}>{symphonyState.ca_dao_broadcasts || 0}</div>
                </div>
            </div>

            {liveData?.ca_dao_broadcast && (
                <div className="ca-dao-broadcast" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '4px solid #00ff9d', background: 'rgba(0, 255, 157, 0.1)' }}>
                    <h3>📜 Ca Dao / Tục Ngữ Mới Nhất</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '1.1rem', marginTop: '0.5rem' }}>"{liveData.ca_dao_broadcast}"</p>
                </div>
            )}
            
            {liveData?.factory_metrics && (
                <div className="factory-metrics" style={{ marginTop: '1.5rem' }}>
                    <h3>Thông số Engine</h3>
                    <pre style={{ background: '#111', padding: '1rem', borderRadius: '4px', overflowX: 'auto', fontSize: '0.9rem' }}>
                        {JSON.stringify(liveData.factory_metrics, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};
