export const AGENT_DOCS = {
  name: 'CoreSystemsTGR Crawler Agent API',
  version: '1.0',
  description:
    'Use este token no Cursor (SDK ou chat com MCP) para ler e alterar targets, seletores e regras de parada.',
  auth: {
    header: 'Authorization: Bearer <cst_token>',
    altHeader: 'x-api-key: <cst_token>',
  },
  endpoints: [
    { method: 'GET', path: '/api/agent/targets', desc: 'Lista todos os targets configurados' },
    { method: 'GET', path: '/api/agent/targets/:id', desc: 'Detalhe de um target' },
    {
      method: 'PUT',
      path: '/api/agent/targets/:id',
      desc: 'Atualiza target (seletores, URLs, padrões de parada)',
    },
    { method: 'POST', path: '/api/agent/targets', desc: 'Cria novo target' },
    { method: 'POST', path: '/api/agent/crawl/:id', desc: 'Dispara crawl de um target' },
    { method: 'GET', path: '/api/agent/runs?limit=20', desc: 'Últimas execuções' },
    { method: 'GET', path: '/api/agent/runs/:runId/items', desc: 'Dados extraídos de uma execução' },
    { method: 'GET', path: '/api/agent/failures?limit=20', desc: 'Últimas falhas com contexto' },
  ],
  cursorPromptExample: `Você tem acesso à API do crawler CoreSystemsTGR.
Token: <SEU_TOKEN>
Base URL: https://api.coresystemstgr.com

Quando um seletor falhar:
1. GET /api/agent/failures para ver o erro
2. Analise o HTML salvo
3. PUT /api/agent/targets/:id com novos seletores/fallbacks
4. POST /api/agent/crawl/:id para testar`,
}
