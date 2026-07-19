import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const NODE_IMAGE =
  'node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd';
const NGINX_IMAGE =
  'nginx:1.30.3-alpine-slim@sha256:d5b51cfc7d55fc7a7bcf4d1d577b9c3738331df56d68f0b1d8ac9795b9470a5a';

const composeConfig = (...extraArgs) => {
  const result = spawnSync(
    'docker',
    ['compose', ...extraArgs, 'config', '--format', 'json'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

const port = (service, target) =>
  service.ports.find((entry) => entry.target === target && entry.protocol === 'tcp');

const dockerfile = await readFile('Dockerfile', 'utf8');
assert.match(dockerfile, new RegExp(NODE_IMAGE.replaceAll('.', '\\.')));
assert.match(dockerfile, new RegExp(NGINX_IMAGE.replaceAll('.', '\\.')));
assert.match(dockerfile, /^USER nginx$/m);
assert.match(dockerfile, /^EXPOSE 8080$/m);

const developmentDockerfile = await readFile('Dockerfile.dev', 'utf8');
assert.match(developmentDockerfile, new RegExp(NODE_IMAGE.replaceAll('.', '\\.')));
assert.match(developmentDockerfile, /^RUN npm ci$/m);
assert.doesNotMatch(developmentDockerfile, /^RUN npm install$/m);

const production = composeConfig();
const web = production.services.web;
const webPort = port(web, 8080);
assert.ok(webPort, 'web must publish container port 8080');
assert.equal(webPort.host_ip, '127.0.0.1');
assert.equal(webPort.published, '8080');
assert.equal(web.read_only, true);
assert.ok(web.security_opt.includes('no-new-privileges:true'));
assert.ok(web.tmpfs.some((entry) => entry.startsWith('/tmp:')));

const development = composeConfig('--profile', 'dev');
const dev = development.services.dev;
const devPort = port(dev, 5173);
assert.ok(devPort, 'dev must publish container port 5173');
assert.equal(devPort.host_ip, '127.0.0.1');
assert.equal(devPort.published, '5173');

console.log('Container configuration verification passed');
