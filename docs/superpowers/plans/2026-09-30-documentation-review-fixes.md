# Watchman — Plano de correção da documentação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar tarefa por tarefa; usar superpowers:subagent-driven-development somente se escolhido pelo usuário. Os checkboxes registram a execução.

**Goal:** Corrigir os seis achados da revisão documental de 30/09/2026 e manter os READMEs em inglês e português alinhados.

**Architecture:** Ajustar apenas a documentação existente, tomando código, configurações e workflows como fonte do comportamento atual. Validar instruções executáveis em ambiente temporário e conferir as demais afirmações contra suas fontes, sem criar infraestrutura de testes para texto.

**Tech Stack:** Markdown, Git, Node.js 24, Prettier, Docker Compose, GitHub Actions e APIs do navegador.

**Spec:** [Escopo e decisões](#escopo-e-decisões), baseado nos seis achados da revisão desta conversa. A execução está registrada nos checkboxes e no relatório ao final deste arquivo.

## Escopo e decisões

| Ponto | Correção esperada | Tarefa |
| --- | --- | --- |
| 1 — Branch inexistente em clone novo | Criar a branch de trabalho a partir de `upstream/dev`, após buscar o repositório original | 1 |
| 2 — HTTPS omitido no acesso remoto | Explicar contexto seguro para Wake Lock e service worker, com exceção de localhost | 2 |
| 3 — Canal privado indefinido | Publicar contato privado real para denúncias de conduta | 3 |
| 4 — Guia de animações incompleto | Incluir traduções obrigatórias e metadados opcionais de apresentação | 4 |
| 5 — Badges de distribuição legada | Remover badges e link do Docker Hub dos dois READMEs | 5 |
| 6 — Reprodutibilidade não garantida | Descrever build multiestágio com bases fixadas, sem garantir resultado reproduzível | 6 |

**Decisão pendente para a tarefa 3:** o mantenedor precisa fornecer um e-mail ou URL de formulário privado que aceite denúncias de conduta. Não inventar contato, usar placeholder publicado ou direcionar denúncias de conduta ao canal exclusivo de vulnerabilidades. Essa dependência não bloqueia as outras cinco tarefas.

## Global Constraints

- Alterar somente `README.md`, `README.pt-BR.md`, `CONTRIBUTING.md` e `CODE_OF_CONDUCT.md`, além do acompanhamento deste plano.
- Não mudar código, Dockerfile, dependências, CI, política de branches ou processo de publicação para acomodar a documentação.
- Preservar os planos preexistentes e alterações do usuário; usar arquivos explícitos ao preparar commits.
- Atualizar as duas versões do README na mesma tarefa quando o conteúdo for compartilhado.
- Manter a orientação de contribuição via fork e PR para `dev`; promoções para `main` continuam reservadas ao repositório original.
- Usar verificações pontuais; não criar testes permanentes para edição de texto nem executar build/suíte completa sem mudanças de comportamento.
- Não tratar remoção dos badges como prova de que imagens antigas do Docker Hub foram apagadas ou estão indisponíveis.
- Não executar merge, publicação, deploy ou envio de mensagens ao contato indicado como parte deste plano.

## Review Focus

- Clone novo de fork, sem branch local `dev`: instruções devem funcionar e usar a branch atual do repositório original — tarefa 1.
- Acesso por IP da rede via HTTP: documentação deve explicar por que Wake Lock e service worker podem ficar indisponíveis — tarefa 2.
- Denúncia com informação sensível: deve existir canal privado explícito, sem depender de issue pública — tarefa 3.
- Animação nova nos dois idiomas: nome deve ser traduzido; ícone e categoria podem usar os fallbacks existentes — tarefa 4.
- Leitor procurando imagem atual ou garantia de build idêntico: os dois READMEs devem refletir GHCR e os limites reais do build — tarefas 5 e 6.

## Arquivos e ordem

| Arquivo | Responsabilidade | Tarefas |
| --- | --- | --- |
| `CONTRIBUTING.md` | Fluxo com fork/upstream e extensão de animações | 1, 4 |
| `README.md` | Implantação, animações, badges e descrição do build em inglês | 2, 4, 5, 6 |
| `README.pt-BR.md` | Mesmo conteúdo em português | 2, 4, 5, 6 |
| `CODE_OF_CONDUCT.md` | Canal privado de denúncias de conduta | 3 |

Executar 1 → 2 → 3 → 4 → 5 → 6. Se faltar o contato da tarefa 3, mantê-la pendente e continuar 4 → 5 → 6. Um commit por tarefa concluída facilita revisão.

## Tarefa 1 — Corrigir criação e atualização da branch de contribuição

**Arquivo:** `CONTRIBUTING.md`, seções Development Setup e Branch Strategy.

**Fonte:** política de promoção em `.github/workflows/ci.yml`; repositório original `https://github.com/Diaszano/watchman.git`.

- [x] Substituir o passo que pressupõe `dev` local por configuração de `upstream`, busca de `dev` e criação da branch a partir de `upstream/dev`:

  ```bash
  git remote add upstream https://github.com/Diaszano/watchman.git
  git fetch upstream dev
  git switch -c feat/my-new-feature upstream/dev
  ```

- [x] Explicar que `origin` aponta para o fork, `upstream` para o original e que `remote add` deve ser pulado quando `upstream` já existir com a URL correta. Documentar `git push -u origin feat/my-new-feature` e abertura de PR para `dev` do original.
- [x] Documentar atualização de uma branch de trabalho existente: árvore limpa, `git fetch upstream dev`, depois `git merge upstream/dev`. Não exigir force-push.
- [x] Em diretório temporário fora do workspace, reproduzir um clone com apenas a branch padrão local. Executar o fluxo documentado e confirmar `git branch --show-current` igual a `feat/my-new-feature` e `git rev-parse HEAD` igual a `git rev-parse upstream/dev` antes de alterações locais.
- [x] Repetir a busca com `upstream` já configurado e conferir que a orientação não manda adicionar o remote novamente. Confirmar que o fluxo não pressupõe `origin/dev` atualizado.
- [x] Commit sugerido: `docs: fix fork contribution branch workflow`.

## Tarefa 2 — Explicar HTTPS na implantação remota

**Arquivos:** `README.md` e `README.pt-BR.md`, seções Docker e implantação em produção.

**Fontes:** `src/hooks/useWakeLock.ts`, `vite.config.ts`, `nginx.conf`; documentação MDN de [Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock), [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) e [contextos seguros](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts).

- [x] Conferir os requisitos de contexto seguro nas referências oficiais antes de redigir.
- [x] Acrescentar que acesso remoto deve usar HTTPS, normalmente terminado no proxy reverso; mudar apenas a interface de escuta não habilita Wake Lock nem service worker em HTTP remoto.
- [x] Preservar os exemplos locais `http://localhost:8080` e `http://localhost:5173`; explicar a exceção de confiança de localhost sem estendê-la a endereços IP da rede.
- [x] Conferir que ambas as versões distinguem transporte HTTPS de suporte/permissão do navegador. Não prometer que HTTPS garante concessão de Wake Lock ou instalação da PWA.
- [x] Commit sugerido: `docs: explain secure context requirements for remote access`.

## Tarefa 3 — Definir contato privado para denúncias de conduta

**Arquivo:** `CODE_OF_CONDUCT.md`, seção Enforcement.

**Dependência:** contato privado fornecido pelo mantenedor. Se não houver resposta, registrar a pendência e continuar as demais tarefas.

- [ ] Obter e-mail ou URL de formulário privado destinado a denúncias de conduta e autorizado para publicação no documento.
- [ ] Substituir a recomendação de issues públicas e a referência genérica a mensagens privadas por instrução direta com o contato real. Manter o compromisso de respeitar a privacidade do denunciante.
- [ ] Conferir que o contato está completo, sem placeholder, e que a redação distingue denúncias de conduta de vulnerabilidades tratadas em `SECURITY.md`.
- [ ] Validar sintaxe do link e destino informado pelo mantenedor, sem enviar denúncia, formulário ou e-mail de teste.
- [ ] Commit sugerido: `docs: define private code of conduct reporting contact`.

## Tarefa 4 — Completar o guia para novas animações

**Arquivos:** `CONTRIBUTING.md`, Architecture Notes; `README.md` e `README.pt-BR.md`, Architecture.

**Fontes:** `src/animations/index.ts`, `src/types/index.ts`, `src/services/i18n.ts` e `src/components/AnimationSelector.tsx`.

- [x] Em CONTRIBUTING, documentar a sequência: criar fábrica com `draw(frame: AnimationFrame): void`, registrá-la em `src/animations/index.ts` e adicionar `anim.<id>` nos dicionários `en` e `pt` de `src/services/i18n.ts`.
- [x] Explicar `controls` no registro para selecionar controles relevantes e a entrada opcional em `previews` de `AnimationSelector.tsx` para personalizar ícone/categoria. Informar que a ausência de `controls` mantém todos os controles e a ausência de preview usa os fallbacks existentes.
- [x] Ajustar a frase resumida nos dois READMEs para incluir traduções e apontar para o guia de contribuição, sem duplicar toda a sequência.
- [x] Percorrer um modo existente nos quatro arquivos de referência; confirmar que a sequência cobre seu registro, nome nos dois idiomas e controles. Conferir que `translate` devolve a chave quando falta tradução, justificando o passo obrigatório.
- [x] Commit sugerido: `docs: complete animation contribution instructions`.

## Tarefa 5 — Remover badges do Docker Hub

**Arquivos:** bloco inicial de badges em `README.md` e `README.pt-BR.md`.

**Fonte:** `.github/workflows/release.yml`, login e publicação no GHCR.

- [x] Remover o link `https://hub.docker.com/r/diaszano/watchman` e as três imagens de pulls, tamanho e versão contidas nele, preservando o badge/link do GHCR.
- [x] Executar `rg -n 'hub\.docker\.com|img\.shields\.io/docker/' README.md README.pt-BR.md`; esperar nenhuma ocorrência, código de saída 1.
- [x] Conferir que os dois READMEs mantêm o link do GHCR e que os elementos HTML continuam corretamente fechados. Não editar planos históricos que mencionam Docker Hub.
- [x] Commit sugerido: `docs: align container badges with GHCR publishing`.

## Tarefa 6 — Ajustar a afirmação de reprodutibilidade

**Arquivos:** `README.md` e `README.pt-BR.md`, primeira frase de implantação em produção.

**Fonte:** `Dockerfile`, incluindo `RUN apk upgrade --no-cache`, e `Dockerfile.dev`.

- [x] Trocar “reproducible multi-stage build” por “multi-stage build with digest-pinned base images”; em português, usar “compilação em múltiplos estágios com imagens-base fixadas por digest”.
- [x] Manter as versões de Node/NGINX e o restante da descrição operacional. Acrescentar que atualizações de pacotes Alpine durante o build podem variar conforme o repositório, portanto o digest da base não garante resultados idênticos.
- [x] Executar `rg -n 'reproducible|reproduzível' README.md README.pt-BR.md`; esperar nenhuma promessa de compilação reproduzível. Conferir a nova redação contra as instruções reais do Dockerfile, sem remover `apk upgrade`.
- [x] Commit sugerido: `docs: clarify container build reproducibility limits`.

## Verificação final

- [x] Executar `npx --no -- prettier --check README.md README.pt-BR.md CONTRIBUTING.md CODE_OF_CONDUCT.md`; esperar saída 0. Se necessário, formatar somente esses quatro arquivos e repetir uma vez.
- [x] Verificar os links locais e imagens dos quatro documentos, resolvendo caminhos relativos ao documento; conferir as âncoras internas existentes.
- [x] Comparar as duas versões do README: HTTPS, guia de animações, GHCR e descrição do build devem comunicar as mesmas condições.
- [x] Executar `git diff --check`; esperar saída 0. Conferir `git diff --stat` e `git status --short` para excluir alterações fora do escopo.
- [x] Marcar tarefas concluídas somente com verificação registrada. Se faltar o contato privado, reportar cinco correções concluídas e tarefa 3 pendente, sem declarar o plano inteiro finalizado.


## Registro de execução — 30/09/2026

Branch: `docs/fix-documentation-review`, criada a partir de `ac87e80` (`chore/repository-hardening`). As edições ficaram no checkout atual, preservando os quatro planos preexistentes não versionados. Nenhum código, configuração, dependência ou workflow foi alterado; não houve push, merge ou publicação.

| Tarefa | Estado | Commit / evidência |
| --- | --- | --- |
| 1 | Concluída | `2f7eb95`: clone temporário sem `dev` local; fetch real de `upstream/dev`, criação da branch, HEAD igual ao upstream e segundo fetch/merge com árvore limpa |
| 2 | Concluída | `1e761af`: requisitos conferidos na MDN; HTTPS remoto, exceção de localhost e limites de suporte/permissões documentados em EN/PT |
| 3 | Pendente | Contato privado solicitado ao mantenedor; `CODE_OF_CONDUCT.md` preservado até receber endereço real autorizado |
| 4 | Concluída | `54b8c6d`: guia conferido contra fábrica/registro de `clock`, tipos, traduções EN/PT, seleção de controles e fallbacks de preview |
| 5 | Concluída | `33b4a62`: ausência de badges Docker Hub, links GHCR preservados e coerência com o workflow de publicação |
| 6 | Concluída | `01db6af`: promessa de reprodutibilidade removida; `apk upgrade` e digests conferidos no Dockerfile |

Verificação integrada: Prettier passou nos quatro documentos e neste plano; 27 destinos locais/âncoras foram verificados, junto ao fechamento das tags HTML e à presença das condições comuns em EN/PT. `git diff ac87e80 --check` passou. Não foram criados testes permanentes nem executados build/suíte da aplicação, conforme o escopo exclusivamente documental.

Revisão independente final: tarefas 1, 2, 4, 5 e 6 aprovadas, sem novos achados. A tarefa 3 permanece aberta; envio real de denúncias, publicação no registry e testes em dispositivos não fazem parte desta execução.
