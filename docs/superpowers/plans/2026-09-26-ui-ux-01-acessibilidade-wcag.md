# Plano de Implementação: Acessibilidade WCAG 2.1 AA no Watchman

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a interface do Watchman totalmente acessível e em conformidade com as diretrizes WCAG 2.1 nível AA, garantindo `aria-label`s localizados em todos os botões do HUD, anéis de foco `:focus-visible` evidentes em controles interativos e texto alternativo no logotipo.

**Architecture:** Adicionar tokens de internacionalização para ações de controle nos dicionários de tradução (`src/services/i18n.ts`), injetar atributos de acessibilidade nos botões do HUD em `PlayerPage.tsx` e `HomePage.tsx`, estilizar anéis de foco acessíveis com Tailwind CSS em `Button.tsx` e `controls.tsx`, e corrigir `Logo.tsx` para apresentar identificação audível sem prejudicar usuários visuais.

**Tech Stack:** React 19, TypeScript 5.6, Tailwind CSS v4, Vitest, Testing Library.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- Manter 100% de compatibilidade com temas Dark e Light.
- Não introduzir dependências externas de ícones ou componentes.
- Suportar navegação completa por teclado (Tab, Shift+Tab, Enter, Espaço).
- Garantir contraste mínimo de 3:1 para indicadores de foco e 4.5:1 para textos normais.
- Validação contínua com `npx tsc --noEmit`.

---

### Task 1: Adicionar Chaves de A11y aos Dicionários de Tradução

**Files:**
- Modify: `src/services/i18n.ts:13-61` (dicionário EN)
- Modify: `src/services/i18n.ts:70-118` (dicionário PT)
- Test: `src/services/i18n.test.ts`

**Interfaces:**
- Consumes: Função `translate(lang, key)` de `src/services/i18n.ts`.
- Produces: Chaves `player.play`, `player.pause`, `player.settings`, `player.fullscreen`, `player.close`, `player.shortcuts`, `app.logoAlt`.

- [ ] **Step 1: Escrever teste para as novas chaves de acessibilidade**

Em `src/services/i18n.test.ts`, adicionar verificação para as chaves essenciais do HUD:

```typescript
it('provides accessible labels for player controls in en and pt', () => {
  const keys = [
    'player.play',
    'player.pause',
    'player.settings',
    'player.fullscreen',
    'player.close',
    'player.shortcuts',
    'app.logoAlt',
  ];
  for (const k of keys) {
    expect(translate('en', k)).not.toBe(k);
    expect(translate('pt', k)).not.toBe(k);
  }
});
```

- [ ] **Step 2: Executar teste para verificar que falha**

Run: `npx vitest run src/services/i18n.test.ts`
Expected: FAIL indicando que as chaves retornam a própria chave sem tradução.

- [ ] **Step 3: Implementar as traduções em `src/services/i18n.ts`**

No dicionário `en`:
```typescript
  'player.play': 'Resume animation',
  'player.pause': 'Pause animation',
  'player.settings': 'Open settings',
  'player.fullscreen': 'Toggle fullscreen',
  'player.close': 'Exit screensaver and return to home',
  'player.shortcuts': 'Show keyboard shortcuts',
  'app.logoAlt': 'Watchman screensaver logo',
```

No dicionário `pt`:
```typescript
  'player.play': 'Retomar animação',
  'player.pause': 'Pausar animação',
  'player.settings': 'Abrir configurações',
  'player.fullscreen': 'Alternar tela cheia',
  'player.close': 'Sair do protetor e voltar ao início',
  'player.shortcuts': 'Exibir atalhos de teclado',
  'app.logoAlt': 'Logotipo do protetor Watchman',
```

- [ ] **Step 4: Executar teste e validar TypeScript**

Run: `npx vitest run src/services/i18n.test.ts && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/services/i18n.ts src/services/i18n.test.ts
git commit -m "feat(i18n): add accessible labels for player HUD controls"
```

---

### Task 2: Aplicar `aria-label` e Anéis `:focus-visible` nos Botões

**Files:**
- Modify: `src/components/Button.tsx:10-23`
- Modify: `src/pages/PlayerPage.tsx:105-122`
- Modify: `src/pages/HomePage.tsx:28-34`
- Test: `src/components/Button.test.tsx`

**Interfaces:**
- Consumes: Classes utilitárias do Tailwind CSS v4 para foco do teclado (`focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none`).
- Produces: Botões visualmente responsivos ao foco via Tab com suporte a leitores de tela.

- [ ] **Step 1: Escrever teste para classes de foco no `Button`**

Em `src/components/Button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button accessibility', () => {
  it('includes visible focus styles', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn.className).toContain('focus-visible:ring-2');
  });
});
```

- [ ] **Step 2: Executar teste para verificar que falha**

Run: `npx vitest run src/components/Button.test.tsx`
Expected: FAIL indicando ausência de `focus-visible:ring-2`.

- [ ] **Step 3: Atualizar `Button.tsx` e botões do HUD em `PlayerPage.tsx`**

Em `src/components/Button.tsx`:
```tsx
export const Button = ({ variant = 'ghost', className = '', children, ...rest }: Props) => (
  <button
    className={`rounded-xl px-5 py-2.5 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:opacity-50 ${styles[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
```

Em `src/pages/PlayerPage.tsx`:
```tsx
        <Button
          variant="ghost"
          aria-label={paused ? t('player.play') : t('player.pause')}
          title={paused ? t('player.play') : t('player.pause')}
          onClick={() => setPaused((p) => !p)}
        >
          <span aria-hidden="true">{paused ? '▶' : '⏸'}</span>
        </Button>
        <Button
          variant="ghost"
          aria-label={t('player.settings')}
          title={t('player.settings')}
          onClick={() => setSettingsOpen((o) => !o)}
        >
          <span aria-hidden="true">⚙</span>
        </Button>
        <Button
          variant="ghost"
          aria-label={t('player.fullscreen')}
          title={t('player.fullscreen')}
          onClick={() => toggle()}
        >
          <span aria-hidden="true">⛶</span>
        </Button>
        <Button
          variant="ghost"
          aria-label={t('player.close')}
          title={t('player.close')}
          onClick={() => {
            window.location.hash = '';
          }}
        >
          <span aria-hidden="true">✕</span>
        </Button>
```

- [ ] **Step 4: Executar testes e validar TypeScript**

Run: `npx vitest run src/components/Button.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Button.tsx src/components/Button.test.tsx src/pages/PlayerPage.tsx
git commit -m "fix(a11y): add aria-labels and focus-visible rings to player controls"
```

---

### Task 3: Acessibilidade em Formulários (`controls.tsx`) e Logotipo (`Logo.tsx`)

**Files:**
- Modify: `src/components/controls.tsx:18-72`
- Modify: `src/components/Logo.tsx:1-9`
- Modify: `src/components/Logo.test.tsx`
- Test: `src/components/Logo.test.tsx`

**Interfaces:**
- Consumes: `t('app.logoAlt')` de `useI18n()`.
- Produces: Inputs com foco destacado e tag `<img>` descritiva para leitores de tela.

- [ ] **Step 1: Escrever teste para o alt text de `Logo.tsx`**

Em `src/components/Logo.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders with an accessible alt attribute', () => {
    render(<Logo />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Watchman screensaver logo');
  });
});
```

- [ ] **Step 2: Executar teste para verificar que falha**

Run: `npx vitest run src/components/Logo.test.tsx`
Expected: FAIL indicando que `alt=""` não confere role img ou não possui o texto esperado.

- [ ] **Step 3: Implementar anéis de foco em `controls.tsx` e alt em `Logo.tsx`**

Em `src/components/Logo.tsx`:
```tsx
import { useI18n } from '@/hooks/useI18n';

export const Logo = ({ size = 240 }: { size?: number }) => {
  const { t } = useI18n();
  return (
    <img
      src="/logo.png"
      alt={t('app.logoAlt')}
      width={size}
      className="h-auto max-w-full drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
    />
  );
};
```

Em `src/components/controls.tsx`, injetar estilos de foco acessível:
- Nos sliders (`<input type="range">`): `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none rounded`
- Nos toggles (`<input type="checkbox">`): `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 rounded`
- Nos selects (`<select>`): `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none`

- [ ] **Step 4: Executar testes de regressão e typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/Logo.tsx src/components/Logo.test.tsx src/components/controls.tsx
git commit -m "fix(a11y): enhance input focus rings and provide descriptive logo alt text"
```
