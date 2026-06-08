# CoreSystemsTGR Crawler Hub

Plataforma para **clientes** configurarem crawlers via interface web (Vite + React + TS), com **tokens SDK** para o **Cursor** alterar seletores e regras via API.

## Funcionalidades

- **Painel web** — configurar URLs, seletores, campos e regras de parada (regex)
- **Modos de crawl** — página única ou seguir links com limite de páginas/profundidade
- **Resultados** — visualizar dados extraídos por execução
- **Falhas** — histórico + webhook N8N para automanutenção
- **Tokens SDK** — gerar `cst_...` para o Cursor usar na API Agent

## Rodar local

```bash
pnpm install
cp .env.example .env
pnpm dev          # API :4000 + Dashboard :5173
pnpm crawl        # executa targets ativos
```

**Login do painel:** use a `ADMIN_KEY` do `.env` (padrão: `dev-chave-admin-1234`)

## Fluxo do cliente

1. Acessa `http://localhost:5173` (ou `monitor.coresystemstgr.com`)
2. Em **Targets** → cadastra URL, seletores, padrões de parada
3. Roda `pnpm crawl` (ou agenda no N8N/cron)
4. Em **Resultados** → vê os dados extraídos
5. Em **SDK / Tokens** → gera token para o Cursor

## API Agent (Cursor / SDK)

```http
Authorization: Bearer cst_<token>
```

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/agent/targets` | Lista targets |
| PUT | `/api/agent/targets/:id` | Atualiza seletores/regras |
| POST | `/api/agent/crawl/:id` | Enfileira teste de crawl |
| GET | `/api/agent/failures` | Últimas falhas |

### Prompt para o Cursor

```
Você tem acesso à API CoreSystemsTGR Crawler.
Base: https://api.coresystemstgr.com
Token: cst_...

Quando um seletor quebrar:
1. GET /api/agent/failures
2. PUT /api/agent/targets/:id com novos seletores/fallbacks
3. POST /api/agent/crawl/:id
```

## Regras de URL

| Campo | Exemplo | Efeito |
|-------|---------|--------|
| `allowed_url_patterns` | `https://loja\.com/produto/.*` | Só segue links que batem |
| `stop_url_patterns` | `/login\|/checkout` | Para ao encontrar essas URLs |
| `max_pages` | `20` | Limite de páginas visitadas |
| `max_depth` | `3` | Profundidade de links |

## Deploy (coresystemstgr.com)

| Subdomínio | Serviço |
|------------|---------|
| `monitor.coresystemstgr.com` | Dashboard (`pnpm --filter @core/dashboard build`) |
| `api.coresystemstgr.com` | API (`pnpm start:api`) |

## N8N

Importe `n8n/crawler-failure-workflow.json` e configure `N8N_FAILURE_WEBHOOK` no `.env`.
