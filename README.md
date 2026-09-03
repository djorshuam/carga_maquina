# Carga Máquina — Injetoras de Plástico

MVP de planejamento de carga, apontamento e OEE para injetoras, conforme [docs/SDD-carga-maquina-injetoras.md](docs/SDD-carga-maquina-injetoras.md).

Stack: Next.js (App Router, Server Actions) · Prisma · PostgreSQL · Tailwind. Design: [DESIGN.md](DESIGN.md).

## Módulos
| Rota | Feature |
|---|---|
| `/` | Gantt semanal de carga por máquina, KPIs de ocupação e prazo em risco (F-006) |
| `/pedidos` | Demanda, horas necessárias, sugestão de máquina, consumo projetado de material (F-006, F-003) |
| `/operadores` | Necessidade × disponibilidade de operadores por turno (F-005) |
| `/apontamentos` | Apontamento por turno com auditoria de edição (F-007) |
| `/oee` | Velocímetros de OEE por máquina e frota (F-008) |
| `/maquinas` `/moldes` `/receitas` `/materiais` `/turnos` | Cadastros (F-001..F-004) |

## Rodar local
```bash
cp .env.example .env   # aponte DATABASE_URL/DIRECT_URL para um Postgres
npm install
npm run db:migrate     # cria as tabelas
npm run db:seed        # dados de exemplo (opcional)
npm run dev
```

## Deploy

### Vercel (+ Supabase/Neon)
1. Importe o repositório na Vercel.
2. Env vars: `DATABASE_URL` (pooler, porta 6543 no Supabase, com `?pgbouncer=true`) e `DIRECT_URL` (porta 5432).
3. Migrations: rode `npm run db:migrate` apontando para o banco (o build na Vercel não toca o banco).

### Self-hosted (Docker)
```bash
docker compose up -d --build
```
Sobe Postgres + app em `http://localhost:3000`, aplicando migrations na inicialização.
