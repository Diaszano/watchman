# Plano de Melhorias — Repositório Docker Hub `diaszano/watchman`

> **Para workers agentic:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommendado) ou executing-plans para implementar este plano tarefa por tarefa. Steps usam checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Elevar a qualidade do repositório Docker Hub `diaszano/watchman`, automatizar a manutenção da descrição, adicionar metadados OCI, publicar também no GHCR como fallback, automatizar atualização de digests, gerar SBOM, e adicionar badges de Docker ao README do GitHub.

**Arquitetura:** O CI/CD existente já publica imagens multi-arquitetura no Docker Hub via Semantic Release. Vamos estender esse pipeline sem quebrar o fluxo existente — tudo aditivo.

**Tech Stack:** Docker, GitHub Actions, Docker Hub API, GitHub Container Registry, Dependabot, Cosign (opcional).

## Restrições Globais

- Não alterar o comportamento de publicação existente (tags, versões, Semantic Release).
- Manter compatibilidade com o Docker Compose atual.
- Todas as Actions do GitHub devem continuar usando SHA imutáveis com comentários de versão.
- Não modificar o código da aplicação (React, Vite, Tailwind, etc.).
- Não alterar o Dockerfile, docker-compose.yml, ou nginx.conf a menos que explicitamente listado.

---

## Tarefa 1: Adicionar labels OCI ao Dockerfile

**Arquivos:**
- Modificar: `Dockerfile`

**Por quê:** Labels OCI (`org.opencontainers.image.*`) fornecem metadados padronizados que aparecem no Docker Hub, em `docker inspect`, e em ferramentas de supply chain.

- [ ] Adicionar labels OCI no stage `runtime` do Dockerfile:

```dockerfile
LABEL org.opencontainers.image.title="Watchman"
LABEL org.opencontainers.image.description="Interactive browser screensaver to reduce OLED burn-in risk"
LABEL org.opencontainers.image.url="https://github.com/diaszano/watchman"
LABEL org.opencontainers.image.source="https://github.com/diaszano/watchman"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="diaszano"
```

- [ ] Verificar com `docker inspect` se as labels aparecem:

```bash
docker build --tag watchman:oci-test .
docker image inspect --format '{{json .Config.Labels}}' watchman:oci-test | jq .
```

- [ ] Commitar: `git add Dockerfile && git commit -m "feat(docker): add OCI labels to production image"`

---

## Tarefa 2: Publicar também no GitHub Container Registry (GHCR)

**Arquivos:**
- Modificar: `.github/workflows/release.yml`

**Por quê:** GHCR serve como mirror/fallback confiável caso o Docker Hub esteja indisponível. Integra nativamente com o ecossistema GitHub e dá mais visibilidade ao projeto.

- [ ] Adicionar step de login no GHCR antes do build:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@af1e73f918a031802d376d3c8bbc3fe56130a9b0 # v4
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] Estender o build de tags para incluir `ghcr.io`:

No step `Build Docker tags`, adicionar as mesmas tags com prefixo `ghcr.io/${{ github.repository }}`.

- [ ] Modificar o step `Build and push image` — o `docker/build-push-action` já aceita múltiplas tags, então basta incluir as do GHCR na lista.

- [ ] Verificar: a Action `GITHUB_TOKEN` tem permissão `contents: write` e `packages: write` por padrão, mas validar.

- [ ] Commitar: `git add .github/workflows/release.yml && git commit -m "feat(ci): publish image to GitHub Container Registry"`

---

## Tarefa 3: Sincronizar README do Docker Hub automaticamente

**Arquivos:**
- Criar: `scripts/sync-docker-hub-readme.mjs`
- Criar: `DOCKER_HUB.md`
- Modificar: `.github/workflows/release.yml`

**Por quê:** O repositório do Docker Hub tem uma seção de descrição separada do GitHub. Sincronizar automaticamente garante que usuários no Docker Hub vejam instruções atualizadas de uso.

- [ ] Criar `DOCKER_HUB.md` com conteúdo otimizado para o Docker Hub (mais enxuto que o README.md, focado em instruções de Docker):

```markdown
# Watchman

Interactive browser screensaver to reduce OLED burn-in risk.

## Quick start

```bash
docker run --rm -p 8080:8080 diaszano/watchman
```

Open http://localhost:8080

## Tags

- `latest`: latest stable release
- `X.Y.Z`, `X.Y`, `X`: semantic version tags

## Platforms

linux/amd64, linux/arm64

## Development

See [GitHub repository](https://github.com/diaszano/watchman) for full documentation.
```

- [ ] Criar `scripts/sync-docker-hub-readme.mjs` que usa a API do Docker Hub para atualizar a descrição:

```javascript
// Lê DOCKER_HUB.md, faz PUT na API do Docker Hub
// Usa DOCKERHUB_USERNAME e DOCKERHUB_TOKEN como auth
```

- [ ] Adicionar step no workflow de release para executar o script após o push:

```yaml
- name: Sync Docker Hub README
  env:
    DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
    DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}
  run: node scripts/sync-docker-hub-readme.mjs
```

- [ ] Commitar: `git add DOCKER_HUB.md scripts/sync-docker-hub-readme.mjs .github/workflows/release.yml && git commit -m "feat(ci): sync Docker Hub README on release"`

---

## Tarefa 4: Gerar SBOM na publicação

**Arquivos:**
- Modificar: `.github/workflows/release.yml`

**Por quê:** SBOM (Software Bill of Materials) permite rastreabilidade de dependências e vulnerabilidades. O Docker Hub mostra isso nativamente quando anexado. É uma prática recomendada de supply chain security.

- [ ] Adicionar step após o build/push para gerar SBOM com o `docker buildx imagetools` ou `syft`:

Opção com Docker Buildx (já disponível):

```yaml
- name: Generate SBOM
  run: |
    docker buildx imagetools inspect \
      ${{ secrets.DOCKERHUB_USERNAME }}/watchman:latest \
      --format '{{json .Manifest}}' > /dev/null
    # Alternativa: usar syft para SBOM mais detalhado
    # (requer instalar syft)
```

Opção mais robusta com Anchore Syft:

```yaml
- name: Generate and attach SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ${{ secrets.DOCKERHUB_USERNAME }}/watchman:latest
    format: spdx-json
    output-file: sbom.spdx.json
```

- [ ] (Opcional) Fazer upload do SBOM como artefato do release:

```yaml
- name: Upload SBOM to release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh release upload v${{ steps.release.outputs.version }} sbom.spdx.json
```

- [ ] Commitar: `git add .github/workflows/release.yml && git commit -m "feat(ci): generate SBOM on release"`

---

## Tarefa 5: Atualização automática de digests com Dependabot

**Arquivos:**
- Criar: `.github/dependabot.yml`

**Por quê:** As imagens base `node:24-alpine` e `nginx:1.30.3-alpine-slim` estão pinned por digest SHA, mas ficam obsoletas com o tempo (novos patches de segurança). Dependabot pode abrir PRs automáticos para atualizar esses digests.

- [ ] Criar `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Sao_Paulo"
    open-pull-requests-limit: 3
    labels:
      - "dependencies"
      - "docker"
    commit-message:
      prefix: "fix(docker)"
      include: "scope"
```

- [ ] Commitar: `git add .github/dependabot.yml && git commit -m "chore(ci): automate base image digest updates with Dependabot"`

---

## Tarefa 6: Adicionar badges de Docker ao README do GitHub

**Arquivos:**
- Modificar: `README.md`

**Por quê:** Badges de "Docker Pulls", "Docker Image Size", "Docker Image Version" dão credibilidade e informação rápida para visitantes do repositório.

- [ ] Adicionar badges no topo do `README.md`, após o título:

```markdown
<p align="center">
  <a href="https://hub.docker.com/r/diaszano/watchman">
    <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Docker Image Version" src="https://img.shields.io/docker/v/diaszano/watchman?style=flat-square&logo=docker">
  </a>
</p>
```

- [ ] Verificar visualmente com `npm run dev` ou apenas review do markdown.

- [ ] Commitar: `git add README.md && git commit -m "docs: add Docker Hub badges to README"`

---

## Tarefa 7: (Opcional) Assinar imagem com Cosign

**Arquivos:**
- Modificar: `.github/workflows/release.yml`

**Por quê:** Assinar a imagem com Cosign permite que usuários verifiquem a integridade e autenticidade. É uma prática de supply chain security nível enterprise.

- [ ] Adicionar step de geração de key pair (ou usar keyless com GitHub OIDC):

```yaml
- name: Sign image with Cosign
  env:
    COSIGN_EXPERIMENTAL: "1"
  run: |
    cosign sign --yes \
      ${{ secrets.DOCKERHUB_USERNAME }}/watchman:latest
```

- [ ] Commitar: `git add .github/workflows/release.yml && git commit -m "feat(ci): sign Docker images with Cosign"`

---

## Verificação Final

- [ ] Rodar `npm run test:release` para validar que as alterações nos workflows não quebraram asserts existentes.
- [ ] Rodar `node scripts/test-container-config.mjs` para validar configuração do container.
- [ ] Revisar diff geral: `git diff --stat`
- [ ] git status limpo, todos os Commits feitos.

---

## Resumo dos Commits

1. `feat(docker): add OCI labels to production image`
2. `feat(ci): publish image to GitHub Container Registry`
3. `feat(ci): sync Docker Hub README on release`
4. `feat(ci): generate SBOM on release`
5. `chore(ci): automate base image digest updates with Dependabot`
6. `docs: add Docker Hub badges to README`
7. (opcional) `feat(ci): sign Docker images with Cosign`
