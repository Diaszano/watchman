# Índice de Planos de Implementação de UI/UX — Watchman

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this roadmap task-by-task.

Este documento consolida e orquestra os 7 planos de melhoria de UI, UX e Acessibilidade gerados a partir da avaliação heurística do **Watchman**.

---

## 🗺️ Mapa de Execução e Dependências

```mermaid
flowchart TD
    P1["Plan 01: Acessibilidade WCAG 2.1 AA<br/>(aria-labels, :focus-visible, alt)"] --> P3["Plan 03: Visibilidade de Status & HUD<br/>(keydown wake, botão atalhos ?)"]
    P1 --> P4["Plan 04: Design System & IconButton<br/>(SVGs acessíveis, botões 40x40)"]
    P2["Plan 02: Navegação Teclado & Modais<br/>(Esc unificado, clique fora dialog)"] --> P3
    P4 --> P6["Plan 06: Reestruturação SettingsPanel<br/>(4 abas temáticas, presets OLED)"]
    P5["Plan 05: Otimização Assets & LCP<br/>(logo WebP <45KB, tag picture)"] --> P7["Plan 07: Seleção Visual Animações<br/>(Cards visuais com preview na Home)"]
    P6 --> P7
```

---

## 📋 Lista Geral de Planos

| # | Plano | Prioridade | Arquivo | Status |
| :-: | :--- | :-: | :--- | :-: |
| 1 | **Acessibilidade WCAG 2.1 AA** | 🔴 P0 | [`2026-09-26-ui-ux-01-acessibilidade-wcag.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-01-acessibilidade-wcag.md) | ⏳ Pronto para execução |
| 2 | **Navegação por Teclado e Modais** | 🔴 P0 | [`2026-09-26-ui-ux-02-navegacao-teclado-modais.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-02-navegacao-teclado-modais.md) | ⏳ Pronto para execução |
| 3 | **Visibilidade de Status e HUD** | 🟡 P1 | [`2026-09-26-ui-ux-03-visibilidade-status-hud.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-03-visibilidade-status-hud.md) | ⏳ Pronto para execução |
| 4 | **Design System de Ícones & IconButton** | 🟡 P1 | [`2026-09-26-ui-ux-04-design-system-icon-buttons.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-04-design-system-icon-buttons.md) | ⏳ Pronto para execução |
| 5 | **Otimização de Assets e LCP (WebP)** | 🟡 P1 | [`2026-09-26-ui-ux-05-otimizacao-assets-lcp.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-05-otimizacao-assets-lcp.md) | ⏳ Pronto para execução |
| 6 | **Reestruturação do SettingsPanel em Abas** | 🟢 P2 | [`2026-09-26-ui-ux-06-reestruturacao-settings-panel.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-06-reestruturacao-settings-panel.md) | ⏳ Pronto para execução |
| 7 | **Seleção Visual de Animações na Home** | 🟢 P2 | [`2026-09-26-ui-ux-07-selecao-visual-animacoes.md`](file:///home/diaszano/Documentos/GitHub/watchman/docs/superpowers/plans/2026-09-26-ui-ux-07-selecao-visual-animacoes.md) | ⏳ Pronto para execução |

---

## 🚀 Como Executar

Escolha a estratégia desejada para início:

1. **Subagent-Driven Development (Recomendado):**
   - Disparo de subagentes focados por plano com verificação e revisão de cada task.
2. **Inline Execution (Sessão Atual):**
   - Execução sequencial dos planos diretamente nesta sessão com checkpoints de teste e commits convencionais.
