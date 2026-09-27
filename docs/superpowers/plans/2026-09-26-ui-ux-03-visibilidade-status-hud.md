# Plano de Implementação: Visibilidade de Status e Descoberta do HUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que o HUD do protetor de tela desperte automaticamente quando o usuário interage via teclado (tornando visível a troca de animações via `N` e `P` e a pausa via `Espaço`), e disponibilizar um botão de atalhos (`?`) diretamente na barra de controles do Player para descoberta imediata por usuários de mouse ou touch.

**Architecture:** Conectar o evento `keydown` ao ouvinte de inatividade em `PlayerPage.tsx`, garantindo que qualquer comando de atalho renove a janela de 3 segundos de visibilidade do HUD, e introduzir o botão de atalhos na barra superior direita junto a um toast informativo persistente enquanto a troca de animação ocorre.

**Tech Stack:** React 19, TypeScript 5.6, Tailwind CSS v4, Vitest.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- O timer de inatividade deve permanecer em 3000ms após a última ação (seja mouse, toque ou tecla).
- O HUD deve ocultar-se suavemente com `transition-opacity duration-300` e habilitar `cursor-none`.
- Zero regressão no consumo de CPU durante o protetor de tela.

---

### Task 1: Despertar o HUD em Ações de Teclado (`keydown`)

**Files:**
- Modify: `src/pages/PlayerPage.tsx:59-75`
- Test: `src/pages/PlayerPage.test.tsx` (ou novo arquivo de teste de integração do player)

**Interfaces:**
- Consumes: Eventos globais `window.addEventListener('keydown')`.
- Produces: Ativação instantânea de `uiVisible: true` e renovação do timer de ocultação.

- [ ] **Step 1: Escrever teste de simulação do evento keydown para visibilidade do HUD**

Em `src/pages/PlayerPage.test.tsx` (criar ou atualizar):
```tsx
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerPage } from './PlayerPage';

describe('PlayerPage HUD visibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('resets auto-hide timer on keydown event', () => {
    render(<PlayerPage />);

    // Avança 3.5 segundos para ocultar
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    // Pressiona uma tecla
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    });

    // O HUD deve estar visível novamente
    const controls = screen.getByLabelText(/Abrir configurações|Open settings/i);
    expect(controls.closest('div')).toHaveClass('opacity-100');
  });
});
```

- [ ] **Step 2: Executar teste para verificar comportamento**

Run: `npx vitest run src/pages/PlayerPage.test.tsx`
Expected: FAIL se o ouvinte ainda não estiver escutando `keydown`.

- [ ] **Step 3: Adicionar `keydown` no efeito de atividade de `PlayerPage.tsx`**

Em `src/pages/PlayerPage.tsx`:
```typescript
  // Auto-hide cursor + controls after idle. Panel open keeps them visible.
  useEffect(() => {
    let timer: number;
    const onActivity = () => {
      setUiVisible(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setUiVisible(false), 3000);
    };
    onActivity();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);
```

- [ ] **Step 4: Executar testes e validar TypeScript**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlayerPage.tsx
git commit -m "fix(ux): wake player HUD on keydown events"
```

---

### Task 2: Adicionar Botão de Atalhos (`?`) na Barra do HUD

**Files:**
- Modify: `src/pages/PlayerPage.tsx:100-125`
- Test: `src/pages/PlayerPage.test.tsx`

**Interfaces:**
- Consumes: `t('player.shortcuts')` de `useI18n()`, `setShortcutsOpen` de `useState`.
- Produces: Botão clicável de interrogação no HUD que abre o `ShortcutsOverlay`.

- [ ] **Step 1: Escrever teste de clique no botão de atalhos**

```tsx
it('opens shortcuts overlay when question mark button is clicked', () => {
  render(<PlayerPage />);
  const shortcutsBtn = screen.getByRole('button', { name: /atalhos|shortcuts/i });
  fireEvent.click(shortcutsBtn);
  expect(screen.getByRole('dialog', { name: /atalhos|shortcuts/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/pages/PlayerPage.test.tsx`
Expected: FAIL pois o botão ainda não existe no DOM do Player.

- [ ] **Step 3: Adicionar o botão no grupo de controles em `PlayerPage.tsx`**

Em `src/pages/PlayerPage.tsx`, entre as opções do topo direito:
```tsx
        <Button
          variant="ghost"
          aria-label={t('player.shortcuts')}
          title={t('player.shortcuts')}
          onClick={() => setShortcutsOpen(true)}
        >
          <span aria-hidden="true">?</span>
        </Button>
```

- [ ] **Step 4: Validar typecheck e testes**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlayerPage.tsx
git commit -m "feat(ux): add shortcuts help button to player HUD"
```
