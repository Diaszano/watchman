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
  { branch: 'dev', expectedExit: 0 },
  { branch: 'development', expectedExit: 0 },
  { branch: 'feature/example', expectedExit: 1 },
  { branch: vulnerableBranch, expectedExit: 1 },
];

for (const { branch, expectedExit } of testCases) {
  let script = policyStep.run;
  const env = { ...process.env };

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

console.log('CI branch policy security tests passed.');
