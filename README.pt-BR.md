# Watchman

<p align="center">
  <a href="README.md">English</a> · <strong>Português (Brasil)</strong>
</p>

<p align="center">
  <img src="public/logo.png" alt="Watchman" width="480">
</p>

<p align="center">
  <a href="https://hub.docker.com/r/diaszano/watchman">
    <img alt="Downloads no Docker" src="https://img.shields.io/docker/pulls/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Tamanho da imagem Docker" src="https://img.shields.io/docker/image-size/diaszano/watchman?style=flat-square&logo=docker">
    <img alt="Versão da imagem Docker" src="https://img.shields.io/docker/v/diaszano/watchman?style=flat-square&logo=docker">
  </a>
  <a href="https://github.com/diaszano/watchman/pkgs/container/watchman">
    <img alt="GHCR" src="https://img.shields.io/badge/GHCR-disponível-blue?style=flat-square&logo=github">
  </a>
</p>

Um protetor de tela interativo para navegador que mantém a tela visualmente ativa para ajudar a reduzir o risco de **burn-in em OLED** — com um visual agradável. Escrito inteiramente em TypeScript.

Dez modos de animação, configurações ajustáveis em tempo real, mecanismo anti burn-in, playlists, suporte a PWA/offline e implantação com Docker em um único comando.

---

## Recursos

- **10 modos de animação** — Logo DVD, Relógio Digital, Sistema de Partículas, Bolhas Flutuantes, Campo Estelar (paralaxe), Chuva Matrix, Linhas Neon, Formas Geométricas, Logo Personalizado (envio de imagem) e Texto Personalizado.
- **Mecanismo anti burn-in** — deslocamento global e movimento próprio de cada modo para que nada fique estático.
- **Configuração em tempo real** — velocidade, quantidade de objetos, tamanho, cores, fundo (sólido, gradiente ou imagem), opacidade, brilho e limite de FPS.
- **Controles relevantes por animação** — cada modo exibe somente as configurações que o afetam.
- **Playlist automática** — selecione favoritos, defina o intervalo de troca e escolha a ordem sequencial ou aleatória.
- **Screen Wake Lock API** — mantém a tela ligada durante a execução, recupera o bloqueio automaticamente e exibe um aviso quando o recurso não é suportado.
- **API de tela cheia**, **atalhos de teclado**, **interface que se oculta automaticamente** e **monitor de FPS** opcional.
- **Painel de atalhos integrado** — pressione `H` a qualquer momento para ver todos os atalhos.
- **Preferências persistentes** — as configurações são salvas no LocalStorage e restauradas na próxima visita.
- **Temas claro e escuro** e interface em **inglês ou português**.
- **Diálogo de configurações acessível** — semântica nativa de diálogo e gerenciamento do foco pelo teclado.
- **PWA** — instalável e disponível offline por meio de um service worker.
- Compatível com **High-DPI, 4K e ultrawide**, com canvas dimensionado pelo DPR e limitado para manter o desempenho previsível.

## Renderização

O canvas acompanha a proporção de pixels do dispositivo, limitada a 2 para manter o desempenho previsível em telas de alta resolução. Use o limite de FPS (30, 60, 120 ou ilimitado) para equilibrar fluidez e consumo de energia. Imagens de fundo e logos enviados permanecem neste navegador por meio do IndexedDB e são limitados a 5 MiB cada.

## Capturas de tela

| Início                   | Reprodução                     |
| ------------------------ | ------------------------------ |
| ![Início](docs/home.png) | ![Reprodução](docs/player.png) |

## Atalhos de teclado

| Tecla     | Ação                          |
| --------- | ----------------------------- |
| `F`       | Ativar ou sair da tela cheia  |
| `Espaço`  | Pausar ou continuar           |
| `Esc`     | Sair da tela cheia            |
| `S`       | Abrir ou fechar configurações |
| `N`       | Próxima animação              |
| `P`       | Animação anterior             |
| `H` / `?` | Abrir ou fechar os atalhos    |

`Esc` também fecha o painel de configurações quando ele está aberto.

## Tecnologias

TypeScript · React 19 · Vite · Tailwind CSS v4 · Zustand · Vitest · ESLint · Prettier · Docker · Nginx.

---

## Instalação

Requer Node.js 24 (execute `nvm use` se o nvm estiver instalado).

```bash
npm ci
```

Use `npm install` somente ao alterar dependências intencionalmente, pois esse comando atualiza o `package-lock.json`.

### Desenvolvimento

```bash
npm run dev        # servidor de desenvolvimento Vite em http://localhost:5173
```

### Outros comandos

```bash
npm run build        # verifica os tipos e gera a versão de produção em dist/
npm run preview      # abre uma prévia da versão de produção
npm run lint         # executa o ESLint
npm run format       # formata com Prettier
npm run format:check # verifica a formatação sem modificar arquivos
npm test             # executa o Vitest
npm run test:watch   # executa o Vitest em modo de observação
npm run test:commits # valida as mensagens dos commits locais
npm run test:release # valida a configuração de release
```

## Como contribuir

Mensagens de commit e títulos de pull requests seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add a new capability
fix(canvas): correct rendering behavior
chore(ci): maintain automation
```

O `npm ci` configura o hook `commit-msg` do Husky. As mesmas regras são verificadas em todos os commits de pull requests no CI.

Consulte o [CONTRIBUTING.md](CONTRIBUTING.md) para conhecer o fluxo de desenvolvimento, a política de branches e a lista de verificação para pull requests.

---

## Docker

Execute localmente a imagem de produção protegida:

```bash
docker compose up --build      # http://localhost:8080
```

Execute o servidor de desenvolvimento Vite com HMR dentro de um contêiner:

```bash
docker compose --profile dev up --build   # http://localhost:5173
```

Por padrão, os dois serviços do Compose escutam apenas em `127.0.0.1`, portanto não ficam expostos a outros dispositivos da rede. Adicione um proxy reverso explícito ou altere o endereço de escuta quando o acesso remoto for intencional.

## Implantação em produção

O `Dockerfile` usa uma compilação reproduzível em múltiplos estágios: Node.js 24 LTS gera os arquivos estáticos e o NGINX 1.30.3 Alpine Slim serve apenas o conteúdo de `dist/`. O contêiner é executado com o usuário não root `nginx` na porta 8080, fornece o endpoint `/health`, usa um sistema de arquivos raiz somente leitura no Compose e envia cabeçalhos básicos de segurança para o navegador. O `nginx.conf` também configura compressão, cache imutável para arquivos com hash, fallback da SPA e revalidação do shell da aplicação e dos metadados da PWA.

As imagens-base usam tags fixadas por hashes imutáveis no `Dockerfile` e no `Dockerfile.dev`. Ao atualizar um hash, reconstrua a imagem e execute a verificação local do contêiner e a análise do Trivy antes da publicação.

### Publicação de imagens

Cada push bem-sucedido para `main` publica imagens estáveis para `linux/amd64` e `linux/arm64` no Docker Hub e no GHCR com a tag `latest`. Quando os commits geram um release semântico, as imagens também recebem as tags `X.Y.Z`, `X.Y` e `X`.

Pushes para `dev` publicam a tag móvel `dev` nos dois registros. Commits que geram um release semântico também publicam uma tag exata de pré-release, como `X.Y.Z-dev.N`.

Conventional Commits determina a próxima versão: `fix`, `perf` e `revert` geram uma correção; `feat` gera uma versão secundária; e uma mudança incompatível gera uma versão principal. O workflow cria a tag Git e publica o GitHub Release automaticamente.

Administradores do repositório precisam criar estes secrets do GitHub Actions:

| Secret               | Finalidade                                               |
| -------------------- | -------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Conta ou organização do Docker Hub que possui `watchman` |
| `DOCKERHUB_TOKEN`    | Token do Docker Hub com permissão de envio               |

Antes da primeira publicação, crie o repositório `watchman` no Docker Hub sob a conta ou organização indicada em `DOCKERHUB_USERNAME`.

O repositório deve permitir que o GitHub Actions grave seu conteúdo para que o Semantic Release possa criar tags e GitHub Releases.

Ao proteger `main`, exija as verificações `Commit messages`, `Lint, test, and build` e `Pull request title`.

---

## Arquitetura

O pipeline de renderização é intencionalmente baseado em canvas e usa pouco React: o React controla a estrutura da aplicação (navegação, configurações, sobreposições e fundo), enquanto um único loop de `requestAnimationFrame` desenha os pixels das animações.

- O `useAnimationLoop` lê as configurações com `getState()` do Zustand a cada quadro. Assim, os ajustes aparecem imediatamente sem novas renderizações do React. O hook centraliza o dimensionamento por DPR, o limite de FPS, a pausa quando a aba fica oculta e o deslocamento anti burn-in.
- Cada **animação é um módulo independente** que expõe uma fábrica `() => { draw(frame) }`. O estado permanece no fechamento da função e é reiniciado ao trocar de animação. Para adicionar uma, crie um módulo e uma entrada no registro em `animations/index.ts`.
- A **navegação** usa o hash nativo do navegador e mantém o fluxo de duas páginas sem dependências adicionais.
- As **configurações** ficam em um único store fortemente tipado e persistido no LocalStorage por `zustand/middleware`; imagens enviadas são armazenadas separadamente no IndexedDB.

### Estrutura de pastas

```text
src/
 ├── animations/   # um módulo por modo, registro e lógica da playlist
 ├── components/   # interface reutilizável: botões, controles, configurações etc.
 ├── hooks/        # animação, wake lock, tela cheia, teclado, imagens e i18n
 ├── pages/        # HomePage e PlayerPage
 ├── services/     # traduções e armazenamento de imagens no navegador
 ├── stores/       # settingsStore (Zustand + persistência)
 ├── styles/       # entrada do Tailwind
 ├── types/        # tipos compartilhados
 ├── utils/        # utilitários matemáticos e de cores
 └── App.tsx
```

---

## Licença

MIT
