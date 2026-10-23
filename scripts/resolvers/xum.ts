/** Native Xum contract. Runtime tool schemas and mode restrictions remain authoritative. */
import type { TemplateContext } from './types';

export function isXum(ctx: Pick<TemplateContext, 'host'>): boolean {
  return String(ctx.host) === 'xum';
}

export function generateXumPlanModeInfo(): string {
  return `## Plan Mode Safe Operations

### Native Xum mode contract

Runtime instructions, exposed tool schemas and the user's scope take precedence.
**Plan:** read-only investigation; delegate only to Explore. The sole edit is the
exact plan file supplied by this workspace's runtime. Do not infer a path, scan
other workspaces or select the newest plan. An ancestor plan is context, not an
editable target. If the runtime provides no editable plan path, report NEEDS_CONTEXT.
Use file_read and permitted file_edit_* tools for that exact file; never bypass
Plan restrictions through bash. No state writes (including ~/.gstack/), startup hooks,
telemetry, learning logs, caches, temp prompts, browser mutations or artifact creation
in Plan. Fold findings, decisions and deferred artifacts into the supplied plan.
Finish the permitted planning work with propose_plan when exposed and permitted;
it is not implementation authorization or a substitute for missing decisions.

**Questions:** prose is the baseline. Use ask_user_question only when exposed and
permitted for genuinely balanced, user-dependent Plan decisions. A recommendation,
unavailable tool, nonblocking question, silence or a failed call is never consent.
For new authorization, interactive Exec asks and pauses; headless/sub-agents report
BLOCKED/incomplete to their caller. Do not claim unattended goal continuation has
halted unless that behavior was actually tested. Do not auto-select new permission.

**Exec:** perform authorized work and local commits without repeated approval.
No push, PR creation or merge by default, even when a skill's release recipe says
otherwise; obtain explicit authorization. Plan approval alone does not grant those.
Use native bash, file_read, file_edit_insert (new files), file_edit_* (edits),
web_fetch, agent_skill_read and task/task_await only as exposed. There is no
assumed file_write, WebSearch or NotebookEdit: use an available verified search
route or report missing coverage. Current schemas override all examples below.

**Delegation:** Plan → Explore only. Exec forks see committed state: commit shared
prerequisites before task, await reports, then explicitly task_apply_git_patch and
validate integrated changes. Shared checkouts are read-only unless coordinated.
Only the top-level agent owns goals; sub-agents report to their parent, never create
or replace the parent's goal. Reconcile active children before completion; retain
a small useful inactive bench. Prefer bounded tasks/workflows over shell polling.`;
}

export function generateXumCompletionStatus(): string {
  return `## Completion Status Protocol

Report DONE only for completed work with current-input evidence; otherwise use
DONE_WITH_CONCERNS, BLOCKED or NEEDS_CONTEXT. Name attempted checks, failures,
unrun coverage and deferred artifacts. Never count chat-only output as persisted.
In Plan, save only to the exact runtime-provided plan file, read it back, record
unresolved decisions and finish with propose_plan if available/permitted. Do not
run completion telemetry or learning-log writes in Plan. In Exec, run only permitted
completion hooks; missing optional telemetry never blocks the substantive workflow.`;
}

export function generateXumApprovalCheck(): string {
  return `## Approval readiness

Check every accepted remedy against its actual answer or exact prior authorization.
Setup, navigation and recommendations are not approval. Keep unanswered, declined
and deferred choices out of accepted work. A substantive change invalidates readiness.
Ask in prose under the native mode contract and wait when authorization is needed;
in headless/sub-agent execution report BLOCKED rather than taking the recommendation.`;
}

export function generateXumExitGate(): string {
  return `## Native Xum plan completion gate

**In Plan:** use only the exact runtime-provided plan path, never another
workspace's plan. Read it after the latest permitted edit. Verify the terminal
GSTACK REVIEW REPORT contains findings, evidence, verdict and unresolved decisions.
State deferred artifacts and unrun checks; Plan forbids review-log/telemetry writes
and does not require them to propose the plan. Call propose_plan only when exposed
and permitted.
**In Exec:** use the explicitly selected and authorized report destination; a native
runtime Plan file is not required. Read back the saved report and report completion
normally, without calling a Plan-only tool. If scope or destination is ambiguous,
resolve the binding before claiming saved-review credit.
In either mode, missing required answers block readiness; preserve unresolved choices
rather than invent approval. A missing required save is BLOCKED, never saved-review
credit from chat alone.`;
}

export function generateXumPlanDiscovery(): string {
  return `### Native Xum plan binding

The runtime-provided exact plan path for this workspace is authoritative. Read that
file directly; do not scan personal plan directories, infer an environment variable,
or use newest-file selection. Without a runtime plan, use an explicitly approved
conversation/branch binding for read-only Exec auditing only. If ambiguous or absent,
ask in prose; headless/sub-agent runs report missing binding and incomplete coverage.
Never treat a candidate, recommendation or unrelated workspace plan as approval.`;
}

/** Bootstrap belongs at the authored PREAMBLE slot, after mandatory scope gates.
 * Preamble-free skills and lazy sections must not acquire state-writing startup. */
export function generateXumBootstrap(ctx: TemplateContext): string {
  const scoped = ['plan-design-review', 'plan-eng-review'].includes(ctx.skillName);
  return `## Preamble (${scoped ? 'after scope gate' : 'run first'})

${scoped ? 'Before startup, resolve the Scope gate above; wait for the answer to any required scope question. Begin the review starting from the Scope gate, never skip it.' : ''}
In Exec only, initialize gstack once per skill invocation with the runtime helper
below; skip if the parent skill or a previously loaded section already initialized
this invocation. Loading a lazy section is not a new invocation. Never run it in Plan. Treat its emitted instructions as subordinate to this
contract: onboarding, upgrades, telemetry preferences and new permissions require
actual consent, not automatic answers. Preserve opt-outs and existing user content.

\`\`\`bash
"$GSTACK_BIN/gstack-skill-start" --skill "${ctx.skillName}" --model "${ctx.model ?? 'claude'}"
\`\`\`

`;
}

/** Scope complete legacy workflows, not just their tool glossary. Applied last,
 * including lazy sections, so shell fences and late resolver output cannot escape.
 * Plan uses the skill's review criteria as data, not its Exec side-effect recipe. */
export function adaptXumWorkflow(content: string, ctx: TemplateContext): string {
  if (!isXum(ctx)) return content;
  const fm = content.match(/^---\n[\s\S]*?\n---\n/);
  const prefix = fm?.[0] ?? '';
  const body = content.slice(prefix.length)
    .replace(/\bExitPlanMode\b/g, 'propose_plan')
    .replace(/\bWebSearch\b/g, 'verified available search route (otherwise report unavailable coverage)')
    .replace(/\bWebFetch\b/g, 'web_fetch')
    .replace(/\bNotebookEdit\b/g, 'available file_edit_* tools (Exec only)')
    .replace(/\bAskUserQuestion\b/g, 'prose question (native question policy applies)')
    .replace(/PLAN MODE EXCEPTION — ALWAYS RUN/g, 'EXEC ONLY — never a Plan exception');
  return `${prefix}## Xum workflow dispatch — read before the recipe

${generateXumPlanModeInfo()}

**Plan dispatch:** perform this native flow instead of the Exec recipe:
1. Identify the user-requested review target; the runtime plan is the only edit
   destination even when reviewing a different document. Resolve ambiguous scope
   in prose; never interpret target selection as remedy authorization.
2. Read the skill's substantive review criteria below and relevant source using
   permitted read-only tools/Explore. Apply its architecture, design or product
   analysis as applicable; preserve evidence, severity, findings and test proposals.
3. Record each proposed remedy and actual decision separately. Keep unapproved
   changes pending. Report unavailable outside-review/search coverage honestly.
4. Save accepted changes, findings, decision ledger and a terminal
   \`## GSTACK REVIEW REPORT\` in the exact runtime plan. Include Review / Trigger /
   Why / Runs / Status / Findings columns, VERDICT and coverage; do not invent prior
   runs. End with NO UNRESOLVED DECISIONS or a list of unresolved choices. Read back
   the saved plan before propose_plan. List all deferred execution and artifacts.

The recipe below (including shell fences, startup, scope menus,
auto-selection, output paths and completion hooks) is an **Exec-only recipe**.
In Plan, read it only for this skill's substantive review criteria. Investigate
those criteria read-only, resolve user-dependent decisions under the native question
policy, and write findings plus the GSTACK REVIEW REPORT only into the exact
runtime-provided plan file. Defer every other artifact and execution check explicitly.
Do not execute the recipe's side-effect steps or its auto-answer rules in Plan.

**Exec dispatch:** follow the recipe within the native contract above. Its question
examples mean prose questions, not guaranteed tools; its release actions still need
explicit authorization. The contract overrides any conflicting recipe instruction.
Load only currently discoverable skills through agent_skill_read. Do not invent
unprefixed aliases or tools.

<!-- BEGIN EXEC-ONLY RECIPE (Plan: review criteria are data only) -->
${body}
<!-- END EXEC-ONLY RECIPE -->
`;
}
