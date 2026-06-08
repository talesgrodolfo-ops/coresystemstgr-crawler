# Deploy na Cloudflare (sem erro)

Arquitetura na Cloudflare:

| Componente | Serviço Cloudflare | Observação |
|------------|-------------------|------------|
| **Dashboard** (Vite) | **Pages** | Interface do cliente |
| **API** (Hono) | **Workers + D1** | Banco SQLite na edge |
| **Crawler** | **N8N** (externo) | Agenda `pnpm crawl` ou webhook |

> A API **não pode** usar arquivo local na Cloudflare — por isso usamos **D1**.

---

## Pré-requisitos

```bash
npm install -g wrangler
wrangler login
```

Na raiz do projeto:

```bash
pnpm install
```

---

## Parte 1 — API (Worker + D1)

### 1. Criar banco D1

```bash
cd apps/api
wrangler d1 create crawler-hub
```

Copie o `database_id` exibido e cole em `apps/api/wrangler.toml`:

```toml
database_id = "SEU_ID_AQUI"
```

### 2. Rodar migration

```bash
pnpm db:migrate:remote
```

### 3. Configurar secrets

```bash
wrangler secret put ADMIN_KEY
# Cole uma chave forte (ex: openssl rand -hex 32)

wrangler secret put N8N_FAILURE_WEBHOOK
# Cole a URL do webhook N8N (ou Enter vazio para pular)
```

### 4. Ajustar CORS

Em `wrangler.toml`, atualize `CORS_ORIGIN` com o domínio real do dashboard:

```toml
CORS_ORIGIN = "https://monitor.coresystemstgr.com"
```

### 5. Deploy da API

```bash
pnpm deploy
```

Anote a URL gerada, ex: `https://coresystemstgr-api.SEU_SUBDOMINIO.workers.dev`

### 6. Testar

```bash
curl https://coresystemstgr-api.SEU_SUBDOMINIO.workers.dev/api/health
```

Deve retornar `"runtime": "cloudflare"`.

---

## Parte 2 — Dashboard (Pages)

### Opção A — Painel Cloudflare (recomendado)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Conecte o repositório `coresystemstgr-crawler`
3. Configuração de build:

| Campo | Valor |
|-------|-------|
| **Framework preset** | None |
| **Build command** | `pnpm install && pnpm --filter @core/dashboard build` |
| **Build output directory** | `apps/dashboard/dist` |
| **Root directory** | `/` (raiz do repo) |

4. **Environment variables** (Production):

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://coresystemstgr-api.SEU_SUBDOMINIO.workers.dev` |
| `NODE_VERSION` | `20` |

5. Deploy → acesse a URL `.pages.dev`

### Opção B — CLI

```bash
cd apps/dashboard
pnpm build
npx wrangler pages deploy dist --project-name=coresystemstgr-monitor
```

Defina `VITE_API_URL` antes do build:

```bash
# PowerShell
$env:VITE_API_URL="https://coresystemstgr-api.SEU_SUBDOMINIO.workers.dev"
pnpm build
```

### Domínio customizado

Pages → **Custom domains** → `monitor.coresystemstgr.com`  
Workers → **Triggers** → **Custom domains** → `api.coresystemstgr.com`

---

## Parte 3 — Crawler (N8N)

O crawler **não roda dentro do Worker** (precisa de Cheerio/Node). Use o N8N:

1. **Schedule Trigger** — ex: a cada 1 hora
2. **Execute Command** (se N8N estiver no seu PC/servidor):

```bash
cd /caminho/coresystemstgr-crawler && pnpm crawl
```

Ou **HTTP Request** se tiver um servidor Node rodando o crawler.

Variáveis no `.env` do servidor do crawler:

```env
API_URL=https://api.coresystemstgr.com
API_KEY=<mesma ADMIN_KEY>
N8N_FAILURE_WEBHOOK=<webhook n8n>
```

---

## Erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `Admin key required` | Chave errada no login | Use a mesma `ADMIN_KEY` do `wrangler secret` |
| CORS blocked | Domínio não listado | Adicione URL do Pages em `CORS_ORIGIN` no wrangler.toml e redeploy |
| `D1 binding missing` | Deploy sem D1 | Verifique `wrangler.toml` e `database_id` |
| Dashboard vazio / API error | `VITE_API_URL` errado | Rebuild Pages com URL correta da API |
| `database_id` inválido | Não criou D1 | Rode `wrangler d1 create crawler-hub` |
| Crawler não salva dados | `API_KEY` diferente | Mesma chave em Worker secret e crawler `.env` |

---

## Checklist final

- [ ] D1 criado e migration aplicada
- [ ] `ADMIN_KEY` configurada como secret
- [ ] API deployada e `/api/health` OK
- [ ] Pages build com `VITE_API_URL` correto
- [ ] Login no painel com `ADMIN_KEY`
- [ ] Target criado na interface
- [ ] N8N/cron rodando `pnpm crawl` apontando para API na Cloudflare

---

## Dev local (continua funcionando)

```bash
pnpm dev          # API Node + Dashboard (arquivo JSON local)
pnpm crawl        # Crawler local
```

Para testar Worker localmente com D1:

```bash
cd apps/api
pnpm db:migrate:local
pnpm dev:worker
```
