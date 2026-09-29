import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import { load } from 'js-yaml';

const config = JSON.parse(await readFile('.releaserc.json', 'utf8'));
const plugin = (name) =>
  config.plugins.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === name);

assert.deepEqual(config.branches, ['main', { name: 'dev', prerelease: 'dev' }]);
assert.equal(config.tagFormat, 'v${version}');

const analyzer = plugin('@semantic-release/commit-analyzer');
assert.ok(Array.isArray(analyzer));
const rules = new Map(analyzer[1].releaseRules.map(({ type, release }) => [type, release]));
assert.equal(rules.get('feat'), 'minor');
assert.equal(rules.get('fix'), 'patch');
assert.equal(rules.get('perf'), 'patch');
assert.equal(rules.get('revert'), 'patch');
for (const type of ['build', 'chore', 'ci', 'docs', 'refactor', 'style', 'test']) {
  assert.equal(rules.get(type), false);
}

const analyze = (message) =>
  analyzeCommits(analyzer[1], {
    commits: [{ hash: 'release-policy-test', message }],
    cwd: process.cwd(),
    logger: { log() {} },
  });

for (const message of [
  'feat!: break the public API',
  'chore!: break the maintenance API',
  'feat: break the public API\n\nBREAKING CHANGE: callers must migrate',
  'docs: document a breaking API\n\nBREAKING CHANGE: callers must migrate',
]) {
  assert.equal(await analyze(message), 'major', `Expected a major release for: ${message}`);
}

const npmPlugin = plugin('@semantic-release/npm');
assert.equal(npmPlugin[1].npmPublish, false);

const notesPlugin = plugin('@semantic-release/release-notes-generator');
assert.ok(Array.isArray(notesPlugin));
const generatedNotes = await generateNotes(notesPlugin[1], {
  commits: [
    {
      hash: '1234567890123456789012345678901234567890',
      message: 'feat(ui): example',
    },
  ],
  cwd: process.cwd(),
  logger: { log() {} },
  options: { repositoryUrl: 'https://github.com/Diaszano/watchman' },
  lastRelease: { gitTag: 'v1.5.0', version: '1.5.0' },
  nextRelease: { gitTag: 'v1.6.0', version: '1.6.0' },
});
assert.match(generatedNotes, /### Features/i);
assert.match(generatedNotes, /\*\*ui:\*\* example/);

const releaseWorkflow = load(await readFile('.github/workflows/release.yml', 'utf8'));
const releaseSteps = releaseWorkflow.jobs.release.steps;
const buildTags = releaseSteps.find((entry) => entry.name === 'Build Docker tags');
assert.ok(buildTags?.run, 'Release workflow must define a "Build Docker tags" step');

const runBuildTags = async ({ published, version = '', refName = 'main' }) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'watchman-docker-tags-'));
  const outputFile = join(outputDirectory, 'output');
  try {
    const result = spawnSync('bash', ['-c', `set -euo pipefail\n${buildTags.run}`], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputFile,
        GHCR_IMAGE: 'ghcr.io/example/watchman',
        RELEASE_PUBLISHED: published,
        VERSION: version,
        REF_NAME: refName,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return await readFile(outputFile, 'utf8');
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
};

assert.equal(
  await runBuildTags({ published: 'false', refName: 'main' }),
  'primary_image=ghcr.io/example/watchman:latest\ntags<<EOF\nghcr.io/example/watchman:latest\nEOF\n',
);
assert.equal(
  await runBuildTags({ published: 'true', version: '2.3.4', refName: 'main' }),
  [
    'primary_image=ghcr.io/example/watchman:2.3.4',
    'tags<<EOF',
    'ghcr.io/example/watchman:latest',
    'ghcr.io/example/watchman:2.3.4',
    'ghcr.io/example/watchman:2.3',
    'ghcr.io/example/watchman:2',
    'EOF',
    '',
  ].join('\n'),
);
assert.equal(
  await runBuildTags({ published: 'false', refName: 'dev' }),
  'primary_image=ghcr.io/example/watchman:dev\ntags<<EOF\nghcr.io/example/watchman:dev\nEOF\n',
);
assert.equal(
  await runBuildTags({ published: 'true', version: '2.3.4-dev.1', refName: 'dev' }),
  [
    'primary_image=ghcr.io/example/watchman:2.3.4-dev.1',
    'tags<<EOF',
    'ghcr.io/example/watchman:dev',
    'ghcr.io/example/watchman:2.3.4-dev.1',
    'EOF',
    '',
  ].join('\n'),
);

const resolver = resolve('.github/scripts/resolve-release-tag.sh');
const repository = await mkdtemp(join(tmpdir(), 'watchman-release-tags-'));
const beforeTags = join(repository, 'before-tags');
const githubOutput = join(repository, 'github-output');
const run = (command, args) =>
  spawnSync(command, args, { cwd: repository, encoding: 'utf8', env: process.env });
const runChecked = (command, args) => {
  const result = run(command, args);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

try {
  runChecked('git', ['init', '--quiet']);
  runChecked('git', ['config', 'user.name', 'Release Test']);
  runChecked('git', ['config', 'user.email', 'release-test@example.com']);
  runChecked('git', ['commit', '--allow-empty', '--no-gpg-sign', '--message', 'test fixture']);
  runChecked('git', ['tag', 'v1.0.0']);
  runChecked('git', ['tag', 'v999-archive']);

  runChecked(resolver, ['snapshot', beforeTags]);
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=false\n');

  runChecked('git', ['tag', 'v1000-archive']);
  runChecked('git', ['tag', 'v01.2.3']);
  runChecked('git', ['tag', 'v1.2.3-beta.1']);
  runChecked('git', ['tag', 'v1.6.0-dev.01']);
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=false\n');

  runChecked('git', ['tag', 'v1.6.0-dev.2']);
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=true\nversion=1.6.0-dev.2\n');

  runChecked('git', ['tag', 'v1.2.3']);
  await writeFile(githubOutput, '');
  const multipleMixedTags = run(resolver, ['resolve', beforeTags, githubOutput]);
  assert.notEqual(multipleMixedTags.status, 0);
  assert.match(multipleMixedTags.stderr, /multiple new release tags/i);

  runChecked(resolver, ['snapshot', beforeTags]);
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=false\n');

  runChecked('git', ['tag', 'v2.0.0']);
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=true\nversion=2.0.0\n');

  runChecked('git', ['tag', 'v2.0.1']);
  await writeFile(githubOutput, '');
  const multipleStableTags = run(resolver, ['resolve', beforeTags, githubOutput]);
  assert.notEqual(multipleStableTags.status, 0);
  assert.match(multipleStableTags.stderr, /multiple new release tags/i);
} finally {
  await rm(repository, { recursive: true, force: true });
}
