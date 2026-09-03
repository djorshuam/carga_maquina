# SDD — Carga Máquina para Injetoras de Plástico

Status: DRAFT | Tier: T4 | Natureza: Backend + Frontend/UI (com componente de dados/BI)
Data: 2026-09-03

---

# 000 — Visão do Produto

## Problema central
Fábricas de injeção de plástico planejam a produção sem visibilidade clara da capacidade real de cada injetora, o que gera atrasos por sobrecarga, ociosidade não percebida, e decisões de sequenciamento tomadas "no feeling" (planilha ou quadro físico). Falta também retorno confiável entre o que foi planejado e o que foi de fato produzido.

## Usuários e personas
- **Planejador de Produção (PCP):** monta a carga da semana, decide sequenciamento e prioridades, reage a sobrecargas.
- **Operador de injetora:** consulta o que deve rodar no turno e registra o apontamento (produzido, refugo, paradas).
- **Supervisor/Gerente de produção:** acompanha OEE, cobertura de operadores e indicadores da frota.
- **Compras/PCM (opcional, integração futura):** consome o consumo de matéria-prima projetado.

## Proposta de valor
Dar ao PCP uma visão única e confiável da carga de cada injetora — cruzando capacidade, molde, matéria-prima e mão de obra — para planejar sem sobrecarregar máquinas, sem parar por falta de insumo, e enxergar em tempo real (via apontamento e OEE) se o planejado está de fato acontecendo no chão de fábrica.

## Funcionalidades do MVP
1. Cadastro de máquinas (capacidade técnica, tonelagem, prato)
2. Cadastro de moldes/produtos com tempo de ciclo, cavidades e setup
3. Cadastro de turnos/calendário por máquina (capacidade disponível real)
4. Cadastro de demanda (pedidos) com cálculo automático de horas necessárias
5. Visualização de carga em Gantt semanal por máquina, com alertas de sobrecarga
6. Cadastro de receita (composição de matéria-prima) e parâmetros de processo (temperaturas, tempo de aquecimento), com cálculo de consumo projetado por pedido
7. Necessidade de operadores por turno/máquina (quantidade, sem cadastro nominal) e painel de cobertura
8. Apontamento de produção por turno (produzido, refugo, tempo parado, motivo)
9. Painel de OEE (Disponibilidade × Performance × Qualidade) em formato velocímetro, por máquina e por frota

## Funcionalidades futuras (backlog, sem compromisso)
- Molde como recurso físico independente da máquina (evitar dois pedidos concorrentes pelo mesmo molde)
- Sequenciamento automático por agrupamento de cor/material (minimizar lavagem de canhão)
- Simulação "e se" (adicionar turno, mover ordem, aceitar pedido novo) antes de confirmar
- Integração com CLP da injetora para apontamento automático
- Integração com estoque/compras para baixa automática de matéria-prima
- Cadastro nominal de operadores e escala (v2, caso a fábrica queira ir além de "quantidade")
- Perfis de acesso hierárquicos: visão Gerente > visão Coordenador > visão Operador (cada nível vê/edita um subconjunto — a definir em spec própria quando priorizado)

## Não-objetivos do produto
- Não é um MES completo (não controla manutenção preditiva, qualidade dimensional, rastreabilidade de lote por peça)
- Não substitui o ERP — não faz faturamento, nota fiscal ou controle financeiro
- V1 não faz sequenciamento automático nem simulação — é visualização e alerta, decisão continua manual

## Métricas de sucesso
- Redução de sobrecargas não previstas (máquina "estoura" carga sem alerta prévio)
- % de pedidos com prazo em risco identificado com antecedência ≥ 48h
- Adoção do apontamento por turno ≥ 90% dos turnos ativos
- OEE médio da frota visível e atualizado diariamente

## Riscos principais
- Adoção do apontamento pelo operador (se não for simples, o dado fica incompleto e o OEE perde confiança)
- Qualidade do tempo de ciclo cadastrado (se estiver errado, toda a carga calculada fica errada)
- Ausência de integração com estoque real de matéria-prima no MVP (consumo é "projetado", não valida saldo real automaticamente)

---

# 001 — Arquitetura (visão inicial)

Natureza: Frontend/UI + Backend/API, com necessidade de cálculo (carga, OEE) e agregação (dashboard).

- **Frontend:** aplicação web responsiva, telas de cadastro (máquinas, moldes, receitas, turnos, operadores), tela de demanda/fila de alocação, Gantt de carga, painel de apontamento e painel de OEE (velocímetros).
- **Backend:** API que expõe CRUD dos cadastros, motor de cálculo de carga (capacidade × demanda), motor de cálculo de consumo de matéria-prima, motor de cálculo de OEE a partir dos apontamentos.
- **Dados:** banco relacional (entidades bem definidas na Seção 002); nenhuma integração externa obrigatória no MVP.
- Decisões de stack, hospedagem e detalhes de infraestrutura ficam para ADRs específicos quando a implementação começar — este documento fixa comportamento, não tecnologia.

---

# 002 — Modelo de Dados (entidades e invariantes)

## Maquina
- `codigo`, `tonelagem`, `fabricante_modelo`, `dimensao_prato`, `curso_abertura`, `capacidade_injecao_g`, `custo_hora`, `status` (ativa | manutenção | inativa)
- RN-01: uma máquina inativa não pode receber nova alocação de carga.

## Molde
- `codigo`, `produto`, `numero_cavidades`, `tempo_ciclo_s`, `tempo_setup_min`, `maquinas_compativeis[]`
- RN-02: `maquinas_compativeis` é restrito por tonelagem e dimensão do prato da máquina (validação obrigatória no cadastro).
- RN-03: `numero_cavidades` ≥ 1.

## Receita (vinculada a um Molde)
- `peso_peca_g`, `percentual_refugo_esperado`, `temperaturas` (alimentação, compressão, dosagem, molde), `tempo_aquecimento_inicial_min`, `tempo_resfriamento_por_tiro_s`
- `composicao[]`: lista de materiais com `% na mistura`, `peso_por_peca_g`
- RN-04: soma dos `% na mistura` da composição deve ser 100%.

## Material
- `nome`, `tipo` (resina virgem | reciclo | corante/masterbatch | outro), `estoque_disponivel_kg`
- Consumo por pedido é **calculado, não debitado automaticamente** no MVP (ver Não-objetivos).
- **Decisão (confirmada):** `estoque_disponivel_kg` é mantido manualmente dentro deste sistema no MVP — sem integração com sistema de estoque externo. O alerta de material insuficiente é confiável na medida em que o estoque for atualizado manualmente pelo usuário; não há checagem automática contra saldo real de outro sistema.

## Turno (vinculado a uma Máquina)
- `turno_1`, `turno_2`, `turno_3` (horários ou "inativo"), `dias_operacao`, `eficiencia_percentual`, `paradas_programadas[]` (motivo, data/hora início-fim)
- RN-05: capacidade disponível = horas de turnos ativos × eficiência − paradas programadas.

## NecessidadeOperador (vinculada a Máquina + Turno)
- `quantidade_necessaria`
- Sem vínculo nominal — apenas número. Comparado contra `operadores_disponiveis_no_turno` (input manual ou de outro sistema de escala, fora de escopo do MVP).

## Pedido / OrdemDeProducao
- `produto (→ Molde)`, `quantidade_pecas`, `prazo_entrega`, `cliente_ou_numero_pedido`, `prioridade` (normal | alta | urgente), `maquina_alocada`
- Campos calculados: `horas_necessarias`, `consumo_materiais_projetado[]`
- RN-06: `horas_necessarias` = (quantidade_pecas / numero_cavidades) × tempo_ciclo_s, convertido para horas, mais tempo de setup se houver troca de molde na sequência.
- RN-07: `consumo_materiais_projetado` = consumo líquido (peso_por_peca × quantidade) + refugo esperado.
- RN-08: pedido não pode ser alocado em máquina fora de `maquinas_compativeis` do molde.

## Apontamento (vinculado a Máquina + Turno + OrdemDeProducao)
- `pecas_produzidas`, `pecas_refugadas`, `tempo_parado_min`, `motivo_parada`
- RN-09: `pecas_boas` = `pecas_produzidas` − `pecas_refugadas` (não pode ser negativo).

## Indicador OEE (calculado, não cadastrado)
- `disponibilidade` = (tempo_planejado − tempo_parado) / tempo_planejado
- `performance` = (pecas_produzidas × tempo_ciclo_padrao) / tempo_real_rodando
- `qualidade` = pecas_boas / pecas_produzidas
- `oee` = disponibilidade × performance × qualidade
- RN-10: OEE é sempre derivado de apontamentos existentes; não é editável manualmente.

---

# Features (Spec Lightweight — T2 cada, dentro do T4 geral)

## F-001: Cadastro de Máquinas
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
PCP precisa saber a capacidade técnica de cada injetora para casar com moldes e calcular carga.

### Requisitos
- RF-01: usuário cadastra/edita máquina com os campos da entidade `Maquina`.
- RF-02: sistema impede exclusão de máquina com carga futura alocada (só permite marcar como inativa).

### Fora de escopo
- Histórico de manutenção detalhado (fica em Turno/paradas programadas, não em cadastro de ativo).

### Casos de borda
- Máquina duplicada (código já existe): bloquear e avisar.
- Máquina marcada inativa com carga futura: alertar antes de confirmar.

### Critérios de aceitação
- [ ] Dado um código novo, quando salvo, então a máquina aparece disponível para vínculo de moldes.
- [ ] Dado uma máquina inativa, quando tento alocar carga nela, então o sistema bloqueia com mensagem clara.

---

## F-002: Cadastro de Moldes e Tempo de Ciclo
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
O tempo de ciclo é a base de todo cálculo de carga; precisa estar corretamente vinculado às máquinas compatíveis.

### Requisitos
- RF-01: cadastro de molde com tempo de ciclo, cavidades, setup e máquinas compatíveis (RN-02).
- RF-02: sistema calcula e exibe "peças/hora" automaticamente a partir do tempo de ciclo e cavidades.

### Casos de borda
- Tempo de ciclo = 0 ou negativo: bloquear.
- Nenhuma máquina compatível selecionada: alertar (molde fica "órfão", sem onde rodar).

### Critérios de aceitação
- [ ] Dado tempo de ciclo e cavidades válidos, quando salvo, então "peças/hora" é calculado corretamente.
- [ ] Dado um molde sem máquina compatível, quando tento usá-lo num pedido, então o sistema impede a alocação.

---

## F-003: Receita e Parâmetros de Processo
Status: DRAFT | Tier: T2 | Natureza: Backend + UI + Dados

### Problema
Sem saber quanto material cada peça consome (e o tempo de aquecimento até estabilizar o processo), não dá pra prever ruptura de estoque nem setup real.

### Requisitos
- RF-01: cadastro de composição (materiais + % + peso por peça), validando soma = 100% (RN-04).
- RF-02: cadastro de temperaturas por zona, temperatura do molde e tempo de aquecimento inicial.
- RF-03: ao gerar um pedido, sistema calcula consumo projetado por material (líquido + refugo) e sinaliza se algum material está com estoque insuficiente.

### Casos de borda
- Soma da composição ≠ 100%: bloquear salvamento.
- Material sem estoque cadastrado: tratar como "não verificado", nunca como zero silencioso.

### Critérios de aceitação
- [ ] Dado uma receita válida e um pedido de quantidade X, quando calculado, então o consumo projetado por material aparece com refugo incluso.
- [ ] Dado um material com estoque menor que o necessário, quando o pedido é gerado, então aparece alerta "insuficiente — comprar".

---

## F-004: Turnos, Calendário e Capacidade Disponível
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
A capacidade "nominal" da máquina não é a capacidade real — paradas programadas e eficiência reduzem o tempo disponível de fato.

### Requisitos
- RF-01: cadastro de turnos ativos, dias de operação e % de eficiência por máquina.
- RF-02: cadastro de paradas programadas (motivo, período).
- RF-03: sistema calcula capacidade disponível (RN-05) e usa esse valor — não a capacidade nominal — na comparação de carga.

### Critérios de aceitação
- [ ] Dado turnos e paradas cadastrados, quando calculada a capacidade, então o valor desconta corretamente as paradas e aplica a eficiência.

---

## F-005: Necessidade de Operadores por Turno
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
Capacidade técnica livre não significa capacidade real se não há gente pra operar — precisa ficar visível sem exigir cadastro nominal (fora de escopo por decisão do usuário).

### Requisitos
- RF-01: cadastro de quantidade de operadores necessários por máquina/turno.
- RF-02: painel de cobertura comparando necessário × disponível por turno, com alerta quando disponível < necessário.

### Fora de escopo
- Cadastro nominal de operador, escala individual, férias/faltas (backlog v2).

### Critérios de aceitação
- [ ] Dado necessário = 6 e disponível = 5 num turno, quando exibido o painel, então aparece alerta "falta 1 operador".

---

## F-006: Demanda (Pedidos) e Cálculo de Carga
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
É preciso transformar "quantidade + prazo" em horas de máquina, e visualizar isso contra a capacidade disponível de cada injetora.

### Requisitos
- RF-01: cadastro de pedido com produto, quantidade, prazo, prioridade.
- RF-02: sistema calcula `horas_necessarias` (RN-06) e sugere a máquina compatível com menor carga atual.
- RF-03: tela de fila mostra status: alocado / aguardando alocação / excede capacidade.
- RF-04: visualização em Gantt semanal por máquina, com blocos de ordem, setup, e destaque visual (vermelho) quando a carga ultrapassa a capacidade do período.

### Casos de borda
- Pedido cujo prazo é impossível de cumprir mesmo com toda capacidade livre: sinalizar "inviável no prazo", não só "excede capacidade".
- Duas ordens do mesmo molde em sequência: setup entre elas pode ser reduzido/zerado (mesmo molde já montado) — regra configurável, registrada como premissa até validação com o usuário.

### Premissas
- Assumindo que trocar de pedido sem trocar de molde não gera novo setup completo — a confirmar com o usuário antes da implementação.

### Critérios de aceitação
- [ ] Dado um pedido novo, quando calculado, então `horas_necessarias` reflete corretamente tempo de ciclo, cavidades e setup.
- [ ] Dado que a soma de ordens alocadas ultrapassa a capacidade disponível da máquina no período, então o bloco correspondente aparece destacado como excedente no Gantt.

---

## F-007: Apontamento de Produção
Status: DRAFT | Tier: T2 | Natureza: Backend + UI

### Problema
Sem registro do que foi realmente produzido, carga planejada e OEE não têm como ser calculados de forma confiável.

### Requisitos
- RF-01: tela de apontamento por máquina/turno/ordem: peças produzidas, refugadas, tempo parado, motivo da parada (lista fechada — **confirmada:** setup, falta de material, manutenção corretiva, ajuste de processo, falta de operador, outro).
- RF-02: apontamento não pode ser editado após confirmado sem trilha de auditoria (quem alterou, quando, valor anterior).

### Casos de borda
- Peças refugadas > peças produzidas: bloquear (RN-09).
- Apontamento de turno que ainda não começou: bloquear.

### Critérios de aceitação
- [ ] Dado um apontamento válido, quando salvo, então os dados alimentam o cálculo de OEE da máquina/turno correspondente.
- [ ] Dado peças refugadas maior que produzidas, quando tento salvar, então o sistema bloqueia com mensagem clara.

---

## F-008: Painel de OEE (velocímetro)
Status: DRAFT | Tier: T2 | Natureza: UI + Dados

### Problema
Gestores precisam de leitura rápida e visual do desempenho real de cada máquina, comparável entre elas.

### Requisitos
- RF-01: cálculo automático de Disponibilidade, Performance, Qualidade e OEE (fórmulas na Seção 002) a partir dos apontamentos do turno/período selecionado.
- RF-02: exibição em formato velocímetro (semicírculo, zonas vermelho <60% / amarelo 60–80% / verde ≥80%, ponteiro no valor atual), para OEE, Disponibilidade, Performance e Qualidade.
- RF-03: painel de frota com mini-velocímetro de OEE por máquina, para comparação rápida.
- RF-04: KPIs de apoio no mesmo painel: total produzido vs. planejado, peças boas, rejeitadas, tempo parado no turno.

### Casos de borda
- Turno sem nenhum apontamento: exibir "sem dados" em vez de OEE = 0% (zero enganaria como "máquina péssima" quando na verdade é "sem registro").

### Critérios de aceitação
- [ ] Dado apontamentos de um turno, quando exibido o painel, então OEE = Disponibilidade × Performance × Qualidade, batendo com o cálculo manual de conferência.
- [ ] Dado um turno sem apontamento, quando exibido o painel, então aparece estado "sem dados", não um valor zerado.

---

# Questões em Aberto (bloqueiam aprovação para virar plano)

- [ ] Confirmar regra de setup quando duas ordens seguidas usam o mesmo molde (F-006, premissa registrada). **Ainda em aberto** — usuário não conseguiu responder nesta rodada; segue como premissa até validação futura.
- [x] Origem do estoque de matéria-prima — **resolvido:** mantido manualmente dentro do sistema no MVP (sem integração externa).
- [x] Lista fechada de motivos de parada (F-007) — **resolvido:** confirmada como está (6 opções).
- [x] Perfis de acesso — **resolvido para o MVP:** não entram nesta versão. Registrado como backlog (Seção 000) com hierarquia prevista para versão futura: visão Gerente > visão Coordenador > visão Operador.

---

*Este documento cobre a Visão, o Modelo de Dados e as Specs Lightweight de cada módulo do MVP. Antes de iniciar implementação, cada feature T2 aqui precisa de aprovação explícita; features que crescerem além de 3 arquivos/telas ou tocarem schema de forma não prevista devem ser reclassificadas para T3 com Spec Completa própria (Seção 4.3 do manual).*
