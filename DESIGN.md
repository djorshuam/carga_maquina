# DESIGN.md — Carga Máquina (Injetoras)

Fonte de verdade visual do projeto. Derivado dos mockups aprovados em `docs/carga_maquina_*.html`, com paleta e tipografia realinhadas à marca JTECH (github.com/djorshuam/jtech-portfolio) e padrões estruturais do `DESIGN.md` de referência do Stripe em github.com/VoltAgent/awesome-design-md (a paleta de cor de marca da JTECH já é praticamente idêntica à do Stripe — só emprestamos daqui números tabulares, forma de botão/tag e o tom exato da sombra, não a identidade visual).

## 1. Atmosfera visual
Ferramenta industrial de chão de fábrica e PCP: densa em informação, sem decoração supérflua — mas com a identidade JTECH (roxo elétrico, tipografia Inter, leve profundidade) em vez de um azul genérico. Fundo com leve tom violeta, painéis brancos com borda fina e sombra sutil, sinalização semafórica (verde/amarelo/vermelho) carregando o significado. Sem dark mode no MVP — a marca tem um tema escuro pronto (ver portfólio) para uma fase futura.

## 2. Paleta (papéis semânticos)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | #f6f9fc | fundo da página (canvas-soft da marca) |
| `--panel` | #ffffff | painéis, cards, tabelas |
| `--border` | #e3e8ee | bordas e divisores (hairline da marca) |
| `--text` | #0d253d | texto principal (ink da marca) |
| `--muted` | #64748d | rótulos, descrições, hints (ink-mute da marca) |
| `--blue` / `--blue-deep` | #533afd / #4434d4 | ação primária, item ativo, bloco de ordem no Gantt (primary/primary-deep JTECH) |
| `--blue-bg` | #efecff | fundo de badges/nav ativo (tint pálido do primary) |
| `--green` / `--green-bg` | #2e9e5b / #e6f6ec | ok, disponível, OEE ≥ 80% — **não rebrandado** |
| `--yellow` / `--yellow-bg` | #c98a06 / #fff4dc | atenção, aguardando, OEE 60–80% — **não rebrandado** |
| `--red` / `--red-bg` | #d0402a / #fbe6e2 | sobrecarga, insuficiente, OEE < 60% — **não rebrandado** |
| `--setup` | #c9c3ea | bloco de setup no Gantt (neutro com leve tom violeta) |

Cor nunca é decorativa: cada uso mapeia para um estado. Verde/amarelo/vermelho ficam **fora do rebrand de propósito** — são semáforo funcional (sobrecarga, OEE, estoque) e a marca não define tons para esses papéis; trocar esses tons por algo mais "roxo" quebraria a leitura imediata da tela.

## 3. Tipografia
`Inter` (fonte da marca JTECH, via `next/font/google`), com fallback `-apple-system, Segoe UI, Roboto, Arial`. Corpo 13–14px. Títulos de página 20px/600. Título de painel 15px/600. Rótulos 12px muted. Section-title 12px uppercase, letter-spacing 0.04em. Valores de KPI 22px/600.

## 4. Componentes
- **Panel**: fundo branco, borda 1px, raio 12px, padding 18px, sombra `--shadow-1`. Título + `.desc` explicando o propósito do bloco (sempre).
- **Card KPI**: label muted + valor 22px/600, tracking -0.2px, cor do valor sinaliza estado.
- **Tag**: pill (raio total, `--radius-pill`) 11px/600, variantes `ok | warn | bad | info | neutral`.
- **Field**: label 12px acima, input 13px, hint 11px abaixo. Campos calculados usam `readonly` com fundo #f8f9fb.
- **Button**: formato pílula (padrão Stripe — nunca retângulo arredondado), neutro (branco/borda) e `primary` (roxo). Um único primary por painel.
- **Tabela**: cabeçalho uppercase 11px, linhas 13px, hover sutil. Todo número (qtd., horas, R$, %) usa `font-variant-numeric: tabular-nums` (aplicado globalmente no `body`) — colunas alinham entre linhas, herdado do padrão financeiro do Stripe.
- **Logo**: no topo da sidebar, link para o portfólio publicado (djorshuam.github.io/jtech-portfolio), recortada só no monograma "JT" via `object-fit: cover` — mesma técnica usada no próprio site da marca.
- **Gantt**: grade de 7 dias por máquina; barra azul = ordem, cinza = setup, vermelho = excedente de capacidade.
- **Velocímetro OEE**: semicírculo com zonas vermelho/amarelo/verde e ponteiro; estado "sem dados" quando não há apontamento.

## 5. Layout
Sidebar fixa (220px) com navegação por módulo; conteúdo com max-width 1280px, padding 24px. Grids de formulário 2–4 colunas, gap 12–14px. Painéis empilhados com gap 20px.

## 6. Profundidade
Quase plano, com uma sombra sutil (`--shadow-1`, `0 1px 3px rgba(0,55,112,.08)` — tom exato do `card` do Stripe DESIGN.md) em panels e cards. Hierarquia principal ainda vem de borda e fundo; a sombra só separa levemente o conteúdo do fundo violeta-claro. Foco em inputs com anel roxo translúcido (`rgba(83,58,253,.15)`).

## 7. Guardrails
- Não introduzir cores fora da paleta.
- Não usar OEE = 0% para ausência de dados — usar estado "sem dados".
- Não esconder cálculos: todo valor derivado mostra a fórmula/hint.
- Sem animações além de transições de 120ms em hover/foco.

## 8. Responsivo
Sidebar colapsa para topo em < 900px. Grids caem para 1–2 colunas. Gantt e tabelas rolam horizontalmente dentro do painel (nunca a página).

## 9. Guia para agentes
Ao criar tela nova: Panel → título → desc → grid de fields → btn-row (Cancelar + primary). Estados com Tag. Reutilizar classes de `app/globals.css`; não criar CSS ad hoc.
