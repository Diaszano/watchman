#!/usr/bin/env node

/**
 * Synchronizes DOCKER_HUB.md with the Docker Hub repository description.
 *
 * Authenticates via Docker Hub API v2, then updates the repository's
 * full_description. Docker Hub access tokens work with the login endpoint
 * using username as username and the token as password.
 *
 * Required environment variables:
 *   DOCKERHUB_USERNAME - Docker Hub account or organization name
 *   DOCKERHUB_TOKEN    - Docker Hub access token
 *
 * Optional:
 *   DOCKER_REPO        - Repository name (defaults to "watchman")
 *   DOCKER_HUB_README  - Path to the README file (defaults to "DOCKER_HUB.md")
 */

import { readFile } from 'node:fs/promises';

const DOCKERHUB_USERNAME = process.env.DOCKERHUB_USERNAME;
const DOCKERHUB_TOKEN = process.env.DOCKERHUB_TOKEN;
const DOCKER_REPO = process.env.DOCKER_REPO ?? 'watchman';
const DOCKER_HUB_README = process.env.DOCKER_HUB_README ?? 'DOCKER_HUB.md';

if (!DOCKERHUB_USERNAME || !DOCKERHUB_TOKEN) {
  console.error(
    'Missing required environment variables: DOCKERHUB_USERNAME and DOCKERHUB_TOKEN',
  );
  process.exit(1);
}

let description;
try {
  description = await readFile(DOCKER_HUB_README, 'utf8');
} catch (error) {
  console.error(`Failed to read ${DOCKER_HUB_README}: ${error.message}`);
  process.exit(1);
}

// Authenticate with Docker Hub API v2 to get a JWT token
const loginUrl = 'https://hub.docker.com/v2/users/login/';
const loginResponse = await fetch(loginUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: DOCKERHUB_USERNAME, password: DOCKERHUB_TOKEN }),
});

if (!loginResponse.ok) {
  const errorText = await loginResponse.text().catch(() => 'unknown error');
  console.error(
    `Docker Hub login failed (${loginResponse.status} ${loginResponse.statusText}): ${errorText}`,
  );
  process.exit(1);
}

const { token } = await loginResponse.json();

// Update the repository description
const repoUrl = `https://hub.docker.com/v2/repositories/${DOCKERHUB_USERNAME}/${DOCKER_REPO}/`;
const updateResponse = await fetch(repoUrl, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Requested-With': 'XMLHttpRequest',
  },
  body: JSON.stringify({ full_description: description }),
});

if (!updateResponse.ok) {
  const errorText = await updateResponse.text().catch(() => 'unknown error');
  console.error(
    `Docker Hub API returned ${updateResponse.status} ${updateResponse.statusText}: ${errorText}`,
  );
  process.exit(1);
}

console.log(`Docker Hub README synced successfully for ${DOCKERHUB_USERNAME}/${DOCKER_REPO}`);
