import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import { load } from 'js-yaml';

const ACTIONS = {
  checkout: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  setupNode: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  dockerLogin: 'docker/login-action@dbcb813823bdd20940b903addbd779551569679f',
  setupQemu: 'docker/setup-qemu-action@99012661954931238ded8c8b007157a8430204e1',
  setupBuildx: 'docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069',
  buildPush: 'docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc',
  trivy: 'aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25',
};

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
assert.deepEqual(Object.keys(releaseWorkflow.on), ['workflow_call']);
assert.equal(releaseWorkflow.on.workflow_call?.secrets, undefined);
assert.deepEqual(releaseWorkflow.permissions, { contents: 'write', packages: 'write' });

const releaseSteps = releaseWorkflow.jobs.release.steps;
const step = (name) => releaseSteps.find((entry) => entry.name === name);
assert.equal(step('Checkout repository').uses, ACTIONS.checkout);
assert.equal(step('Set up Node.js').uses, ACTIONS.setupNode);
assert.equal(step('Set up Node.js').with['node-version'], 24);
assert.equal(step('Log in to GitHub Container Registry').uses, ACTIONS.dockerLogin);
assert.equal(step('Log in to GitHub Container Registry').with.registry, 'ghcr.io');
assert.equal(step('Log in to Docker Hub'), undefined);
assert.equal(step('Set up QEMU').uses, ACTIONS.setupQemu);
assert.equal(step('Set up Docker Buildx').uses, ACTIONS.setupBuildx);

const snapshotTags = step('Snapshot release tags');
assert.ok(
  snapshotTags,
  'Release workflow must snapshot the stable SemVer tag set before publishing',
);
assert.equal(
  snapshotTags.run,
  '.github/scripts/resolve-release-tag.sh snapshot "$RUNNER_TEMP/release-tags-before.txt"',
);

const resolveRelease = step('Resolve published version');
assert.equal(
  resolveRelease.run,
  '.github/scripts/resolve-release-tag.sh resolve "$RUNNER_TEMP/release-tags-before.txt" "$GITHUB_OUTPUT"',
);

const verifyReleaseFailure = step('Verify release publication on semantic-release failure');
assert.ok(
  verifyReleaseFailure,
  'Release workflow must verify publication if semantic-release fails',
);
assert.equal(
  verifyReleaseFailure.if,
  "steps.semantic-release.outcome == 'failure' && steps.release.outputs.published != 'true'",
);

const buildTags = step('Build Docker tags');
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

const buildPush = step('Build and push image');
assert.equal(buildPush.uses, ACTIONS.buildPush);
assert.equal(buildPush.with.push, true);
assert.equal(buildPush.with.platforms, 'linux/amd64,linux/arm64');

const ciWorkflow = load(await readFile('.github/workflows/ci.yml', 'utf8'));
assert.equal(ciWorkflow.jobs.commitlint.steps[0].uses, ACTIONS.checkout);
assert.equal(ciWorkflow.jobs.commitlint.steps[1].uses, ACTIONS.setupNode);
assert.equal(ciWorkflow.jobs.commitlint.steps[1].with['node-version'], 24);

for (const jobName of ['format', 'lint', 'test', 'test-release', 'build']) {
  const job = ciWorkflow.jobs[jobName];
  assert.ok(job, `Job ${jobName} should exist in ci.yml`);
  assert.equal(job.steps[0].uses, ACTIONS.checkout);
  assert.equal(job.steps[1].uses, ACTIONS.setupNode);
  assert.equal(job.steps[1].with['node-version'], 24);
}
assert.equal(ciWorkflow.jobs.format.steps.at(-1).run, 'npm run format:check');

const containerJob = ciWorkflow.jobs.container;
assert.deepEqual(containerJob.needs, ['format', 'lint', 'test', 'test-release', 'build']);
assert.equal(containerJob.permissions.contents, 'read');
const containerStep = (name) => containerJob.steps.find((entry) => entry.name === name);
assert.equal(containerStep('Checkout repository').uses, ACTIONS.checkout);
assert.equal(containerStep('Set up Node.js').uses, ACTIONS.setupNode);
assert.equal(containerStep('Set up Node.js').with['node-version'], 24);
assert.equal(
  containerStep('Verify container configuration').run,
  'node scripts/test-container-config.mjs',
);
assert.equal(
  containerStep('Build production image').run,
  'docker build --pull --tag watchman:ci .',
);
assert.equal(
  containerStep('Verify production container').run,
  '.github/scripts/verify-container.sh watchman:ci',
);

const trivyReport = containerStep('Report all HIGH/CRITICAL vulnerabilities');
assert.ok(trivyReport, 'Container job must report all HIGH/CRITICAL vulnerabilities');
assert.equal(trivyReport.uses, ACTIONS.trivy);
assert.deepEqual(trivyReport.with, {
  'scan-type': 'image',
  'image-ref': 'watchman:ci',
  format: 'table',
  'exit-code': '0',
  'ignore-unfixed': false,
  'vuln-type': 'os,library',
  severity: 'CRITICAL,HIGH',
});

const trivyGate = containerStep('Gate on fixable HIGH/CRITICAL vulnerabilities');
assert.ok(trivyGate, 'Container job must gate on fixable HIGH/CRITICAL vulnerabilities');
assert.equal(trivyGate.uses, ACTIONS.trivy);
assert.deepEqual(trivyGate.with, {
  'scan-type': 'image',
  'image-ref': 'watchman:ci',
  format: 'table',
  'exit-code': '1',
  'ignore-unfixed': true,
  'vuln-type': 'os,library',
  severity: 'CRITICAL,HIGH',
});
assert.deepEqual(ciWorkflow.jobs.release.needs, [
  'commitlint',
  'format',
  'lint',
  'test',
  'test-release',
  'build',
  'container',
]);

const prTitleWorkflow = load(await readFile('.github/workflows/pr-title.yml', 'utf8'));
const prTitleSteps = prTitleWorkflow.jobs.commitlint.steps;
assert.equal(prTitleSteps[0].uses, ACTIONS.checkout);
assert.equal(prTitleSteps[1].uses, ACTIONS.setupNode);
assert.equal(prTitleSteps[1].with['node-version'], 24);
assert.equal(ciWorkflow.jobs.release.secrets, undefined);

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
