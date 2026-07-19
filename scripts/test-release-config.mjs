import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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

const workflow = await readFile('.github/workflows/release.yml', 'utf8');
for (const requiredText of [
  'linux/amd64,linux/arm64',
  'DOCKERHUB_USERNAME',
  'DOCKERHUB_TOKEN',
  'docker/setup-qemu-action@v4',
  'docker/setup-buildx-action@v4',
  'docker/build-push-action@v7',
]) {
  assert.ok(workflow.includes(requiredText), `Missing release workflow contract: ${requiredText}`);
}
