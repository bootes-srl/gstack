/** Xum's discovery namespace is not its runtime asset tree. All registrations
 * here are fixture-owned: never run setup against the developer's HOME. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { assertFixtureWrite, cleanupFixtures, cleanupSeed, makeFixture, makeSource, put, registryRows, runSetup, tree } from './helpers/install-fixture';

afterEach(cleanupFixtures);
afterAll(cleanupSeed);

describe.skipIf(process.platform === 'win32')('Xum install lifecycle', () => {
  test('mux aliases xum, installs only siblings for discovery, and preserves user files across refresh/uninstall', () => {
    const f = makeFixture();
    const src = makeSource(f, join(f.dir, 'gstack'));
    const skills = join(f.home, '.xum/skills');
    const root = join(skills, 'gstack');
    put(join(skills, 'gstack-notes/SKILL.md'), 'my personal skill\n');
    put(join(f.home, 'personal-review/SKILL.md'), 'foreign review\n');
    assertFixtureWrite(join(skills, 'gstack-qa'));
    symlinkSync(join(f.home, 'personal-review'), join(skills, 'gstack-qa'));
    let r = runSetup(f, join(src, 'setup'), ['--host', 'mux']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(registryRows(f).map(row => row[0])).toEqual(['xum']);
    expect(realpathSync(join(root, 'bin'))).toBe(join(src, 'bin'));
    expect(realpathSync(join(skills, 'gstack-review'))).toBe(join(src, '.xum/skills/gstack-review'));
    const designDir = join(skills, 'gstack-design-review');
    expect(readFileSync(join(designDir, 'SKILL.md'), 'utf8')).toContain('sections/baseline.md');
    expect(readFileSync(join(designDir, 'sections/baseline.md'), 'utf8')).toContain('### Design Hard Rules');
    expect(existsSync(join(root, '.xum'))).toBe(false);
    expect(existsSync(join(root, 'review/SKILL.md'))).toBe(false);
    expect(existsSync(join(f.home, '.mux'))).toBe(false);
    expect(realpathSync(join(skills, 'gstack-qa'))).toBe(join(f.home, 'personal-review'));
    put(join(root, 'personal.txt'), 'keep me\n');
    put(join(root, 'review/personal.txt'), 'keep nested\n');
    r = runSetup(f, join(src, 'setup'), ['--host', 'xum']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(readFileSync(join(root, 'personal.txt'), 'utf8')).toBe('keep me\n');
    const un = spawnSync('bash', [join(src, 'bin/gstack-uninstall'), '--force', '--keep-state'], {
      cwd: f.home, env: f.env, encoding: 'utf8', timeout: 30_000,
    });
    expect(un.status, un.stdout + un.stderr).toBe(0);
    expect(existsSync(join(skills, 'gstack-review'))).toBe(false);
    expect(existsSync(join(root, 'bin'))).toBe(false);
    expect(readFileSync(join(root, 'personal.txt'), 'utf8')).toBe('keep me\n');
    expect(readFileSync(join(root, 'review/personal.txt'), 'utf8')).toBe('keep nested\n');
    expect(readFileSync(join(skills, 'gstack-notes/SKILL.md'), 'utf8')).toBe('my personal skill\n');
    expect(realpathSync(join(skills, 'gstack-qa'))).toBe(join(f.home, 'personal-review'));
    expect(registryRows(f).filter(row => row[0] === 'xum')).toEqual([]);
  }, 90_000);

  // Regression: the previous helper silently accepted old regular-file/new
  // symlink and old user-symlink/new symlink collisions. Activation then deleted
  // the customized old root. Real-directory/new symlink collisions had the same
  // hole. Refuse all three without following foreign symlinks or changing state.
  for (const kind of ['regular', 'symlink', 'directory']) test(`refuses ${kind} runtime collision before activation`, () => {
    const f = makeFixture();
    const src = makeSource(f, join(f.dir, 'gstack'));
    const skills = join(f.home, '.xum/skills');
    const root = join(skills, 'gstack');
    const setup = join(src, 'setup');
    let r = runSetup(f, setup, ['--host', 'xum']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    // Negative control: original manifest-proven generated leaves refresh.
    r = runSetup(f, setup, ['--host', 'xum']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const asset = join(root, kind === 'regular' ? 'ETHOS.md' : 'bin');
    assertFixtureWrite(root);
    rmSync(asset, { recursive: true, force: true }); // unlink, never follow
    if (kind === 'regular') put(asset, 'custom ethos\n');
    else if (kind === 'directory') put(join(asset, 'personal.txt'), 'custom tool\n');
    else {
      put(join(f.home, 'foreign-tool/personal.txt'), 'foreign tool\n');
      assertFixtureWrite(asset);
      symlinkSync(join(f.home, 'foreign-tool'), asset);
    }
    const oldRuntime = tree(root);
    const oldForeign = kind === 'symlink' ? tree(join(f.home, 'foreign-tool')) : undefined;
    const oldRegistry = registryRows(f);
    r = runSetup(f, setup, ['--host', 'xum']);
    expect(r.status, r.stdout + r.stderr).not.toBe(0);
    expect(r.stderr).toContain(`Xum runtime collision at ${asset}`);
    expect(tree(root)).toEqual(oldRuntime);
    if (kind === 'symlink') expect(tree(join(f.home, 'foreign-tool'))).toEqual(oldForeign);
    expect(registryRows(f)).toEqual(oldRegistry);
    expect(readdirSync(skills).filter(name => /^gstack\.gstack-(new|old)\./.test(name))).toEqual([]);
  }, 60_000);

  test('local alias requests reject before writing and user runtime collisions are left untouched', () => {
    const f = makeFixture();
    const src = makeSource(f, join(f.dir, 'gstack'));
    const before = tree(f.home);
    const local = runSetup(f, join(src, 'setup'), ['--host', 'mux', '--local']);
    expect(local.status).toBe(1);
    expect(local.stderr).toContain('--local is not supported for Xum');
    expect(tree(f.home)).toEqual(before);
    put(join(f.home, '.xum/skills/gstack/personal.txt'), 'not your runtime\n');
    const collision = runSetup(f, join(src, 'setup'), ['--host', 'xum']);
    expect(collision.status).not.toBe(0);
    expect(readFileSync(join(f.home, '.xum/skills/gstack/personal.txt'), 'utf8')).toBe('not your runtime\n');
  }, 60_000);

  for (const binary of ['xum', 'mux']) test(`auto detects ${binary} binary`, () => {
    const f = makeFixture();
    const src = makeSource(f, join(f.dir, 'gstack'));
    put(join(f.commands, binary), '#!/bin/sh\nexit 0\n', 0o755);
    const r = runSetup(f, join(src, 'setup'), ['--host', 'auto']);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(registryRows(f).some(row => row[0] === 'xum')).toBe(true);
    expect(existsSync(join(f.home, '.mux'))).toBe(false);
  }, 60_000);
});
