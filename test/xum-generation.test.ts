import { RESOLVERS } from '../scripts/resolvers';
import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runGeneration } from '../scripts/gen-skill-docs';
import { HOST_PATHS, type TemplateContext } from '../scripts/resolvers/types';
import { generatePreamble } from '../scripts/resolvers/preamble';
import { generatePlanModeInfo, generateCompletionStatus } from '../scripts/resolvers/preamble/generate-completion-status';
import { generateExitPlanModeGate, generatePlanReviewApprovalCheck, generatePlanCompletionAuditReview, generatePlanCompletionGateShip } from '../scripts/resolvers/plan-gates';
import { adaptXumWorkflow } from '../scripts/resolvers/xum';
import { usesLazySections } from '../scripts/resolvers/sections';
import { generateDesignMethodology, generateDesignHardRules } from '../scripts/resolvers/design';

function context(host: TemplateContext['host']): TemplateContext {
  return { host, skillName: 'plan-eng-review', tmplPath: 'plan-eng-review/SKILL.md.tmpl', paths: HOST_PATHS[host], preambleTier: 3 };
}
// A cast keeps this test independent of host-enumeration source ordering.
const xum = context('xum' as TemplateContext['host']);

describe('native Xum mode-safe generation', () => {
  test('Plan contract scopes edits, tools, decisions, goals and patch integration', () => {
    const text = generatePlanModeInfo(xum);
    for (const required of ['exact plan file', 'Explore', 'propose_plan', 'ask_user_question',
      'never consent', 'headless', 'BLOCKED', 'task_apply_git_patch', 'committed state',
      'top-level agent', 'No push', 'actually tested']) {
      // Consent sentence uses explicit plural alternatives rather than shorthand.
      if (required === 'never consent') expect(text).toContain('is never consent');
      else expect(text).toContain(required);
    }
    expect(text).not.toContain('XUM_PLAN_FILE');
  });

  test('preamble and completion do not demand state-writing bootstrap or always-run exceptions', () => {
    const text = generatePreamble(xum) + generateCompletionStatus(xum);
    for (const forbidden of ['gstack-skill-start --', 'gstack-skill-end --', 'gstack-learnings-log',
      'PLAN MODE EXCEPTION', 'ExitPlanMode']) expect(text).not.toContain(forbidden);
    expect(text).toContain('exact runtime-provided plan file');
    expect(text).toContain('Evidence');
  });

  test('native gates do not scan foreign plans or require forbidden logs', () => {
    const text = generateExitPlanModeGate(xum) + generatePlanReviewApprovalCheck(xum)
      + generatePlanCompletionAuditReview(xum) + generatePlanCompletionGateShip(xum, ['discovery']);
    expect(text).toContain('runtime-provided exact plan path');
    expect(text).toContain('actual answer');
    expect(text).not.toContain('$HOME/.claude/plans');
    expect(text).not.toContain('$HOME/.codex/plans');
    expect(text).not.toContain('PLAN_CANDIDATE:');
  });

  test('legacy inline commands and menus are explicitly Exec-only; other hosts are byte-identical', () => {
    const recipe = '---\nname: example\n---\nFirst tool call = AskUserQuestion\nPLAN MODE EXCEPTION — ALWAYS RUN\n```bash\nmkdir -p ~/.gstack\n```\nExitPlanMode\n';
    const output = adaptXumWorkflow(recipe, xum);
    expect(output.startsWith('---\nname: example\n---\n')).toBe(true);
    expect(output).toContain('Exec-only recipe');
    expect(output).toContain('Do not execute the recipe');
    expect(output).not.toContain('ExitPlanMode');
    expect(output).not.toContain('AskUserQuestion');
    expect(output).not.toContain('PLAN MODE EXCEPTION — ALWAYS RUN');
    for (const host of ['claude', 'codex', 'cursor'] as const) {
      expect(adaptXumWorkflow(recipe, context(host))).toBe(recipe);
    }
    expect(generatePlanModeInfo(context('claude'))).toContain('AskUserQuestion');
    expect(generateCompletionStatus(context('claude'))).toContain('gstack-skill-end');
    expect(generateExitPlanModeGate(context('claude'))).toContain('ExitPlanMode');
  });

  test('design baseline carve preserves complete ordered criteria for inline hosts', () => {
    const authored = fs.readFileSync(path.resolve(import.meta.dir, '../design-review/sections/baseline.md.tmpl'), 'utf8');
    expect(authored).toBe('{{DESIGN_METHODOLOGY}}\n\n{{DESIGN_HARD_RULES}}\n');
    const ctx = { ...context('codex'), skillName: 'design-review' };
    expect(usesLazySections('codex', 'design-review')).toBe(false);
    expect(usesLazySections(xum.host, 'design-review')).toBe(true);
    expect((RESOLVERS.DESIGN_REVIEW_BASELINE as Function)(ctx)).toBe(authored.trimEnd());
    const expanded = authored.trimEnd()
      .replace('{{DESIGN_METHODOLOGY}}', generateDesignMethodology(ctx))
      .replace('{{DESIGN_HARD_RULES}}', generateDesignHardRules(ctx));
    expect(expanded).toBe(generateDesignMethodology(ctx) + '\n\n' + generateDesignHardRules(ctx));
  });

  test('complete planning renders and lazy sections carry native dispatch', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xum-generation-'));
    try {
      const result = await runGeneration({ host: xum.host, outputRoot: dir });
      expect(result.diagnostics.filter(d => d.kind === 'error')).toEqual([]);
      expect(result.exitCode).toBe(0);
      for (const skill of ['plan-eng-review', 'plan-ceo-review', 'plan-design-review', 'design-review']) {
        const file = path.join(dir, '.xum', 'skills', `gstack-${skill}`, 'SKILL.md');
        const text = fs.readFileSync(file, 'utf8');
        expect(text).toContain('Xum workflow dispatch');
        expect(text).toContain('In Exec only, initialize gstack');
        expect(text).toContain('gstack-skill-start');
        const sectionsDir = path.join(path.dirname(file), 'sections');
        expect(fs.existsSync(sectionsDir)).toBe(true);
        expect(text).toContain('sections/');
        if (skill === 'plan-design-review') {
          expect(text.indexOf('Reply with A, B, or C')).toBeLessThan(text.indexOf('gstack-skill-start'));
        }
        expect(text).not.toContain('Model-Specific Behavioral Patch (claude)');
        expect(text).not.toContain('Skill tool');
        expect(text).toContain('BEGIN EXEC-ONLY RECIPE');
        expect(text).toContain('propose_plan');
        expect(text).not.toContain('ExitPlanMode');
        expect(text).not.toContain('AskUserQuestion');
        expect(text).not.toContain('PLAN MODE EXCEPTION — ALWAYS RUN');
        const sections = path.join(path.dirname(file), 'sections');
        if (fs.existsSync(sections)) for (const section of fs.readdirSync(sections)) {
          const body = fs.readFileSync(path.join(sections, section), 'utf8');
          expect(body).toContain('Xum workflow dispatch');
          expect(body).not.toContain('ExitPlanMode');
          expect(body).not.toContain('gstack-skill-start');
        }
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);
});
