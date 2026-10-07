export interface LocalPrincipal {
    principal_id: string;
    email: string;
    display_name: string;
    source: 'ui_session' | 'local_binding' | 'runtime_fallback';
}

export interface LocalAuthority {
    principal_id: string;
    role: 'LOCAL_DEVELOPER';
    scope: 'HOME_CLOUD_LOCAL';
    bound_at: string;
}

export type FailureCode =
    | 'UNKNOWN_PRINCIPAL'
    | 'AUTHORITY_NOT_BOUND'
    | 'CAPABILITY_NOT_IMPLEMENTED'
    | 'CAPABILITY_NOT_AVAILABLE'
    | 'SESSION_INVALID'
    | 'ADMISSION_REJECTED'
    | 'CANON_NOT_FOUND'
    | 'OWNER_UNKNOWN'
    | 'AUTHORITY_NOT_RECOGNIZED'
    | 'PROCESSING_MODE_INVALID';

export interface CapabilityResult {
    capabilities: string[];
    requested: string[];
    dropped: Array<{ capability: string; reason: FailureCode }>;
}

const PLUS_FEATURES = ['chat', 'models'];
const PRO_FEATURES = [...PLUS_FEATURES, 'agents', 'tools'];
const BUSINESS_FEATURES = [...PRO_FEATURES, 'workspaces'];
const ADMIN_FEATURES = [...BUSINESS_FEATURES, 'admin_controls'];
const DEVELOPER_FEATURES = [
    ...ADMIN_FEATURES,
    'developer_controls',
    'runtime_config',
    'capability_management',
];

const PROFILE_FEATURES: Record<string, string[]> = {
    PLUS: PLUS_FEATURES,
    PRO: PRO_FEATURES,
    BUSINESS: BUSINESS_FEATURES,
    ADMIN: ADMIN_FEATURES,
    DEVELOPER: DEVELOPER_FEATURES,
};

// Build availability: which capabilities have code present
const IMPLEMENTED_CAPABILITIES: string[] = [
    'chat',
    'models',
    'agents',
    'tools',
    'workspaces',
    'admin_controls',
    'developer_controls',
    'runtime_config',
    'capability_management',
];

// Runtime availability: which capabilities are currently live
let runtimeAvailable: string[] = [];

export function resolvePrincipal(source: any): LocalPrincipal | null {
    if (!source) return null;

    const email = source.email || source.username || '';
    const display = source.name || source.username || 'operator';
    const id = source.id || source.userId || `local-${Date.now()}`;

    if (!email && !display) return null;

    return {
        principal_id: String(id),
        email: String(email),
        display_name: String(display),
        source: source.email ? 'ui_session' : 'runtime_fallback',
    };
}

export function resolveAuthority(principal_id: string): LocalAuthority | null {
    if (!principal_id) return null;
    return {
        principal_id,
        role: 'LOCAL_DEVELOPER',
        scope: 'HOME_CLOUD_LOCAL',
        bound_at: new Date().toISOString(),
    };
}

export function resolveCapabilitySet(authority: LocalAuthority): string[] {
    if (!authority) return [];
    // LOCAL_DEVELOPER receives full DEVELOPER profile request
    return [...new Set([...DEVELOPER_FEATURES])];
}

export function intersectImplemented(capabilities: string[]): CapabilityResult {
    const kept: string[] = [];
    const dropped: Array<{ capability: string; reason: FailureCode }> = [];

    for (const c of capabilities) {
        if (IMPLEMENTED_CAPABILITIES.includes(c)) {
            kept.push(c);
        } else {
            dropped.push({ capability: c, reason: 'CAPABILITY_NOT_IMPLEMENTED' });
        }
    }

    return { capabilities: kept, requested: capabilities, dropped };
}

export async function intersectRuntimeAvailable(capabilities: string[]): Promise<CapabilityResult> {
    // runtimeAvailable can be updated by runtime probe; default empty means all passed
    // In the minimal v1, we only drop explicitly known-frozen capabilities
    const kept: string[] = [];
    const dropped: Array<{ capability: string; reason: FailureCode }> = [];

    for (const c of capabilities) {
        if (runtimeAvailable.length > 0 && runtimeAvailable.includes(c)) {
            kept.push(c);
        } else {
            dropped.push({ capability: c, reason: 'CAPABILITY_NOT_AVAILABLE' });
        }
    }

    return { capabilities: kept, requested: capabilities, dropped };
}

export function updateRuntimeAvailable(capabilities: string[]): void {
    runtimeAvailable = [...new Set(capabilities)];
}

export function validatePrincipalSession(
    principal: LocalPrincipal | null,
    _session: any,
): { valid: boolean; failure?: FailureCode } {
    if (!principal) {
        return { valid: false, failure: 'UNKNOWN_PRINCIPAL' };
    }
    if (!principal.principal_id) {
        return { valid: false, failure: 'AUTHORITY_NOT_BOUND' };
    }
    if (!principal.email && !principal.display_name) {
        return { valid: false, failure: 'SESSION_INVALID' };
    }
    return { valid: true };
}

interface HyperAIVSCodeCanon {
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
}

export function resolvePrincipalFromCanon(canon: HyperAIVSCodeCanon): LocalPrincipal {
    return {
        principal_id: `${canon.p0_canon_authority.commander.toLowerCase().replace(/\s+/g, '_')}@${canon.p0_canon_authority.owner.toLowerCase()}`,
        email: '',
        display_name: canon.p0_canon_authority.commander,
        source: 'local_binding',
    };
}

export function validateCanon(canon: HyperAIVSCodeCanon | null): { valid: boolean; failure?: FailureCode } {
    if (!canon) {
        return { valid: false, failure: 'CANON_NOT_FOUND' };
    }
    if (!canon.p0_canon_authority.owner || !canon.p0_canon_authority.commander) {
        return { valid: false, failure: 'OWNER_UNKNOWN' };
    }
    if (canon.p1_local_authority.authority !== 'HYPERAI_VIETNAM_CONTROL') {
        return { valid: false, failure: 'AUTHORITY_NOT_RECOGNIZED' };
    }
    if (canon.p1_local_authority.processing_mode !== 'LOCAL_SOVEREIGNTY') {
        return { valid: false, failure: 'PROCESSING_MODE_INVALID' };
    }
    return { valid: true };
}

export async function resolveEffectiveCapabilities(
    principal: LocalPrincipal,
): Promise<{ principal: LocalPrincipal; authority: LocalAuthority; capabilities: string[]; failures: Array<{ capability: string; reason: FailureCode }> }> {
    const authority = resolveAuthority(principal.principal_id);
    if (!authority) {
        return { principal, authority: { principal_id: principal.principal_id, role: 'LOCAL_DEVELOPER', scope: 'HOME_CLOUD_LOCAL', bound_at: '' }, capabilities: [], failures: [{ capability: '*', reason: 'AUTHORITY_NOT_BOUND' }] };
    }

    const requested = resolveCapabilitySet(authority);
    const implemented = intersectImplemented(requested);
    const available = await intersectRuntimeAvailable(implemented.capabilities);

    return {
        principal,
        authority,
        capabilities: available.capabilities,
        failures: [...implemented.dropped, ...available.dropped],
    };
}
