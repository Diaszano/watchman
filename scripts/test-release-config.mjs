import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { load } from 'js-yaml';

const config = JSON.parse(await readFile('.releaserc.json', 'utf8'));
const plugin = (name) =>
  config.plugins.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === name);

assert.deepEqual(config.branches, ['main']);
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

const npmPlugin = plugin('@semantic-release/npm');
assert.equal(npmPlugin[1].npmPublish, false);

const gitPlugin = plugin('@semantic-release/git');
assert.deepEqual(gitPlugin[1].assets, ['CHANGELOG.md', 'package.json', 'package-lock.json']);
assert.match(gitPlugin[1].message, /\[skip ci\]/);

const releaseWorkflow = load(await readFile('.github/workflows/release.yml', 'utf8'));
assert.deepEqual(Object.keys(releaseWorkflow.on), ['workflow_call']);
assert.deepEqual(releaseWorkflow.on.workflow_call.secrets, {
  DOCKERHUB_USERNAME: { required: true },
  DOCKERHUB_TOKEN: { required: true },
});
assert.deepEqual(releaseWorkflow.permissions, { contents: 'write' });

const releaseSteps = releaseWorkflow.jobs.release.steps;
const step = (name) => releaseSteps.find((entry) => entry.name === name);
assert.equal(step('Checkout repository').uses, 'actions/checkout@v6');
assert.equal(step('Set up Node.js').uses, 'actions/setup-node@v6');
assert.equal(step('Log in to Docker Hub').uses, 'docker/login-action@v4');
assert.equal(step('Set up QEMU').uses, 'docker/setup-qemu-action@v4');
assert.equal(step('Set up Docker Buildx').uses, 'docker/setup-buildx-action@v4');

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

const buildTags = step('Build Docker tags');
const runBuildTags = async ({ published, version = '' }) => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'watchman-docker-tags-'));
  const outputFile = join(outputDirectory, 'output');
  try {
    const result = spawnSync('bash', ['-c', `set -euo pipefail\n${buildTags.run}`], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_OUTPUT: outputFile,
        IMAGE: 'example/watchman',
        RELEASE_PUBLISHED: published,
        VERSION: version,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return await readFile(outputFile, 'utf8');
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
};

assert.equal(
  await runBuildTags({ published: 'false' }),
  'tags<<EOF\nexample/watchman:latest\nEOF\n',
);
assert.equal(
  await runBuildTags({ published: 'true', version: '2.3.4' }),
  [
    'tags<<EOF',
    'example/watchman:latest',
    'example/watchman:2.3.4',
    'example/watchman:2.3',
    'example/watchman:2',
    'EOF',
    '',
  ].join('\n'),
);

const buildPush = step('Build and push image');
assert.equal(buildPush.uses, 'docker/build-push-action@v7');
assert.equal(buildPush.with.push, true);
assert.equal(buildPush.with.platforms, 'linux/amd64,linux/arm64');

const ciWorkflow = load(await readFile('.github/workflows/ci.yml', 'utf8'));
assert.deepEqual(ciWorkflow.jobs.release.secrets, {
  DOCKERHUB_USERNAME: '${{ secrets.DOCKERHUB_USERNAME }}',
  DOCKERHUB_TOKEN: '${{ secrets.DOCKERHUB_TOKEN }}',
});

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
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=false\n');

  runChecked('git', ['tag', 'v1.2.3']);
  await writeFile(githubOutput, '');
  runChecked(resolver, ['resolve', beforeTags, githubOutput]);
  assert.equal(await readFile(githubOutput, 'utf8'), 'published=true\nversion=1.2.3\n');

  runChecked('git', ['tag', 'v2.0.0']);
  await writeFile(githubOutput, '');
  const multipleTags = run(resolver, ['resolve', beforeTags, githubOutput]);
  assert.notEqual(multipleTags.status, 0);
  assert.match(multipleTags.stderr, /multiple new stable release tags/i);
} finally {
  await rm(repository, { recursive: true, force: true });
}
