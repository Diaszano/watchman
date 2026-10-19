# Watchman UI and Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os sete achados da auditoria antislop sem trocar a identidade do Watchman nem ampliar suas funções.

**Architecture:** Manter os componentes React e os tokens CSS existentes. Corrigir estilos compartilhados na origem, ajustar a semântica dos controles de busca e filtro, e dar feedback à operação de imagem no painel atual. Registrar a direção visual aprovada antes das alterações estéticas e fazer uma auditoria de acompanhamento ao final.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, CSS, Vitest, Testing Library, Vite.

**Spec:** `anti-slop/audit-001-2026-10-18.md` (itens 1 a 7 aprovados pelo pedido de planejar a correção de todos).

## Global Constraints

- Não adicionar dependências, páginas, assets ou funcionalidades.
- Manter o urso, os previews de animação, os dois idiomas e os temas existentes.
- Não inventar direção de marca: a decisão do dono sobre aparência entra em `DESIGN.md` antes da tarefa visual.
- Alvos de toque: área acionável mínima de 44 × 44 px no celular.
- Contraste: pelo menos 4,5:1 para texto normal e 3:1 para texto grande em ambos os temas e no painel do player.
- Preservar validação, erros e ordem de persistência das imagens; o estado de processamento deve ser anunciado e visível.
- Copy nova deve usar as traduções existentes ou novas chaves em inglês e português, sem travessão.

## Review Focus

- Busca vazia ou com resultado zero: o campo continua rotulado e a ação de limpar funciona nos dois idiomas. Testar na tarefa 4.
- Troca de filtro por teclado: foco e seleção permanecem coerentes; `Tab` segue para o próximo controle. Testar na tarefa 4.
- Salvar imagem lentamente: feedback aparece, ações incompatíveis ficam bloqueadas e somem após sucesso ou erro. Testar na tarefa 5.
- Painel do player nos temas claro e escuro: o texto pequeno mantém contraste AA. Verificar na tarefa 2.
- Tela de 320 px com zoom e painel aberto: sem overflow ou controles inacessíveis. Verificar na tarefa 7.

---

### Task 1: Aprovar e registrar a direção visual (achado 5)

**Files:**
- Create: `DESIGN.md`
- Reference: `src/styles/theme.css`, `src/styles/index.css`, `public/logo.webp`

**Interfaces:** Nenhuma API nova. A direção aprovada orienta as tarefas 2, 3 e 6.

- [x] **Step 1:** O dono escolheu refinar a identidade atual: urso, violeta e interface calma de desktop.
- [x] **Step 2:** A direção foi registrada em `DESIGN.md`, com ENERGY 1 / RHYTHM 2 / MOTION 1 para a interface.
- [x] **Step 3:** O documento foi conferido contra a escolha do dono e os achados 1 a 7.
- [x] **Step 4:** Revisar o documento com o dono antes de alterar aparência.

### Task 2: Corrigir contraste dos tokens no painel do player (achado 1)

**Files:**
- Modify: `src/styles/index.css` (`.settings-overlay`)
- Reference: `src/styles/theme.css`, `src/components/SettingsPanel.tsx`

**Interfaces:** Mantém os nomes dos tokens CSS; nenhuma alteração em props.

- [x] **Step 1:** Medir `--text-muted` sobre `--surface-elevated` e `--surface-hover` com `python3 /home/diaszano/.agents/skills/antislop-human/contrast-check.py <foreground> <background>`. Registrar o valor atual de 3,41:1.
- [x] **Step 2:** Ajustar apenas o token necessário em `.settings-overlay`, seguindo a direção aprovada, até todas as combinações de texto pequeno alcançarem 4,5:1.
- [x] **Step 3:** Medir novamente o painel no player e os tokens de texto da página inicial nos temas claro e escuro; registrar as razões no relatório final.
- [x] **Step 4:** Executar `npm run build`; esperado: sucesso.

### Task 3: Corrigir os alvos de toque compartilhados (achado 2)

**Files:**
- Modify: `src/components/Button.tsx`, `src/components/IconButton.tsx`, `src/components/ui/SearchInput.tsx`, `src/styles/index.css`
- Test: `src/components/Button.test.tsx`, `src/components/IconButton.test.tsx`

**Interfaces:** Preservar `ButtonSize`, `IconButton` e as props atuais. `size="sm"` continua visualmente compacto, mas a área clicável mede 44 px.

- [x] **Step 1:** Adicionar testes para as classes de área mínima de `Button` pequeno e `IconButton`; executar `npm test -- --run src/components/Button.test.tsx src/components/IconButton.test.tsx` e confirmar falha inicial.
- [x] **Step 2:** Aplicar 44 × 44 px aos controles usados no celular, incluindo botão de limpar busca e abas de configurações. Ajustar espaçamento do grupo se a largura ficar apertada; não ampliar o ícone por obrigação.
- [x] **Step 3:** Executar os testes acima; esperado: sucesso.
- [x] **Step 4:** Medir os retângulos clicáveis no navegador em 320 e 390 px; esperado: todos com largura e altura de pelo menos 44 px, sem overflow.

### Task 4: Rotular busca, corrigir filtro e traduzir limpar (achados 3 e 7)

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/components/ui/SearchInput.tsx`, `src/components/ui/SegmentedControl.tsx`
- Test: `src/components/ui/SearchInput.test.tsx`, `src/components/ui/SegmentedControl.test.tsx`
- Reference: `src/services/i18n.ts` (`home.search`, `home.clearSearch`)

**Interfaces:** Acrescentar `label: string` e `clearLabel: string` a `SearchInput`, e exigir `aria-label: string` em `SegmentedControl`; atualizar o único chamador de cada componente em `HomePage` com `home.search`, `home.clearSearch` e `home.animation`. Preservar `value`, `onChange` e os tipos genéricos.

- [x] **Step 1:** Criar testes: busca encontrada por nome acessível em português; botão de limpar encontrado com a tradução; filtro encontrado pelo nome do grupo; seta seleciona e foca a opção seguinte; `Tab` sai do grupo.
- [x] **Step 2:** Executar `npm test -- --run src/components/ui/SearchInput.test.tsx src/components/ui/SegmentedControl.test.tsx`; esperado: falha inicial.
- [x] **Step 3:** Usar os textos já existentes em `i18n.ts`. Para o filtro, usar um grupo de botões de seleção (`role="group"`, `aria-pressed`) sem painel de abas fictício; manter apenas o item selecionado na ordem de `Tab` e mover o foco junto da seleção por setas.
- [x] **Step 4:** Executar os testes acima e `npm run build`; esperado: sucesso.

### Task 5: Mostrar o estado de processamento de imagem (achado 4)

**Files:**
- Modify: `src/components/SettingsPanel.tsx`, `src/services/i18n.ts`
- Test: `src/components/SettingsPanel.test.tsx`

**Interfaces:** Reutilizar `isImageProcessing` e `uploadError`; não alterar `imageStorage` nem a persistência. Acrescentar uma chave de tradução curta para o estado de processamento em `en` e `pt`.

- [x] **Step 1:** Criar teste com `imageStorage.save` pendente: status visível e anunciado, ações de imagem bloqueadas; após resolver ou rejeitar, status some e erro existente aparece quando aplicável.
- [x] **Step 2:** Executar `npm test -- --run src/components/SettingsPanel.test.tsx`; esperado: falha no teste novo.
- [x] **Step 3:** Renderizar a mensagem de processamento no painel com `role="status"` e `aria-live="polite"`; preservar o `aria-busy`, a validação e o fluxo atual de erros.
- [x] **Step 4:** Executar o teste e `npm run build`; esperado: sucesso.

### Task 6: Unificar a fonte das propriedades visuais do card (achado 6)

**Files:**
- Modify: `src/components/AnimationPreviewCard.tsx`, `src/styles/index.css`
- Test: `src/components/AnimationPreviewCard.test.tsx`

**Interfaces:** Props e comportamento do card ficam iguais. As regras de dimensão, borda, raio, sombra e hover passam a ter uma única definição por propriedade.

- [x] **Step 1:** Levantar as propriedades repetidas entre `.animation-card`/`.animation-art` e as classes do componente, inclusive altura de 124 px versus `h-28`.
- [x] **Step 2:** Remover as definições duplicadas do lado que não é a fonte escolhida; manter a aparência aprovada e os estados de seleção e foco.
- [x] **Step 3:** Executar `npm test -- --run src/components/AnimationPreviewCard.test.tsx` e `npm run build`; esperado: sucesso.
- [x] **Step 4:** Comparar visualmente cards selecionado, normal, hover e foco em desktop e celular; esperado: nenhuma regressão visível.

### Task 7: Verificação final e auditoria de acompanhamento

**Files:**
- Create: `anti-slop/audit-002-2026-10-18.md`
- Reference: todos os arquivos alterados e o `DESIGN.md` aprovado

**Interfaces:** Nenhuma mudança de produto nesta tarefa.

- [x] **Step 1:** Executar `npm test`, `npm run lint`, `npm run build` e `npm run format:check`; registrar os resultados.
- [x] **Step 2:** Percorrer, em 320, 390 e 1440 px, busca, filtros, seleção, início do player, controles do player, abas, upload, limpeza, reset, tema, idioma e diálogos. Testar teclado, Escape, foco, estados vazios/erro/espera e ambos os temas; conferir console e overflow.
- [x] **Step 3:** Rodar o Delivery Gate antislop com evidências por controle. Se algum item falhar, corrigir na tarefa responsável e repetir somente a verificação afetada.
- [x] **Step 4:** Escrever `audit-002-2026-10-18.md` com os sete achados resolvidos, medidas de contraste e toque, resultados dos comandos e limites da verificação.
