# Plano de Implementação: Otimização de Assets e Performance Visual (LCP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir o peso do logotipo do Watchman de 1.1MB para menos de 45KB utilizando WebP otimizado (ou SVG), eliminando o atraso na métrica Core Web Vital de LCP (*Largest Contentful Paint*) na tela inicial e prevenindo layout shifts através de dimensões intrínsecas explícitas.

**Architecture:** Criar um script de build/otimização em Node.js com a biblioteca `sharp` (já presente em `devDependencies`), gerar `public/logo.webp` com compressão sem perdas perceptíveis, atualizar `src/components/Logo.tsx` com `<picture>` tag moderna para compatibilidade retroativa e dimensões `width` e `height` proporcionais.

**Tech Stack:** Node.js, Sharp 0.35, HTML5 `<picture>`, React 19.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- O logotipo final não deve apresentar artefatos visuais ou perda de fidelidade no efeito de glow (`drop-shadow`).
- Preservar transparência no canal alfa do fundo do logotipo.
- Manter o fallback seguro para navegadores legados via `<source type="image/webp">` e `<img>`.

---

### Task 1: Gerar Asset Otimizado WebP a partir do PNG Original

**Files:**
- Create: `scripts/optimize-logo.mjs`
- Create: `public/logo.webp`

**Interfaces:**
- Consumes: Arquivo fonte `public/logo.png` (1.1 MB).
- Produces: Arquivo ultra-otimizado `public/logo.webp` (< 50 KB).

- [ ] **Step 1: Criar script de compressão de assets**

Criar `scripts/optimize-logo.mjs`:
```javascript
import sharp from 'sharp';
import fs from 'node:fs';

const input = 'public/logo.png';
const output = 'public/logo.webp';

if (!fs.existsSync(input)) {
  console.error(`Input file ${input} not found`);
  process.exit(1);
}

await sharp(input)
  .resize(640, null, { withoutEnlargement: true })
  .webp({ quality: 85, effort: 6 })
  .toFile(output);

const inSize = (fs.statSync(input).size / 1024).toFixed(1);
const outSize = (fs.statSync(output).size / 1024).toFixed(1);
console.log(`Logo optimized: ${inSize}KB -> ${outSize}KB`);
```

- [ ] **Step 2: Executar script e validar redução de tamanho**

Run: `node scripts/optimize-logo.mjs`
Expected: Saída confirmando redução drástica de ~1100KB para ~30-40KB e arquivo `public/logo.webp` gerado.

- [ ] **Step 3: Commit do asset e script**

```bash
git add scripts/optimize-logo.mjs public/logo.webp
git commit -m "perf(assets): generate optimized WebP version of main logo"
```

---

### Task 2: Atualizar `Logo.tsx` com Elemento `<picture>` Moderno

**Files:**
- Modify: `src/components/Logo.tsx:1-9`
- Modify: `src/components/Logo.test.tsx`
- Test: `src/components/Logo.test.tsx`

**Interfaces:**
- Consumes: `public/logo.webp` e `public/logo.png`.
- Produces: Marcação responsiva sem Layout Shift (`aspect-ratio` mantido).

- [ ] **Step 1: Escrever teste para renderização da tag `<picture>`**

Em `src/components/Logo.test.tsx`:
```tsx
it('renders picture element with webp source and fallback img', () => {
  render(<Logo size={300} />);
  const picture = document.querySelector('picture');
  expect(picture).toBeInTheDocument();
  const source = picture?.querySelector('source');
  expect(source).toHaveAttribute('type', 'image/webp');
  expect(source).toHaveAttribute('srcset', '/logo.webp');
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/Logo.test.tsx`
Expected: FAIL indicando ausência do `<picture>`.

- [ ] **Step 3: Implementar `<picture>` em `src/components/Logo.tsx`**

Em `src/components/Logo.tsx`:
```tsx
import { useI18n } from '@/hooks/useI18n';

export const Logo = ({ size = 240 }: { size?: number }) => {
  const { t } = useI18n();
  return (
    <picture>
      <source srcSet="/logo.webp" type="image/webp" />
      <img
        src="/logo.png"
        alt={t('app.logoAlt')}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        className="h-auto max-w-full drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
      />
    </picture>
  );
};
```

- [ ] **Step 4: Executar testes e verificar typecheck**

Run: `npx vitest run src/components/Logo.test.tsx && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/Logo.tsx src/components/Logo.test.tsx
git commit -m "perf(ui): adopt responsive <picture> with webp support in Logo"
```
