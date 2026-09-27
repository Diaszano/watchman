# Plano de Implementação: Seleção Visual de Animações com Preview na Home

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o `<select>` de texto cego da tela inicial por um seletor visual interativo composto por mini-cards/chips de animações com ícones representativos, badges de categoria e feedback imediato de seleção, permitindo ao usuário reconhecer visualmente o efeito que deseja executar antes de iniciar a proteção.

**Architecture:** Criar o componente `src/components/AnimationPreviewCard.tsx`, refatorar `src/components/AnimationSelector.tsx` para apresentar um drawer/modal elegante ou carrossel horizontal compacto na tela inicial, permitindo navegar entre os 10 modos visuais (DVD, Matrix, Estrelas, Partículas, Relógio, Bolhas, Neon, Formas, Logo, Texto) com indicação do efeito ativo.

**Tech Stack:** React 19, TypeScript 5.6, Tailwind CSS v4, Zustand `settingsStore`, Vitest.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- O visual deve permanecer leve e rápido, sem renderizar 10 instâncias de canvas simultaneamente na Home.
- Manter suporte a teclado completo (setas esquerda/direita ou tabulação entre opções).
- Preservar a opção de compactação em telas móveis estreitas (< 400px).

---

### Task 1: Criar Componente de Card Visual `AnimationPreviewCard.tsx`

**Files:**
- Create: `src/components/AnimationPreviewCard.tsx`
- Test: `src/components/AnimationPreviewCard.test.tsx`

**Interfaces:**
- Consumes: ID da animação, título localizado, estado `selected: boolean`, `onSelect: () => void`.
- Produces: Card acessível com estado de foco, anel de seleção `ring-2 ring-sky-500` e microinterações `active:scale-95`.

- [ ] **Step 1: Escrever teste para o card de seleção**

Em `src/components/AnimationPreviewCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimationPreviewCard } from './AnimationPreviewCard';

describe('AnimationPreviewCard', () => {
  it('renders animation title and handles selection', () => {
    const onSelect = vi.fn();
    render(
      <AnimationPreviewCard
        id="dvd"
        title="Logo DVD"
        selected={true}
        onSelect={onSelect}
      />
    );
    const card = screen.getByRole('button', { name: /Logo DVD/i });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/AnimationPreviewCard.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `AnimationPreviewCard.tsx`**

Criar `src/components/AnimationPreviewCard.tsx`:
```tsx
import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}

export const AnimationPreviewCard = ({ id, title, selected, onSelect, icon }: Props) => (
  <button
    type="button"
    role="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      selected
        ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/20'
        : 'border-black/10 bg-black/5 text-neutral-700 hover:border-black/20 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/20 dark:hover:bg-white/10'
    }`}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/10 text-xl backdrop-blur dark:bg-white/10">
      {icon ?? '✨'}
    </div>
    <span className="text-xs font-medium tracking-tight line-clamp-1">{title}</span>
  </button>
);
```

- [ ] **Step 4: Executar testes**

Run: `npx vitest run src/components/AnimationPreviewCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimationPreviewCard.tsx src/components/AnimationPreviewCard.test.tsx
git commit -m "feat(ui): create AnimationPreviewCard component for visual selection"
```

---

### Task 2: Integrar Seletor Visual na `HomePage.tsx`

**Files:**
- Modify: `src/components/AnimationSelector.tsx:1-25`
- Modify: `src/pages/HomePage.tsx:26-35`
- Test: `src/components/AnimationSelector.test.tsx`

**Interfaces:**
- Consumes: Lista de animações de `src/animations/index.ts`, `settingsStore.animationId`.
- Produces: Grade/Carrossel responsivo de efeitos na tela inicial com seleção por clique direto.

- [ ] **Step 1: Escrever teste de seleção de animação através do componente refinado**

Em `src/components/AnimationSelector.test.tsx`:
```tsx
it('updates selected animation in store when clicked', () => {
  render(<AnimationSelector />);
  const matrixOption = screen.getByRole('button', { name: /Matrix Rain|Chuva Matrix/i });
  fireEvent.click(matrixOption);
  expect(useSettings.getState().animationId).toBe('matrix');
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/AnimationSelector.test.tsx`
Expected: FAIL ou adaptação necessária para nova interface.

- [ ] **Step 3: Implementar grade responsiva em `AnimationSelector.tsx`**

Em `src/components/AnimationSelector.tsx`:
```tsx
import { animations } from '@/animations';
import { useSettings } from '@/stores/settingsStore';
import { useI18n } from '@/hooks/useI18n';
import { AnimationPreviewCard } from './AnimationPreviewCard';

const animIcons: Record<string, string> = {
  dvd: '📀',
  clock: '⏰',
  particles: '⚛️',
  bubbles: '🫧',
  starfield: '✨',
  matrix: '💻',
  neon: '⚡',
  shapes: '📐',
  logo: '🖼️',
  text: '✍️',
};

export const AnimationSelector = () => {
  const { t } = useI18n();
  const animationId = useSettings((s) => s.animationId);
  const set = useSettings((s) => s.set);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {animations.map((a) => (
          <AnimationPreviewCard
            key={a.id}
            id={a.id}
            title={t(`anim.${a.id}`)}
            selected={animationId === a.id}
            icon={animIcons[a.id]}
            onSelect={() => set('animationId', a.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Executar testes e verificar typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimationSelector.tsx src/pages/HomePage.tsx
git commit -m "feat(ui): replace native select with visual animation preview cards"
```
