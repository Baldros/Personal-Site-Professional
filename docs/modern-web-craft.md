# Como os sites "modernos" são feitos

> Documento de estudo. Escrito em português por ser material de aprendizado, e não
> conteúdo do site — o site permanece em inglês.
>
> Investigação feita a partir dos seis sites de referência que você mandou, verificando
> stack real onde foi possível e marcando explicitamente o que não deu para confirmar.

---

## 0. A conclusão, antes de tudo

Você mandou seis sites premiados achando que o segredo estava em 3D e imagens pesadas.
Não está.

**Dos seis, dois não têm 3D nenhum.** E um deles — o Tresmares Capital, da Dgrees —
ganhou **Site of the Day no Awwwards em 12/06/2026** com esta stack, listada pelo próprio
Awwwards:

```
GSAP · Vanilla JS · SVG · Animation · Parallax · Scrolling
```

Sem React. Sem Next.js. Sem three.js. Sem WebGL. O site cliente roda em **WordPress**.

O OroSwap tirou **7.98/10 no CSS Design Awards** servindo apenas `.webp` e `.svg` — não
há um único `.glb` na página.

O que separa esses sites do seu não é tecnologia. É **coreografia, tipografia e
contenção**. Isso é uma notícia excelente, porque significa que a distância é de
técnica, não de orçamento.

---

## 1. Os seis sites, com stack verificada

| Site | Framework/CMS | Animação | 3D | Assets sob medida? | Dá pra fazer sozinho? |
|---|---|---|---|---|---|
| [Tresmares Capital](https://www.awwwards.com/sites/tresmares-capital) | WordPress | **GSAP**, vanilla JS, SVG | nenhum (vídeo pré-renderizado) | médio | **Sim, quase todo** |
| [Steven.com](https://www.awwwards.com/sites/steven-com) | **Webflow** | **GSAP**, Rive | **three.js / WebGL** | **alto** | Não |
| [OroSwap](https://www.cssdesignawards.com/sites/oroswap/49198/) | Webflow (confiança média) | não confirmado (provável GSAP) | nenhum encontrado | **baixo** | **Sim** |
| [Blackbird Awards](https://mesh3d.gallery/website/blackbird-groundbreaking-international-website-awards) | desconhecido (site retorna 403) | shaders | **three.js + glTF + áudio** | médio | Com esforço |
| [Voxelo](https://mesh3d.gallery/website/voxelo-a-new-3d-ai-studio-for-ecommerce) | **Next.js + React** | não confirmado | **WebGL** (provável react-three-fiber) | alto | Arquitetura sim, conteúdo não |

### Os números que mais ensinam

O Awwwards publica as subnotas do júri. Repare no padrão:

| | Design | Usabilidade | Criatividade | Conteúdo | **Acessibilidade** |
|---|---|---|---|---|---|
| Tresmares | 7.30 | 7.28 | 7.03 | 7.41 | **6.60** |
| Steven.com | 7.69 | 7.28 | **8.17** | 7.47 | — |

Duas leituras:

1. **O júri premia criatividade e animação, e tolera acessibilidade ruim.** O Tresmares
   ganhou Site of the Day com **6.60 em acessibilidade** — a sua pior subnota. Saber
   disso é o que permite copiar o *ofício* sem herdar a *dívida*.
2. **Animações/Transições foi a maior nota do Tresmares (8.20).** É ali que o esforço
   compensa.

### Como investigar um site sozinho

Habilidade separada, e vale mais que este documento inteiro:

- **Perfis do Awwwards listam a stack.** Campo "Technologies". É a fonte mais confiável
  que existe.
- **Perfis do CSSDA não listam.** Verifiquei especificamente: não existe campo "Built
  with". Não confunda os dois.
- **DevTools → Network → filtro JS.** Leia os nomes dos bundles. `gsap.min.js`,
  `three.module.js`, `lenis.mjs` aparecem crus.
- **Console:** `window.gsap`, `window.THREE`, `window.__NEXT_DATA__`, `window.Webflow`.
  Quatro linhas respondem quase tudo.
- **Fingerprints de URL:** `cdn.prod.website-files.com` = Webflow. `/_next/static/` =
  Next.js. `/wp-content/` = WordPress.
- **Wappalyzer / BuiltWith** para o resto.

> Nota metodológica: parte da pesquisa foi feita com fetch que converte HTML em markdown,
> o que **remove as tags `<script>`**. Por isso a stack do OroSwap e do Blackbird ficou
> não confirmada. Com DevTools aberto você resolve em 10 segundos o que travou aqui.

---

## 2. A toolchain de 2026

### GSAP ficou de graça — e isso mudou tudo

Este é o fato mais importante e o mais desatualizado na internet:

- **Outubro/2024:** a Webflow comprou a GreenSock.
- **Abril/2025:** o GSAP passou a ser **100% gratuito, inclusive para uso comercial**,
  em todas as plataformas.
- **Todos os plugins do antigo Club GreenSock vieram junto:** `SplitText`, `MorphSVG`,
  `DrawSVG`, `ScrollTrigger`, `ScrollSmoother`, `Inertia`, `Flip`, `Observer`.

Qualquer tutorial que diga que o SplitText custa US$ 99/ano está velho. E o SplitText
era exatamente o muro que separava site de hobby de site de agência: é ele que quebra um
parágrafo em **linhas renderizadas** para animar uma a uma. É o upgrade isolado de maior
impacto no visual percebido de um portfólio.

### Lenis: o que ele realmente faz

Confusão comum. O **Locomotive Scroll** sequestra o scroll: desliga o nativo, embrulha o
body num container fixo e move com `transform`. Quebra `position: sticky`, âncoras,
Ctrl+F e restauração de scroll.

O **Lenis não faz isso.** Ele mantém o scroll nativo ativo e aplica uma camada fina de
interpolação por cima da posição real. Consequência: sticky, âncoras, busca na página e
scrollbar continuam funcionando. Foi por isso que ele venceu — o Locomotive v5 hoje é
construído **em cima** do Lenis.

Ele nasceu na darkroom.engineering para **sincronizar WebGL com o scroll do DOM**, e essa
continua sendo a razão nº 1 de existir num site com three.js.

**A pegadinha que derruba todo mundo:** não deixe Lenis e GSAP rodarem dois
`requestAnimationFrame` separados. Os relógios desincronizam e o ScrollTrigger lê uma
posição de scroll um frame atrasada — o sintoma é seção pinada tremendo. A forma certa,
que é a usada neste repositório em `src/lib/motion/smooth.ts`:

```ts
const lenis = new Lenis({ autoRaf: false });   // ← ele NÃO roda sozinho
lenis.on("scroll", ScrollTrigger.update);      // ← Lenis avisa o ScrollTrigger
gsap.ticker.add((time) => lenis.raf(time * 1000)); // ← GSAP dirige o Lenis
gsap.ticker.lagSmoothing(0);                   // ← sem descarte de delta
```

### ScrollTrigger faz quatro coisas diferentes

Quase todo mundo usa só a primeira e acha que conhece a biblioteca:

1. **Trigger** — dispara uma animação quando o elemento entra na viewport.
   `start`, `end`, `toggleActions`.
2. **Scrub** — amarra o *playhead* de uma timeline à posição de scroll.
   `scrub: true` cola; `scrub: 0.6` adiciona um lerp de recuperação — é essa diferença
   que separa "mecânico" de "caro".
3. **Pin** — `pin: true` congela um elemento enquanto a página rola por baixo.
   **Toda "seção sticky que anima conforme você rola" que você já viu é esta única
   propriedade.** É o maior retorno por linha da biblioteca inteira.
4. **Snap / callbacks** — encaixe entre seções, e `self.progress` para dirigir uma câmera
   WebGL.

---

## 3. O que o CSS já tomou do JavaScript

Metade do que o GSAP fazia em 2020 hoje é CSS nativo, roda **fora da main thread** e
custa 0 KB.

| Recurso | Substitui | Suporte (meados de 2026) |
|---|---|---|
| `animation-timeline: view()` | **IntersectionObserver para reveals, inteiro** | Chrome/Edge 115+, Safari 18+, Firefox 132+ — ~84-90% global |
| `animation-timeline: scroll()` | barra de progresso, parallax de fundo | idem |
| `@starting-style` | gambiarra de timing para animar a partir de `display:none` | Baseline desde 2024, ~87% |
| `@property` | animar custom properties (gradientes, ângulos, contadores) | **Baseline desde jul/2024, ~95%+** |
| View Transitions (mesmo documento) | animações de layout do Framer Motion | Baseline: Chrome 111+, Firefox 133+, Safari 18+ |
| View Transitions (entre documentos) | transição de página sem virar SPA | Chrome 126+, Safari 18.2+ — **Firefox ainda não** |
| `text-wrap: balance` / `pretty` | scripts de balanceamento de título | amplamente disponível |

### A regra prática

> **CSS para reveals. GSAP para coreografia.**

CSS **não** faz: timeline sequenciada com easing compartilhado, `pin`, snap, quebra de
texto em linhas, morph, física/inércia, ou dirigir uma câmera WebGL. É por isso que os
sites premiados continuam carregando GSAP — não porque CSS não evoluiu.

Neste repositório a divisão está em dois arquivos, de propósito:

- `src/styles/motion.css` — todos os reveals, via `animation-timeline: view()`. Zero JS.
- `src/lib/motion/` — só o que CSS não faz.

---

## 4. Catálogo de efeitos

O que cada efeito das referências custa e como se faz.

### Parallax multiplano
O efeito que você pediu. **Não tem 3D nenhum.** São N elementos empilhados, cada um
transladando numa fração diferente da distância de scroll. Três planos já leem como
profundidade.

```
data-parallax="0.35"   anda junto, mais devagar  → lê como "longe"
data-parallax="-0.20"  anda contra a página      → lê como "perto"
```

Implementação: `src/lib/motion/parallax.ts`. No hero deste site são três planos — o brilho
radial de fundo, e as duas linhas do nome viajando em taxas diferentes.

**Custo:** ~30 linhas. Roda no compositor.

### Reveal de texto por linha
`SplitText` com `mask: "lines"` embrulha cada linha num container `overflow: hidden`, e
as linhas sobem de trás da borda dura. É o "rolar de baixo" que você vê em toda agência.
Sem a máscara vira fade comum e perde metade do efeito.

**Custo:** ~25 linhas. Ver `src/lib/motion/reveal.ts`.

### Seção pinada com scrub
`pin: true` + `scrub`. Neste site está no case do Atlas, na seção "The rewrite": a seção
trava na viewport e o trilho de cards desliza **horizontalmente** conforme você rola para
baixo.

**Este é o único efeito do site que exige GSAP de verdade.** Traduzir distância vertical
de scroll em deslocamento horizontal não tem equivalente em CSS. Para o resto, `position:
sticky` faz o mesmo com menos risco — e foi o que usei na seção de arquitetura, onde o
diagrama fica parado enquanto os textos passam.

**Regra:** `pin` do ScrollTrigger e `position: sticky` na mesma seção brigam. Escolha um
por seção.

### Cursor customizado + botões magnéticos
Um `div` fixo seguindo o ponteiro com `gsap.quickTo` (que é a API rápida — não use
`gsap.to` num `pointermove`), e elementos que se deslocam na direção do cursor quando ele
chega perto.

**Cuidados:** só monte em `(pointer: fine)`, e esconda o cursor nativo **só depois** que
o seu estiver comprovadamente rodando — senão uma falha de JS deixa o visitante sem
ponteiro nenhum. Ver `src/lib/motion/cursor.ts`.

### Marquee infinito
Fácil de fazer, e é uma **armadilha de acessibilidade**: a WCAG **2.2.2 Pause/Stop/Hide**
é nível **AA** (obrigatório na prática) e exige mecanismo de pausa para qualquer conteúdo
em movimento automático que dure mais de 5 segundos. Pausar no hover não resolve, porque
não é acessível por teclado.

Por isso **este site não tem marquee**. A trilha de tecnologias em "Capabilities" é uma
fileira estática que quebra linha. Foi decisão consciente, não esquecimento.

### Grão / noise
Uma textura SVG `feTurbulence` em `data:` URI, fixa por cima da página com opacidade
~4%. **~1 KB, zero requisições.** É o que impede áreas escuras grandes de fazer banding
em telas de 8 bits, e é metade da razão de esses sites parecerem "filme". Está em
`.grain`, em `src/styles/global.css`.

### Transição entre páginas
Astro tem `<ClientRouter />` embutido, que usa a View Transitions API onde existe e
degrada para navegação normal onde não existe. Custo: uma linha no `<head>`.

O detalhe que ninguém documenta: com transições de view, **seu JS de animação precisa ser
re-inicializado a cada troca de página**, e o anterior precisa ser destruído — senão
ScrollTriggers acumulam a cada navegação e o site fica progressivamente mais lento. O
padrão está em `src/components/Layout.astro`:

```ts
document.addEventListener("astro:page-load", initMotion);
document.addEventListener("astro:before-swap", destroyMotion);
```

---

## 5. A questão do 3D

Você supôs que esses sites usam muitos objetos 3D. Metade não usa. Para a outra metade,
existe uma escada de esforço — e **os degraus 1 a 4 cobrem quase todo o visual premiado**.

| # | Técnica | Custo | Observação |
|---|---|---|---|
| 1 | **Vídeo / sequência de imagens pré-renderizada** | baixo | Renderiza no Blender, faz scrub dos frames com ScrollTrigger. É quase certamente o que o Tresmares faz com a montanha. **Melhor qualidade por esforço da lista inteira.** Zero WebGL, funciona em tudo. |
| 2 | **Fake-3D em CSS** | baixo | `perspective`, `transform-style: preserve-3d`, parallax multiplano. Grátis, acessível, degrada perfeitamente. |
| 3 | **Lottie** | baixo | Vetor animado, 10-20× menor que GIF, resolução livre. Ideal para ícones e detalhes. Biblioteca gratuita grande. |
| 4 | **Spline** | baixo | Editor 3D no navegador, `<spline-viewer>` embutido, sem saber three.js. Grátis (Pro ~US$7/mês tira a marca d'água). **A rota mais rápida para "tem 3D no meu site".** Tem integração oficial com Webflow — provavelmente é assim que metade dos "sites 3D" do Webflow são feitos. |
| 5 | **Rive** | médio | Motion com máquina de estados: reage a hover, clique, scroll — coisa que Lottie não faz. Foi usado no Steven.com. Mas **~US$32/assento/mês**. |
| 6 | **Blender → glTF → three.js** | alto | Ferramental gratuito, teto real, custo real de tempo. |
| 7 | **Shaders GLSL** | muito alto | Distorção em hover, sistemas de partículas. É o patamar do Blackbird. Meses, não semanas. |

### O truque das partículas (o caso Blackbird)
Pega **qualquer** malha, amostra os vértices para um buffer de partículas na GPU e anima
com shader. O Awwwards vende um curso disso literalmente chamado *"starting from bad
models"* — porque, depois que a malha vira pontos, **a qualidade do modelo deixa de
importar**. O difícil ali é o shader, não o asset.

### Se você for até o degrau 6, o pipeline é este

- **Formato:** glTF 2.0 / `.glb`. Não existe concorrente sério.
- **Compressão de geometria:** **Draco** (~90-95% de redução) vs **Meshopt**. A nuance que
  importa: Meshopt + gzip chega perto do Draco com **decode muito mais rápido**, e
  **preserva morph targets e animação de keyframe, que o Draco descarta**. Então: Draco
  para objeto estático de hero, Meshopt para qualquer coisa animada.
- **Compressão de textura:** **KTX2 / Basis Universal**. É o passo que todo mundo pula e
  não deveria: KTX2 fica comprimida **na VRAM**, cortando ~10×. Uma única textura 4K sem
  compressão come **64 MB+ de VRAM**. Use UASTC para normal maps e texturas de destaque,
  ETC1S para o resto.
- **Ferramenta:** [glTF-Transform](https://gltf-transform.dev/) faz o pipeline inteiro
  por CLI — dedupe, weld, prune, resize, Draco/Meshopt, KTX2.
- **Pegadinha:** no three.js você precisa ligar `DRACOLoader` e `KTX2Loader` no
  `GLTFLoader` explicitamente. Sem isso o modelo falha **em silêncio**.

---

## 6. A conta que ninguém mostra

Medianas do **HTTP Archive Web Almanac 2025**:

| | Desktop | Mobile |
|---|---|---|
| Peso total (mediana) | 2.412 KB | 2.164 KB |
| Peso total (p90) | **9.179 KB** | **8.337 KB** |
| JS (mediana) | 697 KB | 632 KB |
| CSS (mediana) | 82 KB | 77 KB |

Um build com three.js (~600 KB minificado) + GSAP + um GLB comprimido + texturas KTX2 +
um vídeo de hero coloca você **no percentil 90 sozinho**, antes de qualquer conteúdo.
**Um site WebGL premiado está, por construção, nos 10% mais pesados da web.**

### Lighthouse

O peso do Lighthouse 10: **TBT 30%**, LCP 25%, CLS 25%, FCP 10%, Speed Index 10%.

**TBT em 30% é o assassino** — parse de glTF, decode de Draco e compilação de shader são
todos trabalho bloqueante na main thread. E LCP abaixo de 2,5s já é a métrica mais difícil
da web: **só 62% das páginas mobile passam** mesmo sem 3D.

### SEO

O Google não usa a nota do Lighthouse como fator de ranqueamento, mas os Core Web Vitals
de campo estão no algoritmo. O risco maior, porém, não é velocidade: é **texto dentro de
canvas, que é invisível para o crawler**. Repare que o Steven.com — o mais WebGL da lista
— tirou só **7.47 em Conteúdo**.

### Para comparação, este site

O bundle desta reestruturação, medido:

```
GSAP + Lenis + camada de motion   ~141 KB cru   (~50 KB gz)
React 19 (só o dock do Atlas)     ~180 KB cru   (~57 KB gz)
CSS total                         ~47 KB cru
─────────────────────────────────────────────────────────
JS total                          ~352 KB cru   (120,8 KB gz)
```

Bem abaixo da mediana em JS, e o maior item nem é a animação — é o React que existe só
para o chat dock. Se um dia isso incomodar, reescrever o dock sem React derruba quase
metade do JS da página.

---

## 7. Acessibilidade, sem hipocrisia

Vale separar o que é obrigatório do que é boa vontade:

- **`prefers-reduced-motion`** — configuração de sistema operacional, exposta a CSS e JS.
  Respeitar é o piso.
- **WCAG 2.3.3 "Animation from Interactions"** — exige poder desligar animação disparada
  por interação. É **nível AAA**, ou seja, **não é exigido** por ADA Title III nem por
  EN 301 549, que param em AA. Aparece em licitação de governo, saúde e educação.
- **WCAG 2.2.2 "Pause, Stop, Hide"** — **nível AA, esse pega.** Marquee infinito,
  carrossel automático, qualquer loop acima de 5s precisa de mecanismo de pausa.
- **Operabilidade por teclado** de cursor customizado e navegação com scrolljack — AA
  também, e é onde esses sites mais falham.

### O que este site faz

Regra que virou convenção do repositório: **nada de movimento monta sob reduced motion.**
Não é um override cosmético — é dos dois lados:

- `src/lib/motion/index.ts` embrulha tudo num `gsap.matchMedia()` com
  `(prefers-reduced-motion: no-preference)`. Sob reduced motion **nada é instanciado**:
  nem Lenis, nem ScrollTrigger, nem o canvas do hero, nem o cursor.
- `src/styles/motion.css` neutraliza independentemente a sua própria camada.

E uma regra mais forte, que vale copiar para qualquer projeto:

> **O estado padrão de todo elemento é VISÍVEL.** O estado escondido só é aplicado dentro
> de `@supports (animation-timeline: view())`.

Assim, um navegador sem scroll-driven animations mostra uma página estática **completa**,
e nenhuma falha de JS pode deixar conteúdo invisível. Foi por isso que removi o pre-hide
do SplitText durante esta implementação: esconder texto em CSS para revelar em JS
significa que qualquer erro de script deixa a página em branco para sempre.

Compare com o Tresmares: Site of the Day, **6.60 de acessibilidade**.

---

## 8. O que apliquei aqui, e o que recusei

### Aplicado

| Técnica | Onde |
|---|---|
| Design tokens (cor, tipo, espaço, z-index, easing) | `src/styles/tokens.css` |
| Parallax multiplano | hero, featured, contato, hero do Atlas |
| Reveal por linha com SplitText | todos os títulos de seção |
| Reveal em CSS scroll-driven (0 KB de JS) | cards, listas, métricas |
| Smooth scroll Lenis dirigido pelo ticker do GSAP | global |
| Trilho horizontal pinado com scrub | seção "The rewrite" do case Atlas |
| Sticky nativo (em vez de pin) | diagrama de arquitetura |
| Cursor customizado + botões magnéticos | desktop, ponteiro fino |
| Contadores animados | métricas |
| Grão SVG sobre a página | global |
| Transições de página | `<ClientRouter />` |
| Gradiente em texto display | nome no hero, "ATLAS" |

### Recusado, de propósito

- **WebGL / three.js.** Não há assets 3D — o repositório do Atlas tem exatamente 25
  imagens e **todas são ícones de template**. Colocar 3D genérico só para ter 3D
  custaria ~250 KB e o Lighthouse, sem contar nada de verdade.
- **Marquee infinito.** WCAG 2.2.2, explicado acima.
- **Preloader.** Quase sempre é tempo de carregamento *fabricado*. Se a página é rápida,
  o preloader a deixa mais lenta de propósito.
- **Scrolljacking de página inteira.** Quebra Ctrl+F, âncora, restauração de scroll e
  navegação por teclado. O trilho horizontal é pinado, mas é **uma** seção, com fallback
  para scroll normal abaixo de 1024px.
- **Números de performance do Atlas.** O `BENCHMARKING_ATLAS_AGENT_RUNTIME.md` é um
  *playbook de metodologia* — nenhum benchmark foi rodado. Publicar número aqui seria
  inventar.

---

## 9. Roteiro de estudo

Se quiser dominar isso na ordem de maior retorno:

1. **ScrollTrigger, os quatro modos.** Especialmente `pin` e `scrub`. Uma tarde.
2. **SplitText.** Agora é grátis. É o maior salto de qualidade percebida por linha de
   código escrita.
3. **CSS scroll-driven animations.** Migre seus reveals para lá e apague JS.
4. **Lenis**, com a integração de ticker único acima.
5. **Blender**, só até conseguir exportar `.glb` e renderizar uma sequência de imagens.
   O degrau 1 da escada resolve mais do que parece.
6. **GLSL**, se e quando quiser o patamar Blackbird.

### Links que valem

- [GSAP virou gratuito — anúncio Webflow](https://webflow.com/blog/gsap-becomes-free) ·
  [licença](https://gsap.com/community/standard-license/)
- [Lenis](https://lenis.dev/) · [GitHub](https://github.com/darkroomengineering/lenis) ·
  [pen de integração com GSAP](https://codepen.io/GreenSock/pen/jOKvOpR)
- [MDN — Scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [Josh Comeau — Scroll-Driven Animations](https://www.joshwcomeau.com/animation/scroll-driven-animations/)
- [web.dev — View Transitions Baseline](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)
- [glTF-Transform](https://gltf-transform.dev/) · [three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Utsubo — 100 dicas de performance three.js (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [HTTP Archive Web Almanac 2025 — Page Weight](https://almanac.httparchive.org/en/2025/page-weight)
- [Deque — WCAG 2.3.3](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions)
- [Awwwards Academy — cursos de Blender](https://www.awwwards.com/academy/courses/blender)
- [Spline](https://spline.design/)

---

## 10. Não confirmado

Honestidade sobre os limites desta pesquisa:

1. **Biblioteca de animação do OroSwap** — só o CDN do Webflow foi confirmado. GSAP é
   inferência.
2. **Implementação real do blackbirdawards.com** — o site retorna **HTTP 403**. Tudo veio
   do post do próprio desenvolvedor no fórum do three.js e do campo de tecnologias do
   mesh3d.gallery.
3. **react-three-fiber no Voxelo** — "Next.js + React + WebGL" está confirmado; r3f
   especificamente é inferência.
4. **A montanha do Tresmares ser vídeo e não WebGL** — fortemente indicado (o Awwwards não
   lista three.js nem WebGL, e há tags `<video>` no markup), mas não confirmado
   diretamente.
5. **Peso de página dos seis sites** — não medido. Não existe dataset público de peso de
   vencedores do Awwwards; preferi dizer isso a chutar.
