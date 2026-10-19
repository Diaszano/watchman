# Watchman Design Direction

## Overview

**Direção escolhida pelo dono:** refinar a identidade atual, com o urso, o violeta e uma interface calma de aplicativo desktop.

**Design Read:** ferramenta de proteção visual para quem mantém uma tela ativa, com controles discretos e animações como conteúdo principal. ENERGY 1 / RHYTHM 2 / MOTION 1 para a interface; o movimento do screensaver é o próprio produto.

Preservar as funções, o conteúdo e o logotipo existentes. Melhorar clareza, consistência e acessibilidade sem trocar a linguagem visual. Na página inicial, a ação de iniciar é o foco; no player, a animação é o foco; nas configurações, o controle em uso é o foco.

## Colors

Usar os tokens de `src/styles/theme.css` como fonte dos valores. O violeta marca seleção, foco e ação principal porque identifica o Watchman e ajuda a localizar a próxima ação. Superfícies neutras mantêm as animações em destaque. Os temas claro e escuro continuam funcionais; todos os textos devem cumprir WCAG AA, inclusive no painel escuro do player.

## Typography

Manter a pilha de fontes de sistema definida em `src/styles/index.css`. Ela combina com o caráter de ferramenta desktop e preserva leitura familiar nas plataformas atendidas. Diferenciar títulos, descrições e rótulos por tamanho e peso, sem depender de maiúsculas espaçadas ou de texto pequeno de baixo contraste.

## Layout

Manter a sequência atual de apresentação e escolha da animação. O bloco inicial apresenta a ação principal; a grade permite comparar previews reais. Usar espaço para separar esses dois trabalhos e adaptar a grade à largura disponível. A interface deve permanecer utilizável a partir de 320 px, sem overflow e com alvos de toque de pelo menos 44 × 44 px.

## Elevation & Depth

Usar bordas e diferenças de superfície para organizar o conteúdo. Reservar sombra mais forte para o painel sobreposto, que realmente fica acima da tela; cartões e botões precisam de elevação discreta. Brilho pertence aos previews de animação e ao estado de foco, não a todos os elementos.

## Shapes

Manter a hierarquia de raios já definida nos tokens: controles menores, cartões intermediários e painel maior. A variação distingue funções e evita transformar tudo em cápsula.

## Components

Botões, filtros, busca, cards e configurações continuam usando os componentes existentes. Seleção, foco, espera, erro e estado vazio precisam ser perceptíveis. O urso permanece como marca; os previews mostram o conteúdo das animações e não são substituídos por ilustrações genéricas.

## Do's and Don'ts

- Usar o violeta com parcimônia para ação, seleção e foco; ele deve orientar a atenção.
- Usar movimento de interface apenas para comunicar resposta ou mudança de estado; respeitar `prefers-reduced-motion`.
- Manter rótulos, mensagens e ações em inglês e português.
- Não criar novos assets, claims ou seções decorativas para preencher espaço.
- Não copiar a aparência completa de outro aplicativo; a marca e as animações do Watchman devem continuar reconhecíveis.
