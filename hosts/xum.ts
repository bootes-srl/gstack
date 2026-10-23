import { defineHost, GBRAIN_RESOLVERS } from './define-host';

/** Xum is canonical; Mux is its supported compatibility command. */
const xum = defineHost({
  name: 'xum',
  displayName: 'Xum',
  cliAliases: ['mux'],
  tier: 'experimental',
  capabilities: {
    toolExecution: true,
    questions: 'prose', // Native structured questions are conditional and Plan-only.
    planMode: true,
    delegation: true,
    browser: true,
    safetyHooks: 'advisory',
  },
  // The runtime/assets root stays .xum/skills/gstack. Discoverable skills are
  // published separately as sibling gstack-* directories by setup/relink.
  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description', 'user-invocable', 'disable-model-invocation', 'argument-hint'],
    nameMatchesDirectory: true,
    descriptionLimit: 1024,
    descriptionLimitBehavior: 'error',
  },
  pathRewrites: [
    { from: '~/.claude/skills/gstack', to: '$GSTACK_ROOT' },
    { from: '.claude/skills/gstack', to: '.xum/skills/gstack' },
    { from: '.claude/skills/review', to: '.xum/skills/gstack/review' },
    { from: '.claude/skills', to: '.xum/skills' },
    { from: 'CLAUDE.md', to: 'AGENTS.md' },
  ],
  // Context-sensitive Plan, question and delegation guidance lives in the
  // Xum resolver contract, not a misleading global tool-name substitution.
  toolRewrites: {
    'use the Bash tool': 'use the bash tool',
    'use the Read tool': 'use the file_read tool',
    'use the Write tool': 'create the file with file_edit_insert in Exec mode',
    'use the Edit tool': 'use the exposed file_edit_* tools',
    'use the Agent tool': 'use the task tool when permitted by the current mode',
    "Claude Code's Agent tool": 'the task tool',
    'the Agent tool': 'the task tool',
    'Agent tool': 'task tool',
    'Skill tool': 'agent_skill_read tool',
    'use the Grep tool': 'search with bash',
    'use the Glob tool': 'find paths with bash',
  },
  suppressedResolvers: ['REVIEW_ARMY', ...GBRAIN_RESOLVERS],
});

export default xum;
