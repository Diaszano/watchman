import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';

const ciContent = await readFile('.github/workflows/ci.yml', 'utf8');
const ci = load(ciContent);

const commitlintJob = ci.jobs?.commitlint;
assert.ok(commitlintJob, 'commitlint job must exist in .github/workflows/ci.yml');

const policyStep = commitlintJob.steps?.find(
  (step) => step.name === 'Validate PR target branch policy',
);
assert.ok(policyStep, 'Validate PR target branch policy step must exist');
assert.ok(policyStep.run, 'Policy step must have a run script');

const vulnerableBranch = '$(echo$IFS"WATCHMAN_REVIEW_MARKER">&2)';

const testCases = [
  { branch: 'dev', repository: 'Diaszano/watchman', expectedExit: 0 },
  { branch: 'dev', repository: 'attacker/watchman', expectedExit: 1 },
  { branch: 'development', repository: 'attacker/watchman', expectedExit: 1 },
  { branch: 'development', expectedExit: 0 },
  { branch: 'feature/example', expectedExit: 1 },
  { branch: vulnerableBranch, expectedExit: 1 },
];

for (const { branch, repository = 'Diaszano/watchman', expectedExit } of testCases) {
  let script = policyStep.run;
  const env = {
    ...process.env,
    HEAD_REPOSITORY: repository,
    GITHUB_REPOSITORY: 'Diaszano/watchman',
  };

  if (policyStep.run.includes('${{ github.head_ref }}')) {
    // Simulate runner context interpolation
    script = policyStep.run.replaceAll('${{ github.head_ref }}', branch);
  } else {
    // Treat branch as data passed via environment variable
    env.GITHUB_HEAD_REF = branch;
  }

  const result = spawnSync('bash', ['-c', script], {
    env,
    encoding: 'utf8',
  });

  const combinedOutput = `${result.stdout || ''}${result.stderr || ''}`;

  assert.equal(
    combinedOutput.includes('WATCHMAN_REVIEW_MARKER'),
    false,
    `Security vulnerability detected: branch name executed code! Output contained WATCHMAN_REVIEW_MARKER for branch "${branch}"`,
  );

  assert.equal(
    result.status,
    expectedExit,
    `Expected exit code ${expectedExit} for branch "${branch}", got ${result.status}. Output: ${combinedOutput}`,
  );
}

// Ensure the workflow itself uses the secure pattern
assert.ok(
  !policyStep.run.includes('${{ github.head_ref }}'),
  'Workflow run script must not interpolate github.head_ref directly',
);
assert.equal(
  policyStep.env?.GITHUB_HEAD_REF,
  '${{ github.head_ref }}',
  'Workflow step must pass GITHUB_HEAD_REF via env',
);

assert.equal(
  policyStep.env?.HEAD_REPOSITORY,
  '${{ github.event.pull_request.head.repo.full_name }}',
);

const aggregate = ci.jobs['lint-test-build'];
const requiredJobs = ['commitlint', 'format', 'lint', 'test', 'test-release', 'build', 'container'];
for (const job of [...requiredJobs, 'dependency-review']) {
  assert.ok(aggregate.needs.includes(job), `Required check must wait for ${job}`);
}
assert.equal(aggregate.if, 'always()');
const aggregateStep = aggregate.steps[0];
for (const job of requiredJobs) {
  assert.ok(aggregateStep.env.REQUIRED_RESULTS.includes('${{ needs.' + job + '.result }}'));
}
assert.equal(aggregateStep.env.DEPENDENCY_REVIEW_RESULT, '${{ needs.dependency-review.result }}');
assert.equal(aggregateStep.env.EVENT_NAME, '${{ github.event_name }}');
assert.ok(ci.jobs.test.steps.some((step) => step.run === 'npm run audit:production'));

const runAggregate = (results, review, event) =>
  spawnSync('bash', ['-c', aggregateStep.run], {
    encoding: 'utf8',
    env: {
      ...process.env,
      REQUIRED_RESULTS: results.join(' '),
      DEPENDENCY_REVIEW_RESULT: review,
      EVENT_NAME: event,
    },
  });
const successful = requiredJobs.map(() => 'success');
assert.equal(runAggregate(successful, 'success', 'pull_request').status, 0);
assert.equal(runAggregate(successful, 'skipped', 'push').status, 0);
for (const result of ['failure', 'cancelled', 'skipped']) {
  for (const index of requiredJobs.keys()) {
    const results = [...successful];
    results[index] = result;
    assert.equal(
      runAggregate(results, 'success', 'pull_request').status,
      1,
      `${requiredJobs[index]} ${result} must block merging`,
    );
  }
  assert.equal(runAggregate(successful, result, 'pull_request').status, 1);
}
for (const job of Object.values(ci.jobs)) {
  for (const step of job.steps ?? []) {
    if (step.uses?.startsWith('actions/checkout@')) {
      assert.equal(
        step.with?.['persist-credentials'],
        false,
        'Validation jobs must not persist credentials',
      );
    }
  }
}
console.log('CI branch policy and required checks security tests passed.');
