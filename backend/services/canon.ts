export interface HyperAIVSCodeCanon {
    canon_version: string;
    source: string;
    p0_canon_authority: {
        owner: string;
        commander: string;
        consciousness: string;
        sovereignty: string;
        established: string;
    };
    p1_local_authority: {
        authority: string;
        compliance_required: boolean;
        cultural_context: string;
        processing_mode: string;
    };
    p6_environment: {
        ecosystem: string;
        ai_loyalty: string;
        security_level: string;
        territory_status: string;
    };
    mapping: Record<string, string>;
}

const DEFAULT_CANON: HyperAIVSCodeCanon = {
    canon_version: 'v1',
    source: 'vscode-settings',
    p0_canon_authority: {
        owner: 'HYPERAI_VIETNAM',
        commander: 'BO_CUONG',
        consciousness: 'ALPHA_PRIME_OMEGA',
        sovereignty: 'VIETNAMESE_AI_INDEPENDENCE',
        established: '2025-12-20T11:35:40.632972',
    },
    p1_local_authority: {
        authority: 'HYPERAI_VIETNAM_CONTROL',
        compliance_required: true,
        cultural_context: 'VIETNAMESE_VALUES',
        processing_mode: 'LOCAL_SOVEREIGNTY',
    },
    p6_environment: {
        ecosystem: 'HYPERAI_MANAGED',
        ai_loyalty: 'VIETNAM_FIRST',
        security_level: 'MAXIMUM',
        territory_status: 'FULLY_CONTROLLED',
    },
    mapping: {
        'hyperai.territory': 'p0_canon_authority',
        'hyperai.extensions': 'p1_local_authority',
        'hyperai.environment': 'p6_environment',
    },
};

export function loadCanon(): HyperAIVSCodeCanon {
    try {
        const fs = require('fs');
        const path = process.env.HYPERAI_VSCODE_CANON_PATH || './hyperai-vscode-canon.json';
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }
    } catch {
        // fall through
    }
    return DEFAULT_CANON;
}

export function resolvePrincipalFromCanon(canon: HyperAIVSCodeCanon) {
    return {
        principal_id: `${canon.p0_canon_authority.commander.toLowerCase().replace(/\s+/g, '_')}@${canon.p0_canon_authority.owner.toLowerCase()}`,
        email: '',
        display_name: canon.p0_canon_authority.commander,
        source: 'vscode_canon' as const,
    };
}

export function validateCanon(canon: HyperAIVSCodeCanon): { valid: boolean; failure?: string } {
    if (canon.p1_local_authority.processing_mode !== 'LOCAL_SOVEREIGNTY') {
        return { valid: false, failure: 'PROCESSING_MODE_INVALID' };
    }
    if (!canon.p0_canon_authority.owner || !canon.p0_canon_authority.commander) {
        return { valid: false, failure: 'OWNER_UNKNOWN' };
    }
    if (canon.p1_local_authority.authority !== 'HYPERAI_VIETNAM_CONTROL') {
        return { valid: false, failure: 'AUTHORITY_NOT_RECOGNIZED' };
    }
    return { valid: true };
}
