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
    | 'ADMISSION_REJECTED';
