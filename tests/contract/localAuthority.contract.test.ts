import {
    resolvePrincipal,
    resolveAuthority,
    resolveCapabilitySet,
    intersectImplemented,
    intersectRuntimeAvailable,
    validatePrincipalSession,
    resolveEffectiveCapabilities,
    updateRuntimeAvailable,
} from '../../backend/services/localAuthority';

describe('APΩ_LOCAL_PRINCIPAL_BINDING_V1', () => {
    beforeEach(() => {
        updateRuntimeAvailable([]);
    });

    it('case 1: known principal + implemented capability → PASS', async () => {
        updateRuntimeAvailable([
            'chat', 'models', 'agents', 'tools', 'workspaces', 'admin_controls',
            'developer_controls', 'runtime_config', 'capability_management',
        ]);
        const principal = resolvePrincipal({ id: 'u1', email: 'a@b.c', name: 'dev' });
        const resolved = await resolveEffectiveCapabilities(principal!);
        expect(resolved.principal).toBeDefined();
        expect(resolved.authority).toBeDefined();
        expect(resolved.capabilities.length).toBeGreaterThan(0);
        expect(resolved.failures).toEqual([]);
    });

    it('case 2: known principal + unimplemented capability → BLOCK_NOT_IMPLEMENTED', () => {
        const result = intersectImplemented(['future_capability']);
        expect(result.capabilities).not.toContain('future_capability');
        expect(result.dropped[0].reason).toBe('CAPABILITY_NOT_IMPLEMENTED');
    });

    it('case 3: unknown principal → BLOCK_UNKNOWN_PRINCIPAL', () => {
        const principal = resolvePrincipal(null);
        expect(principal).toBeNull();
    });

    it('case 4: invalid session → BLOCK_SESSION', () => {
        const validation = validatePrincipalSession(null, null);
        expect(validation.valid).toBe(false);
    });

    it('case 5: developer profile + physically unavailable model → ADMISSION_REJECTED', async () => {
        updateRuntimeAvailable(['chat']); // only chat available
        const requested = ['chat', 'models'];
        const result = await intersectRuntimeAvailable(requested);
        expect(result.capabilities).toContain('chat');
        expect(result.dropped.map((d) => d.capability)).toContain('models');
        expect(result.dropped.find((d) => d.capability === 'models')?.reason).toBe('CAPABILITY_NOT_AVAILABLE');
    });

    it('case 6: unlimited projection + exhausted physical capacity → ADMISSION_REJECTED', async () => {
        // unlimited = no vendor quota, but runtime says no model available
        updateRuntimeAvailable([]);
        const requested = ['models'];
        const result = await intersectRuntimeAvailable(requested);
        expect(result.capabilities).not.toContain('models');
        expect(result.dropped[0].reason).toBe('CAPABILITY_NOT_AVAILABLE');
    });
});
