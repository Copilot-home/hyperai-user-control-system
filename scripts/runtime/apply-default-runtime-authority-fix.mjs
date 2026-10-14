import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = path.resolve(process.cwd(), 'backend/server.js');
const source = readFileSync(target, 'utf8');

const alreadyPatchedMarker = 'const defaultRoutineControl = Boolean(';
if (source.includes(alreadyPatchedMarker)) {
  console.log('default-runtime-authority-fix: already applied');
  process.exit(0);
}

const before = `    const selfManagedRoutineControl = Boolean(
        selfManagedRuntime &&
        !staleProcess &&
        active &&
        hasProbeEvidence &&
        backendClassification === 'autonomous-core-ready'
    );
    const effectiveBoundaryState = (policyConfirmsRoutineControl || selfManagedRoutineControl)
        ? 'autonomous'
        : boundaryState;
    const effectiveBoundaryReason = policyConfirmsRoutineControl
        ? \`Autonomous policy selected \${policySelectedAction} and the live loop is handling routine runtime selection without operator relay.\`
        : selfManagedRoutineControl
            ? 'Local-first proof runtime is handling routine runtime selection without operator relay.'
        : boundaryReason;
    const effectiveAutonomousCoreReady = Boolean(
        (authority.autonomousCoreReady || selfManagedRoutineControl) &&
        active &&
        hasProbeEvidence
    );
    const requiresOperatorRelay = !policyConfirmsRoutineControl &&
        !selfManagedRoutineControl &&
        (recoveryInFlight || staleProcess || !authority.autonomousCoreReady || !active || !hasProbeEvidence);
`;

const after = `    const selfManagedRoutineControl = Boolean(
        selfManagedRuntime &&
        !staleProcess &&
        active &&
        hasProbeEvidence &&
        backendClassification === 'autonomous-core-ready'
    );
    const defaultRoutineControl = Boolean(
        currentDefaultBoundaryHealthy &&
        active &&
        hasProbeEvidence &&
        backendClassification === 'autonomous-core-ready'
    );
    const effectiveBoundaryState = (
        policyConfirmsRoutineControl ||
        selfManagedRoutineControl ||
        defaultRoutineControl
    )
        ? 'autonomous'
        : boundaryState;
    const effectiveBoundaryReason = policyConfirmsRoutineControl
        ? \`Autonomous policy selected \${policySelectedAction} and the live loop is handling routine runtime selection without operator relay.\`
        : selfManagedRoutineControl
            ? 'Local-first proof runtime is handling routine runtime selection without operator relay.'
            : defaultRoutineControl
                ? 'Default runtime boundary is fresh, frontend-reachable, and backed by live autonomy probe evidence.'
        : boundaryReason;
    const effectiveAutonomousCoreReady = Boolean(
        (authority.autonomousCoreReady || selfManagedRoutineControl || defaultRoutineControl) &&
        active &&
        hasProbeEvidence
    );
    const requiresOperatorRelay = !policyConfirmsRoutineControl &&
        !selfManagedRoutineControl &&
        !defaultRoutineControl &&
        (recoveryInFlight || staleProcess || !authority.autonomousCoreReady || !active || !hasProbeEvidence);
`;

const firstIndex = source.indexOf(before);
const lastIndex = source.lastIndexOf(before);
if (firstIndex === -1 || firstIndex !== lastIndex) {
  throw new Error(
    `default-runtime-authority-fix refused: expected exactly one canonical source block, found ${firstIndex === -1 ? 0 : 2}+`,
  );
}

writeFileSync(target, source.replace(before, after), 'utf8');
console.log('default-runtime-authority-fix: applied');
