# Using gstack with Xum (Mux)

Xum owns the agent runtime: isolated workspaces, Plan/Exec modes, native tools,
delegation, goals and the review UI. gstack supplies specialist engineering
workflows, browser automation and evidence-based quality gates. Neither needs
to impersonate the other.

The adapter is **experimental**, not a certified workflow run. The contract was
investigated against Xum 0.31.0 and its exposed tools; newer or restricted runtimes
may expose fewer tools. Current tool schemas and higher-priority host instructions
always win over generated compatibility guidance.

## Install and invoke

From your gstack checkout, in **Exec** mode:

```bash
./setup --host xum
# Supported compatibility spelling:
./setup --host mux
./setup --status
```

This is a global install in the active runtime's home directory. Remote SSH/Coder
workspaces require setup and dependencies on the remote machine, not just on
your laptop. Project-local installation is deliberately unsupported: Xum rejects
project skill links that escape the project's containment root.

| Path | Purpose |
| --- | --- |
| `~/.xum/skills/gstack` | Runtime assets and helpers, resolved as `$GSTACK_ROOT` |
| `~/.xum/skills/gstack-<skill>/SKILL.md` | Discoverable generated skills |
| checkout `.xum/skills/` | Generated source for those discovery links |

Invoke `/gstack-office-hours`, `/gstack-plan-eng-review`, `/gstack-review` or
`/gstack-qa`. Load through `agent_skill_read` when appropriate. Names are prefixed
to avoid host built-in collisions; do not assume `/review` is an alias. Skills
must have a frontmatter `name` matching their containing directory and a
`description` of at most 1,024 characters.

Xum also reads project `.agents/skills`, with nearer project definitions winning;
at the same directory `.xum/skills` wins. A project definition can shadow a global
skill. Check discovery before assuming a generated global skill is active.
Xum's own `.mux` compatibility fallback does not require a second gstack render.
Non-default `XUM_ROOT` installations are not certified by this adapter; verify
actual discovery before relying on a relocated home.

## One integrated workflow

1. **Frame in Plan.** Run office-hours and relevant CEO, design and developer
   experience reviews. Finish with engineering review. Explore children collect
   evidence; the parent owns one plan and presents it with `propose_plan`.
2. **Respect the Plan boundary.** Edit only the exact plan file supplied by Xum.
   Do not run setup, state-writing preambles or artifact-producing shell steps
   to bypass that restriction. Fold review findings into the native plan;
   defer separate artifacts and implementation to Exec.
3. **Implement in Exec.** After the normal approval/handoff, use an explicit
   goal for genuinely multi-turn work. Commit authorized milestones and
   continue without asking for permission at every commit.
4. **Delegate selectively.** Use Explore for read-only context and isolated Exec
   children for independent implementations. Forked children start from committed
   state; commit shared prerequisites first. Await output and explicitly apply
   returned patches. A native child review is not independent outside-model
   evidence merely because it runs in another workspace.
5. **Verify with gstack.** Run focused checks while repairing, then generation,
   documentation, build and final acceptance. Keep failures and incomplete
   coverage visible. Use Xum review pins and timeline events for high-value
   findings, not as substitutes for test evidence.
6. **Finish within authorization.** A local-only task ends with local commits
   and a validation report. `/gstack-ship` normally pushes and opens a PR: do
   not invoke it when those actions are prohibited. Deployment is separate
   authorization too.

### Goals and approvals

An interactive goal should be created only when requested for multi-turn,
verifiable work. Budget is in **cents** for `set_goal`. Omitted/null fields can
inherit workspace defaults: inspect `get_goal` instead of assuming no turn cap.
For a CLI Goal Run, explicit goal limits have distinct semantics:

```bash
# $1,000 goal ceiling, no goal-turn cap (CLI semantics).
# Use mux instead of xum if only the legacy executable is installed.
xum run --mode exec --goal 'Implement and validate the approved plan; local commits only; no push or PR' --goal-budget 100000c
```

This is an alternative launch, not a command to run a second owner against an
already-active checkout. `--budget` is a separate hard session limit in USD.
A budget ceiling is not permission to spend it on arbitrary paid evaluations.
Follow the repo's preregistration, preflight and no-retry policy.

Structured `ask_user_question` is not a universal blocking prompt: availability
and permitted use depend on mode and transport. Use it only when currently
exposed and allowed. In interactive Exec, stop for genuinely new authorization
rather than assuming consent. In a headless/sub-agent context, report the blocker
to the owner; unattended goal-loop termination at approval boundaries is **not
certified**. Do not run approval-dependent publishing/deployment unattended on
the strength of question prose alone. Work already authorized does not need
repeated approval.

### Browser and outside review

Keep gstack's browser selection: Aside on supported Macs when ready, otherwise
the bundled gstack browser. Linux/remote workspaces need the fallback browser's
prerequisites where commands execute. Xum computer/desktop tools do not magically
share a laptop's authenticated browser session. Use the desktop specialist when
available for repeated native GUI interaction, not to replace browser QA evidence.

Claude Code/Codex outside reviews remain optional CLI integrations with their own
authentication and centralized failure policy. Missing binaries, authentication,
search or provider access are unavailable coverage, not a pass. Xum has
`web_fetch`, not a guaranteed search tool; use an actually available search or
browser surface and disclose limits. Native file creation uses `file_edit_insert`,
not an invented `file_write` tool.

## Instructions, safety and upkeep

Xum selects `AGENTS.md` before `CLAUDE.md` in the same directory; do not assume
both are loaded cumulatively. Keep project guidance in a small shared routing
section rather than duplicating the whole skill catalog. Existing instruction
content and opt-outs must be preserved. Never write onboarding into project
instructions while in Plan mode.

Safety skills are **advisory**, not enforced. This adapter does not install or
overwrite `.xum/tool_pre`, user hooks, custom agents or workflow state machines.
A future enforcement integration needs ownership/coexistence and native blocking
tests. A future durable `autoplan` wrapper should reuse the proven phase contract,
not create a second approval/goal engine.

Repair with `./setup --host xum`; normal registered upgrades refresh that host's
render and runtime. Uninstall uses gstack ownership proof and leaves user skills
and unrelated configuration alone. See [host architecture](ADDING_A_HOST.md)
and the repository's current validation records for what has actually been tested.
