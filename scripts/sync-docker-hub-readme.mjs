#!/usr/bin/env node

/**
 * Synchronizes DOCKER_HUB.md with the Docker Hub repository description.
 *
 * Reads the local DOCKER_HUB.md file and pushes its content as the
 * full_description of the Docker Hub repository via the Docker Hub API.
 *
 * Required environment variables:
 *   DOCKERHUB_USERNAME - Docker Hub account or organization name
 *   DOCKERHUB_TOKEN    - Docker Hub access token with push permission
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

const url = `https://hub.docker.com/v2/repositories/${DOCKERHUB_USERNAME}/${DOCKER_REPO}/`;
const credentials = Buffer.from(`${DOCKERHUB_USERNAME}:${DOCKERHUB_TOKEN}`).toString(
  'base64',
);

const response = await fetch(url, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${credentials}`,
  },
  body: JSON.stringify({ full_description: description }),
});

if (!response.ok) {
  const errorText = await response.text().catch(() => 'unknown error');
  console.error(
    `Docker Hub API returned ${response.status} ${response.statusText}: ${errorText}`,
  );
  process.exit(1);
}

console.log(`Docker Hub README synced successfully for ${DOCKERHUB_USERNAME}/${DOCKER_REPO}`);
