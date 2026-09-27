# Plano de Implementação: Design System de Botões e Ícones Vetoriais (IconButton)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar os controles de ação unitária do Watchman através de um componente `IconButton` com proporção harmônica 1:1 (`40x40px`), microinterações táteis de escala (`active:scale-95`), e substituição de caracteres tipográficos Unicode brutos por ícones vetoriais SVG leves e acessíveis, eliminando divergências de renderização entre sistemas operacionais (Linux, Windows, Android, macOS).

**Architecture:** Criar o módulo `src/components/icons.tsx` com ícones SVG inline minimalistas (Play, Pause, Settings, Fullscreen, Close, Help, Reset), criar o componente especializado `src/components/IconButton.tsx` (estendendo acessibilidade com `aria-label` obrigatório e focus ring), e refatorar as barras de ferramentas em `PlayerPage.tsx`, `SettingsPanel.tsx` e `ShortcutsOverlay.tsx`.

**Tech Stack:** React 19, TypeScript 5.6, Tailwind CSS v4, SVG nativo, Vitest.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- Proibido adicionar pacotes pesados como `lucide-react` ou `react-icons` (seguir o princípio Ponytail / zero-bloat).
- Todos os SVGs devem ter `aria-hidden="true"`, `viewBox="0 0 24 24"`, `fill="none"` ou `currentColor`, e dimensões `w-5 h-5`.
- Todos os `IconButton` devem ter proporção rigorosamente quadrada (`h-10 w-10`).

---

### Task 1: Criar Módulo de Ícones Vetoriais Leves (`icons.tsx`)

**Files:**
- Create: `src/components/icons.tsx`
- Test: `src/components/icons.test.tsx`

**Interfaces:**
- Produces: Componentes SVG: `PlayIcon`, `PauseIcon`, `SettingsIcon`, `FullscreenIcon`, `CloseIcon`, `HelpIcon`, `ResetIcon`.

- [ ] **Step 1: Escrever teste de renderização dos ícones SVG**

Em `src/components/icons.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayIcon, PauseIcon, SettingsIcon, FullscreenIcon, CloseIcon, HelpIcon } from './icons';

describe('SVG Icons', () => {
  it('renders SVG with accessible hidden attribute', () => {
    const { container } = render(<PlayIcon className="h-5 w-5" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/icons.test.tsx`
Expected: FAIL com módulo inexistente.

- [ ] **Step 3: Implementar os ícones em `src/components/icons.tsx`**

Criar `src/components/icons.tsx`:
```tsx
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const PlayIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const PauseIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export const SettingsIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const FullscreenIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

export const CloseIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const HelpIcon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
```

- [ ] **Step 4: Executar testes de ícones**

Run: `npx vitest run src/components/icons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons.tsx src/components/icons.test.tsx
git commit -m "feat(ui): add lightweight zero-dependency SVG icons"
```

---

### Task 2: Criar Componente `IconButton` e Integrar no HUD

**Files:**
- Create: `src/components/IconButton.tsx`
- Modify: `src/pages/PlayerPage.tsx:100-125`
- Modify: `src/components/SettingsPanel.tsx:98-105`
- Modify: `src/components/ShortcutsOverlay.tsx:35-41`
- Test: `src/components/IconButton.test.tsx`

**Interfaces:**
- Consumes: Ícones de `src/components/icons.tsx`.
- Produces: Botão perfeitamente quadrado (`h-10 w-10`), com microinterações táteis e suporte completo a leitor de tela.

- [ ] **Step 1: Escrever teste para o `IconButton`**

Em `src/components/IconButton.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IconButton } from './IconButton';
import { CloseIcon } from './icons';

describe('IconButton', () => {
  it('renders with accessible name, title and proper sizing classes', () => {
    const onClick = vi.fn();
    render(<IconButton label="Fechar" icon={<CloseIcon />} onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /fechar/i });
    expect(btn).toHaveAttribute('title', 'Fechar');
    expect(btn.className).toContain('h-10 w-10');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/IconButton.test.tsx`
Expected: FAIL com módulo não encontrado.

- [ ] **Step 3: Implementar `IconButton.tsx`**

Criar `src/components/IconButton.tsx`:
```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export const IconButton = ({ icon, label, className = '', ...rest }: Props) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/5 text-neutral-900 backdrop-blur transition-all active:scale-95 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 ${className}`}
    {...rest}
  >
    {icon}
  </button>
);
```

- [ ] **Step 4: Refatorar os botões do Player em `PlayerPage.tsx`**

Substituir o grupo de botões retangulares por `IconButton`:
```tsx
      <div
        className={`absolute right-3 top-3 z-30 flex gap-2 transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <IconButton
          label={paused ? t('player.play') : t('player.pause')}
          icon={paused ? <PlayIcon /> : <PauseIcon />}
          onClick={() => setPaused((p) => !p)}
        />
        <IconButton
          label={t('player.shortcuts')}
          icon={<HelpIcon />}
          onClick={() => setShortcutsOpen(true)}
        />
        <IconButton
          label={t('player.settings')}
          icon={<SettingsIcon />}
          onClick={() => setSettingsOpen((o) => !o)}
        />
        <IconButton
          label={t('player.fullscreen')}
          icon={<FullscreenIcon />}
          onClick={() => toggle()}
        />
        <IconButton
          label={t('player.close')}
          icon={<CloseIcon />}
          onClick={() => {
            window.location.hash = '';
          }}
        />
      </div>
```

- [ ] **Step 5: Executar testes de regressão e typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/IconButton.tsx src/components/IconButton.test.tsx src/pages/PlayerPage.tsx
git commit -m "refactor(ui): adopt harmonic IconButton with vector SVGs in player HUD"
```
