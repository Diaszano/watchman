# Plano de Implementação: Reestruturação do SettingsPanel em Abas e Especialização OLED

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o painel de configurações do Watchman de uma lista vertical congestionada para uma interface organizada em 4 abas temáticas ("Animação", "OLED & Tela", "Playlist", "Geral"), com botões de seleção rápida de cores OLED ("True Black" `#000000`) e tooltips informativos explicando a mecânica de *pixel-shifting* do modo Anti burn-in.

**Architecture:** Introduzir estado de aba ativa (`tab: 'animation' | 'oled' | 'playlist' | 'general'`) dentro de `SettingsPanel.tsx`, criar cabeçalho de navegação de abas com suporte a teclado (setas / tab), agrupar os controles correspondentes em painéis semânticos com `role="tabpanel"`, e disponibilizar presets de cor de fundo otimizados para OLED.

**Tech Stack:** React 19, TypeScript 5.6, Tailwind CSS v4, Zustand, Vitest.

**Spec:** Auditoria de UI/UX do Watchman (2026-09-26).

## Global Constraints

- O estado do painel (aba selecionada) deve ser persistido apenas em memória de sessão ou padrão na primeira aba.
- Preservar todos os controles contextuais (`isRelevant(control)`) sem perder sincronia com `settingsStore`.
- Manter acessibilidade com atributos ARIA (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`).

---

### Task 1: Adicionar Traduções para Abas e Tooltips OLED

**Files:**
- Modify: `src/services/i18n.ts:14-61` (EN)
- Modify: `src/services/i18n.ts:70-118` (PT)
- Test: `src/services/i18n.test.ts`

**Interfaces:**
- Produces: Novas chaves `settings.tab.animation`, `settings.tab.oled`, `settings.tab.playlist`, `settings.tab.general`, `settings.antiBurnIn.desc`, `settings.trueBlack`.

- [ ] **Step 1: Escrever teste para chaves das abas**

Em `src/services/i18n.test.ts`:
```typescript
it('provides translations for settings tabs and oled explanations', () => {
  const keys = [
    'settings.tab.animation',
    'settings.tab.oled',
    'settings.tab.playlist',
    'settings.tab.general',
    'settings.antiBurnIn.desc',
    'settings.trueBlack',
  ];
  for (const k of keys) {
    expect(translate('en', k)).not.toBe(k);
    expect(translate('pt', k)).not.toBe(k);
  }
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/services/i18n.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar chaves em `src/services/i18n.ts`**

No dicionário `en`:
```typescript
  'settings.tab.animation': 'Animation',
  'settings.tab.oled': 'OLED & Display',
  'settings.tab.playlist': 'Playlist',
  'settings.tab.general': 'General',
  'settings.antiBurnIn.desc': 'Subtly drifts pixels periodically to prevent image retention on OLED panels.',
  'settings.trueBlack': 'True Black (0% OLED power)',
```

No dicionário `pt`:
```typescript
  'settings.tab.animation': 'Animação',
  'settings.tab.oled': 'OLED & Tela',
  'settings.tab.playlist': 'Playlist',
  'settings.tab.general': 'Geral',
  'settings.antiBurnIn.desc': 'Desloca levemente os pixels em intervalos regulares para evitar retenção de imagem.',
  'settings.trueBlack': 'Preto Puro (0% consumo OLED)',
```

- [ ] **Step 4: Executar testes**

Run: `npx vitest run src/services/i18n.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/i18n.ts src/services/i18n.test.ts
git commit -m "feat(i18n): add settings tabs and OLED tooltip strings"
```

---

### Task 2: Implementar Navegação por Abas em `SettingsPanel.tsx`

**Files:**
- Modify: `src/components/SettingsPanel.tsx:16-290`
- Test: `src/components/SettingsPanel.test.tsx`

**Interfaces:**
- Consumes: `settingsStore`, `useI18n`.
- Produces: Painel com 4 abas alternáveis, organizando sliders, toggles e presets OLED.

- [ ] **Step 1: Escrever teste de alternância de abas**

Em `src/components/SettingsPanel.test.tsx`:
```tsx
it('renders tabs and switches active tabpanel on click', () => {
  render(<SettingsPanel open={true} onClose={vi.fn()} />);
  const oledTab = screen.getByRole('tab', { name: /OLED & Tela|OLED & Display/i });
  fireEvent.click(oledTab);
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-oled');
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npx vitest run src/components/SettingsPanel.test.tsx`
Expected: FAIL pois abas não existem ainda.

- [ ] **Step 3: Refatorar `SettingsPanel.tsx` com estrutura de abas**

Em `src/components/SettingsPanel.tsx`:
1. Definir tipo `type SettingsTab = 'animation' | 'oled' | 'playlist' | 'general'`.
2. Criar estado `const [activeTab, setActiveTab] = useState<SettingsTab>('animation')`.
3. Renderizar barra de abas no topo:
```tsx
      <div role="tablist" aria-label={t('settings.title')} className="mb-3 flex gap-1 border-b border-black/10 pb-2 dark:border-white/10">
        {(['animation', 'oled', 'playlist', 'general'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-sky-500 text-white'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white'
            }`}
          >
            {t(`settings.tab.${tab}`)}
          </button>
        ))}
      </div>
```
4. Distribuir os campos em containers condicionais:
   - `activeTab === 'animation'`: Sliders dinâmicos (`speed`, `count`, `size`, `opacity`, `brightness`), cor de destaque, texto customizado e logo customizada.
   - `activeTab === 'oled'`: Toggle Anti burn-in acompanhado de texto auxiliar com `t('settings.antiBurnIn.desc')`, seletor de fundo com preset de botão "True Black (#000000)", toggle Gradiente, limite de FPS e toggle Show FPS.
   - `activeTab === 'playlist'`: Seleção de animações para rotacionar, tempo de auto-switch e modo (sequencial/aleatório).
   - `activeTab === 'general'`: Tema (escuro/claro), Idioma (EN/PT) e botão de Redefinir.

- [ ] **Step 4: Executar testes e validar TypeScript**

Run: `npx vitest run src/components/SettingsPanel.test.tsx && npx tsc --noEmit`
Expected: PASS com 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/SettingsPanel.test.tsx
git commit -m "feat(ui): organize SettingsPanel into 4 focused tabs with OLED presets"
```
