import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

type GithubSurfaceStatus = {
  status: 'ok' | 'degraded' | 'missing';
  gh_cli: 'available' | 'missing';
  gh_probe_status?: string;
  gh_binary_path?: string | null;
  gh_source?: string | null;
  browser_app_status?: 'available' | 'degraded' | 'missing';
  browser_app_id?: string;
  browser_app_origin?: string;
  browser_app_installed?: boolean;
  browser_app_scope?: string | null;
  browser_app_last_used_at?: string | null;
  browser_app_source?: string | null;
  browser_app_profiles?: string[];
  browser_app_icon_path?: string | null;
  browser_app_link_capture?: boolean;
  git_worktree: 'attached' | 'snapshot-only';
  git_name?: string | null;
  git_email?: string | null;
  identity_scope?: string | null;
  ci_workflow: 'present' | 'missing';
  identity_workflow: 'present' | 'missing';
  release_workflow: 'present' | 'missing';
  workflow_count: number;
  agent_mode: 'live-gh' | 'filesystem-authority' | 'missing';
  query_ready: boolean;
  selected_action?: string | null;
  boundary_state?: string | null;
  attachment_gate_a?: 'ready' | 'blocked';
  attachment_gate_b?: 'ready' | 'blocked';
  attachment_recommendation?: string | null;
  preferred_lineage?: {
    path: string;
    remote_url?: string | null;
    branch?: string | null;
    role?: string;
  } | null;
  lineage_candidates?: Array<{
    path: string;
    remote_url?: string | null;
    branch?: string | null;
    role?: string;
    has_git: boolean;
  }>;
  detail: string;
};

export class GithubAgentService {
  private readonly workspaceRoot = path.resolve(__dirname, '..', '..', '..');
  private readonly productRoot = path.resolve(this.workspaceRoot, 'hyperai-user-control-system');
  private readonly workflowsRoot = path.resolve(this.productRoot, '.github', 'workflows');
  private readonly projectStatePath = path.resolve(this.workspaceRoot, 'memory', 'project_state.json');
  private readonly runtimeManifestPath = path.resolve(this.workspaceRoot, 'runtime', 'hyperai-autonomous-runtime.json');
  private readonly lineageCandidates = [
    path.resolve('C:/Users/pc/aidev'),
    path.resolve('C:/aios_project/aidev'),
    path.resolve(this.workspaceRoot, 'AI_EMERGENCY_VAULT', 'aidev', 'aidev'),
    path.resolve(this.workspaceRoot, '_CONSOLIDATED', 'aidev'),
    path.resolve('C:/Users/pc/AIOS_HyperAI'),
  ];

  private probeGithubCli() {
    const candidatePaths = [
      path.resolve('C:/Program Files/GitHub CLI/gh.exe'),
      path.resolve('C:/Program Files (x86)/GitHub CLI/gh.exe'),
      path.resolve('C:/Users/pc/AppData/Local/GitHub CLI/bin/gh.exe'),
      path.resolve('C:/Users/pc/AppData/Local/Programs/GitHub CLI/gh.exe'),
      path.resolve('C:/Users/pc/scoop/apps/gh/current/bin/gh.exe'),
      path.resolve('C:/ProgramData/chocolatey/bin/gh.exe'),
    ];

    const directProbe = spawnSync('gh', ['--version'], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    if (!directProbe.error && directProbe.status === 0) {
      const whereProbe = spawnSync('where', ['gh'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
      });
      return {
        gh_cli: 'available' as const,
        gh_probe_status: 'ready',
        gh_binary_path: whereProbe.status === 0 ? whereProbe.stdout.split(/\r?\n/)[0].trim() : 'gh',
        gh_source: 'path',
        attachment_gate_a: 'ready' as const,
      };
    }

    const installedBinary = candidatePaths.find((candidate) => fs.existsSync(candidate)) || null;
    if (installedBinary) {
      return {
        gh_cli: 'missing' as const,
        gh_probe_status: 'installed-outside-path',
        gh_binary_path: installedBinary,
        gh_source: 'binary-outside-path',
        attachment_gate_a: 'blocked' as const,
      };
    }

    const desktopInstalled = fs.existsSync(path.resolve('C:/Users/pc/AppData/Local/GitHubDesktop'));
    return {
      gh_cli: 'missing' as const,
      gh_probe_status: desktopInstalled ? 'desktop-present-gh-missing' : 'not-found',
      gh_binary_path: null,
      gh_source: desktopInstalled ? 'desktop-missing' : 'not-found',
      attachment_gate_a: 'blocked' as const,
    };
  }

  private probeGithubBrowserApp() {
    const edgeUserDataRoot = path.resolve('C:/Users/pc/AppData/Local/Microsoft/Edge/User Data');
    const localStatePath = path.join(edgeUserDataRoot, 'Local State');
    const appId = 'mjoklplbddabcmpepnokjaffbmgbkkgg';
    const appOrigin = 'https://github.com/';
    const appIconPath = path.join(edgeUserDataRoot, 'Default', 'Web Applications', `_crx__${appId}`, 'GitHub.ico');

    if (!fs.existsSync(localStatePath)) {
      return {
        browser_app_status: 'missing' as const,
        browser_app_id: appId,
        browser_app_origin: appOrigin,
        browser_app_installed: false,
        browser_app_scope: null,
        browser_app_last_used_at: null,
        browser_app_source: 'edge-local-state-missing',
        browser_app_profiles: [] as string[],
        browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
        browser_app_link_capture: false,
      };
    }

    try {
      const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
      const appShims = localState?.app_shims?.[appId] || null;
      const webAppMetrics = localState?.web_app_install_metrics?.[appId] || null;
      const dailyMetrics = localState?.web_apps?.daily_metrics?.[appOrigin] || null;
      const installedProfiles = Array.isArray(appShims?.installed_profiles) ? appShims.installed_profiles : [];
      const lastActiveProfiles = Array.isArray(appShims?.last_active_profiles) ? appShims.last_active_profiles : [];
      const installed = Boolean(appShims || webAppMetrics || dailyMetrics);

      return {
        browser_app_status: installed ? 'available' as const : 'missing' as const,
        browser_app_id: appId,
        browser_app_origin: appOrigin,
        browser_app_installed: installed,
        browser_app_scope: dailyMetrics?.effective_display_mode != null ? `display-mode-${dailyMetrics.effective_display_mode}` : null,
        browser_app_last_used_at: webAppMetrics?.install_timestamp || null,
        browser_app_source: installed ? 'edge-local-state' : 'edge-app-missing',
        browser_app_profiles: installedProfiles.length ? installedProfiles : lastActiveProfiles,
        browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
        browser_app_link_capture: Boolean(dailyMetrics?.captures_links),
      };
    } catch (error) {
      return {
        browser_app_status: 'degraded' as const,
        browser_app_id: appId,
        browser_app_origin: appOrigin,
        browser_app_installed: false,
        browser_app_scope: null,
        browser_app_last_used_at: null,
        browser_app_source: error instanceof Error ? error.message : String(error),
        browser_app_profiles: [] as string[],
        browser_app_icon_path: fs.existsSync(appIconPath) ? appIconPath : null,
        browser_app_link_capture: false,
      };
    }
  }

  private readProjectState(): { current_focus?: string; latest_summary?: string } | null {
    if (!fs.existsSync(this.projectStatePath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(this.projectStatePath, 'utf8'));
    } catch {
      return null;
    }
  }

  private readRuntimePolicy(): { selected_action?: string; boundary_state?: string; haios_state?: string } | null {
    if (!fs.existsSync(this.runtimeManifestPath)) {
      return null;
    }

    try {
      const payload = JSON.parse(fs.readFileSync(this.runtimeManifestPath, 'utf8'));
      return payload?.policy || null;
    } catch {
      return null;
    }
  }

  private getLineageCandidates() {
    return this.lineageCandidates
      .map((candidatePath) => {
        const gitDir = path.join(candidatePath, '.git');
        const configPath = path.join(gitDir, 'config');
        const hasGit = fs.existsSync(gitDir);
        let remoteUrl: string | null = null;
        let branch: string | null = null;

        if (hasGit && fs.existsSync(configPath)) {
          try {
            const configText = fs.readFileSync(configPath, 'utf8');
            const remoteMatch = configText.match(/\[remote "origin"\][\s\S]*?url = ([^\r\n]+)/);
            const branchMatch = configText.match(/\[branch "([^\"]+)"\]/);
            remoteUrl = remoteMatch ? remoteMatch[1].trim() : null;
            branch = branchMatch ? branchMatch[1].trim() : null;
          } catch {
            remoteUrl = null;
          }
        }

        const role =
          candidatePath === path.resolve('C:/Users/pc/aidev')
            ? 'preferred-lineage'
            : candidatePath === path.resolve('C:/aios_project/aidev')
              ? 'secondary-lineage'
              : candidatePath.includes('AI_EMERGENCY_VAULT')
                ? 'archive-lineage'
                : candidatePath.includes('_CONSOLIDATED')
                  ? 'consolidated-lineage'
                  : 'adjacent-surface';

        return {
          path: candidatePath,
          has_git: hasGit,
          remote_url: remoteUrl,
          branch,
          role,
        };
      })
      .filter((candidate) => fs.existsSync(candidate.path));
  }

  getSurfaceStatus(): GithubSurfaceStatus {
    const workflowFiles = fs.existsSync(this.workflowsRoot)
      ? fs.readdirSync(this.workflowsRoot).filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
      : [];

    const ciPresent = workflowFiles.includes('ci.yml');
    const identityPresent = workflowFiles.includes('identity-surface.yml');
    const releasePresent = workflowFiles.includes('release.yml');
    const ghProbe = this.probeGithubCli();
    const browserApp = this.probeGithubBrowserApp();
    const gitProbe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: this.productRoot,
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const runtimePolicy = this.readRuntimePolicy();
    const localGitName = spawnSync('git', ['config', '--local', 'user.name'], {
      cwd: this.productRoot,
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const localGitEmail = spawnSync('git', ['config', '--local', 'user.email'], {
      cwd: this.productRoot,
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const localIdentityScope = spawnSync('git', ['config', '--local', 'hyperai.identity.scope'], {
      cwd: this.productRoot,
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const globalGitName = spawnSync('git', ['config', '--global', 'user.name'], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const globalGitEmail = spawnSync('git', ['config', '--global', 'user.email'], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
    });
    const insideGitWorktree = gitProbe.status === 0 && gitProbe.stdout.trim() === 'true';
    const ghAvailable = ghProbe.gh_probe_status === 'ready';
    const gitName = (localGitName.status === 0 ? localGitName.stdout : globalGitName.stdout).trim() || null;
    const gitEmail = (localGitEmail.status === 0 ? localGitEmail.stdout : globalGitEmail.stdout).trim() || null;
    const identityScope = (localIdentityScope.status === 0 ? localIdentityScope.stdout.trim() : '') || 'global-default';
    const lineageCandidates = this.getLineageCandidates();
    const preferredLineage =
      lineageCandidates.find((candidate) => candidate.role === 'preferred-lineage' && candidate.has_git)
      || lineageCandidates.find((candidate) => candidate.has_git)
      || null;
    const preferredLineageHealthy = Boolean(
      preferredLineage
      && preferredLineage.has_git
      && preferredLineage.remote_url === 'https://github.com/sowhat1989/aidev.git'
      && preferredLineage.branch === 'main'
    );
    const attachmentRecommendation = ghProbe.attachment_gate_a === 'ready' && preferredLineageHealthy
      ? 'remote-reference only'
      : 'hold-filesystem-authority';
    const status: GithubSurfaceStatus['status'] =
      ghAvailable && insideGitWorktree && ciPresent ? 'ok' : (ciPresent || browserApp.browser_app_installed) ? 'degraded' : 'missing';

    return {
      status,
      gh_cli: ghProbe.gh_cli,
      gh_probe_status: ghProbe.gh_probe_status,
      gh_binary_path: ghProbe.gh_binary_path,
      gh_source: ghProbe.gh_source,
      browser_app_status: browserApp.browser_app_status,
      browser_app_id: browserApp.browser_app_id,
      browser_app_origin: browserApp.browser_app_origin,
      browser_app_installed: browserApp.browser_app_installed,
      browser_app_scope: browserApp.browser_app_scope,
      browser_app_last_used_at: browserApp.browser_app_last_used_at,
      browser_app_source: browserApp.browser_app_source,
      browser_app_profiles: browserApp.browser_app_profiles,
      browser_app_icon_path: browserApp.browser_app_icon_path,
      browser_app_link_capture: browserApp.browser_app_link_capture,
      git_worktree: insideGitWorktree ? 'attached' : 'snapshot-only',
      git_name: gitName,
      git_email: gitEmail,
      identity_scope: identityScope,
      ci_workflow: ciPresent ? 'present' : 'missing',
      identity_workflow: identityPresent ? 'present' : 'missing',
      release_workflow: releasePresent ? 'present' : 'missing',
      workflow_count: workflowFiles.length,
      agent_mode: ghAvailable && insideGitWorktree ? 'live-gh' : ciPresent ? 'filesystem-authority' : 'missing',
      query_ready: ciPresent,
      selected_action: runtimePolicy?.selected_action || null,
      boundary_state: runtimePolicy?.boundary_state || runtimePolicy?.haios_state || null,
      attachment_gate_a: ghProbe.attachment_gate_a,
      attachment_gate_b: preferredLineageHealthy ? 'ready' : 'blocked',
      attachment_recommendation: attachmentRecommendation,
      preferred_lineage: preferredLineage,
      lineage_candidates: lineageCandidates,
      detail: ghAvailable
        ? insideGitWorktree
          ? 'GitHub CLI and workflow authority are available from the local product surface.'
          : 'GitHub CLI exists, but this product surface is currently a filesystem snapshot instead of an attached git worktree.'
        : ghProbe.gh_probe_status === 'installed-outside-path'
          ? 'GitHub CLI binary exists outside PATH. Filesystem-authority remains active until PATH is normalized.'
          : browserApp.browser_app_installed
            ? 'Using filesystem-authority plus the installed Edge GitHub app because gh is not available in this runtime.'
            : 'Using the local workflow files as GitHub authority because gh is not available in this runtime.',
    };
  }

  async queryLocalModel(prompt: string): Promise<string> {
    const github = this.getSurfaceStatus();
    const projectState = this.readProjectState();
    const parts = [
      `GitHub surface mode: ${github.agent_mode}.`,
      `gh CLI: ${github.gh_cli}.`,
      `Git worktree: ${github.git_worktree}.`,
      `Git identity: ${github.git_name || 'unknown'} <${github.git_email || 'unknown'}>.`,
      `Identity scope: ${github.identity_scope || 'unknown'}.`,
      `Workflow count: ${github.workflow_count}.`,
      `Boundary state: ${github.boundary_state || 'unknown'}.`,
      `Selected action: ${github.selected_action || 'unknown'}.`,
      `Preferred lineage: ${github.preferred_lineage?.path || 'unknown'} (${github.preferred_lineage?.remote_url || 'no-remote'}).`,
      `Browser app: ${github.browser_app_status || 'unknown'} (${github.browser_app_origin || 'unknown-origin'}).`,
      `Attachment readiness: gateA=${github.attachment_gate_a || 'unknown'}, gateB=${github.attachment_gate_b || 'unknown'}, recommendation=${github.attachment_recommendation || 'unknown'}.`,
      `Prompt: ${prompt}.`,
    ];

    if (projectState?.current_focus) {
      parts.push(`Current focus: ${projectState.current_focus}.`);
    }
    if (projectState?.latest_summary) {
      parts.push(`Latest summary: ${projectState.latest_summary}.`);
    }

    return parts.join(' ');
  }

  async generateCodeCompletion(context: string, language: string): Promise<string> {
    return this.queryLocalModel(`Completion request for ${language}. Context: ${context}`);
  }

  async generateDocumentation(context: string, language: string): Promise<string> {
    return this.queryLocalModel(`Documentation request for ${language}. Context: ${context}`);
  }

  async reviewCode(context: string, language: string): Promise<string> {
    return this.queryLocalModel(`Review request for ${language}. Context: ${context}`);
  }
}
