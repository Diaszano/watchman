# Plano de Implementação: Navegação por Teclado e Gestão de Modais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proporcionar controle intuitivo e previsível de navegação na aplicação através da tecla `Esc` (fechando modais ativos de forma prioritária e, caso nenhum esteja aberto, retornando da tela do Player para a Home) e habilitar o fechamento de gavetas/diálogos ao clicar em suas áreas externas (backdrop click dismiss).

**Architecture:** Refatorar os handlers de atalho em `PlayerPage.tsx` para passar uma função unificada de `escape` a `useKeyboardShortcuts.ts`, tratar a captura de clique no backdrop dentro de `SettingsPanel.tsx` no elemento `<dialog>`, e garantir que `ShortcutsOverlay.tsx` responda de imediato ao evento de escape.

**Tech Stack:** React 19, TypeScript 5.6, HTML5 `<dialog>` API, Vitest.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- Respeitar a prioridade de fechamento: Modal de atalhos -> Painel de configurações -> Navegação para Home.
- Não quebrar o comportamento nativo do navegador para saída de tela cheia.
- Zero dependências de bibliotecas de terceiros (sem `floating-ui` ou similares).
- Suporte a testes unitários e typecheck limpo (`npx tsc --noEmit`).

---

### Task 1: Unificar a Hierarquia do Atalho `Esc` no Player

**Files:**
- Modify: `src/pages/PlayerPage.tsx:45-58`
- Modify: `src/hooks/useKeyboardShortcuts.ts:42-46`
- Test: `src/hooks/useKeyboardShortcuts.test.ts`

**Interfaces:**
- Consumes: Handlers em `PlayerPage.tsx` (`settingsOpen`, `shortcutsOpen`, `window.location.hash`).
- Produces: Resposta em camadas para a tecla `Esc`:
  1. Se `shortcutsOpen`, fechar atalhos (`setShortcutsOpen(false)`).
  2. Senão, se `settingsOpen`, fechar configurações (`setSettingsOpen(false)`).
  3. Senão, se `!document.fullscreenElement`, retornar à Home (`window.location.hash = ''`).

- [ ] **Step 1: Adicionar teste para suporte a múltiplos estados de escape**

Em `src/hooks/useKeyboardShortcuts.test.ts`:
```typescript
it('invokes escape handler when Esc is pressed', () => {
  const escape = vi.fn();
  renderHook(() => useKeyboardShortcuts({ escape, toggleFullscreen: vi.fn(), togglePause: vi.fn(), nextAnimation: vi.fn(), prevAnimation: vi.fn(), toggleSettings: vi.fn() }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(escape).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Executar teste para verificar comportamento**

Run: `npx vitest run src/hooks/useKeyboardShortcuts.test.ts`
Expected: PASS (confirmando que o hook propaga o evento).

- [ ] **Step 3: Implementar a lógica em cascata em `src/pages/PlayerPage.tsx`**

Em `src/pages/PlayerPage.tsx`, substituir o handler `escape` atual por:
```typescript
  const handleEscape = useCallback(() => {
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    // Se não estiver em fullscreen nativo (o browser já trata fullscreen), volta para a Home
    if (!document.fullscreenElement) {
      window.location.hash = '';
    }
  }, [shortcutsOpen, settingsOpen]);

  const handlers = useMemo(
    () => ({
      toggleFullscreen: () => toggle(),
      togglePause: () => setPaused((p) => !p),
      nextAnimation: () => step(1),
      prevAnimation: () => step(-1),
      toggleSettings: () => setSettingsOpen((o) => !o),
      toggleShortcuts: () => setShortcutsOpen((o) => !o),
      escape: handleEscape,
    }),
    [toggle, step, handleEscape],
  );
```

- [ ] **Step 4: Validar TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlayerPage.tsx src/hooks/useKeyboardShortcuts.test.ts
git commit -m "fix(ux): implement layered Escape key navigation in Player"
```

---

### Task 2: Fechamento por Clique no Fundo (Backdrop Dismiss) em `SettingsPanel`

**Files:**
- Modify: `src/components/SettingsPanel.tsx:84-105`
- Test: `src/components/SettingsPanel.test.tsx`

**Interfaces:**
- Consumes: Evento `onClick` no `<dialog>` HTML5.
- Produces: Fechamento automático da gaveta quando o clique ocorre fora dos limites retangulares do conteúdo do diálogo.

- [ ] **Step 1: Escrever teste para fechar ao clicar no backdrop**

Em `src/components/SettingsPanel.test.tsx`:
```tsx
it('calls onClose when backdrop is clicked', () => {
  const onClose = vi.fn();
  render(<SettingsPanel open={true} onClose={onClose} />);
  const dialog = screen.getByRole('dialog');
  
  // Simula clique fora do bounding rect da caixa
  fireEvent.click(dialog, { clientX: 10, clientY: 10 });
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: FAIL pois atualmente o clique no dialog não dispara `onClose`.

- [ ] **Step 3: Implementar detecção de clique no backdrop em `SettingsPanel.tsx`**

Em `src/components/SettingsPanel.tsx`:
```tsx
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };
```

Adicionar `onClick={handleDialogClick}` na tag `<dialog>`:
```tsx
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="settings-panel-title"
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`fixed right-0 top-0 z-40 m-0 flex h-full max-h-none w-80 max-w-[90vw] flex-col gap-1 overflow-y-auto border-0 border-l p-4 backdrop-blur-xl ${surface}`}
    >
```

- [ ] **Step 4: Executar testes e validar TypeScript**

Run: `npx vitest run src/components/SettingsPanel.test.tsx && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/SettingsPanel.test.tsx
git commit -m "feat(ux): support backdrop click-to-dismiss on SettingsPanel"
```
