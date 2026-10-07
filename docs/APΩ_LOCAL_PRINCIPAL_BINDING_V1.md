# APΩ_LOCAL_PRINCIPAL_BINDING_V1

## Scope
P1 LocalPrincipal binding for `hyperai-user-control-system`.
Does not cover full Home-Cloud v1. Locks the contract before code drift.

## 1. Identity

```ts
export interface LocalPrincipal {
    principal_id: string;   // stable local binding
    email: string;          // current UI account
    display_name: string;   // current UI display name
    source: 'ui_session' | 'local_binding' | 'runtime_fallback';
}
```

`current_ui_account` from UI session becomes `LocalPrincipal`.
No new `SuperAdmin` entity.

## 2. Authority

```ts
export interface LocalAuthority {
    principal_id: string;
    role: 'LOCAL_DEVELOPER';
    scope: 'HOME_CLOUD_LOCAL';
    bound_at: string;
}
```

`LOCAL_DEVELOPER` is the highest authority the local implementation supports.
It is not an entitlement from an external cloud.

## 3. Capability

### Capability profiles (projection only, not identity)

```ts
const PLUS_FEATURES = ['chat', 'models'];
const PRO_FEATURES = ['chat', 'models', 'agents', 'tools'];
const BUSINESS_FEATURES = ['chat', 'models', 'agents', 'tools', 'workspaces'];
const ADMIN_FEATURES = ['chat', 'models', 'agents', 'tools', 'workspaces', 'admin_controls'];
const DEVELOPER_FEATURES = [
    'chat', 'models', 'agents', 'tools', 'workspaces', 'admin_controls',
    'developer_controls', 'runtime_config', 'capability_management'
];
```

### Effective capability resolution

```ts
EffectiveCapabilities(principal)
    = Profile(principal.authority)
    ∩ ImplementedCapabilities
    ∩ RuntimeAvailableCapabilities
```

- `Profile` = union of feature sets above for LOCAL_DEVELOPER
- `ImplementedCapabilities` = build availability (env flags, present modules)
- `RuntimeAvailableCapabilities` = runtime proven/fresh probe (runtimeAuthority.js)

## 4. Failure states

```ts
UNKNOWN_PRINCIPAL
AUTHORITY_NOT_BOUND
CAPABILITY_NOT_IMPLEMENTED
CAPABILITY_NOT_AVAILABLE
SESSION_INVALID
ADMISSION_REJECTED
```

`!= SUCCESS` unless all gates pass.

## 5. Binding flow

```text
UI session/account
    ↓
resolvePrincipal(current_ui_account) -> LocalPrincipal
    ↓
resolveAuthority(principal_id) -> LocalAuthority
    ↓
resolveCapabilitySet(authority) -> RequestedCapabilities
    ↓
intersectImplemented(capabilities) -> ImplementedCapabilities
    ↓
intersectRuntimeAvailable(capabilities) -> EffectiveCapabilities
    ↓
UserContext consumes { principal, authority, capabilities }
```

## 6. Module boundary

`backend/services/localAuthority.ts`

```ts
resolvePrincipal(source: any): LocalPrincipal | null
resolveAuthority(principal_id: string): LocalAuthority | null
resolveCapabilitySet(authority: LocalAuthority): string[]
intersectImplemented(capabilities: string[]): string[]
intersectRuntimeAvailable(capabilities: string[]): Promise<string[]>
validatePrincipalSession(principal: LocalPrincipal, session: any): boolean
```

## 7. Code touch points

1. `src/types/user.types.ts` — extend User
2. `src/contexts/UserContext.tsx` — consume resolver
3. `src/services/runtimeFlags.ts` — split build vs capability
4. `backend/services/userService.ts` — replace `validateUserSession` always true
5. `backend/services/localAuthority.ts` — new canonical resolver

## 8. Acceptance cases

1. known principal + implemented capability → PASS
2. known principal + unimplemented capability → BLOCK_NOT_IMPLEMENTED
3. unknown principal → BLOCK_UNKNOWN_PRINCIPAL
4. invalid session → BLOCK_SESSION
5. developer profile + physically unavailable model → ADMISSION_REJECTED
6. unlimited projection + exhausted physical capacity → ADMISSION_REJECTED
