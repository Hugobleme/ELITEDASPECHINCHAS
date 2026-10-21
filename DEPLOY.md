# 🚀 DEPLOY.md — Elite das Pechinchas

Guia completo para colocar o projeto em produção.

---

## Arquitetura de Produ```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Vercel        │     │   Railway                            │
│   (Frontend)    │────▶│   ┌─────────┐  ┌─────────┐           │
│   Next.js 14    │     │   │ FastAPI │  │ Celery  │           │
│   App Router    │     │   │  API    │  │ Worker  │           │
└─────────────────┘     │   └────┬────┘  └────┬────┘           │
                        │        │            │                 │
                        │   ┌────▼────────────▼────┐           │
                        │   │   PostgreSQL         │           │
                        │   │   Redis              │           │
                        │   └──────────────────────┘           │
                        └──────────────────────────────────────┘
```

---

## 1. Frontend — Vercel

### 1.1 Setup
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub.
2. Clique em **"New Project"** → Importe `Hugobleme/ELITEDASPECHINCHAS`.
3. Framework: **Next.js** (detecção automática).
4. Root Directory: `.` (padrão).

### 1.2 Variáveis de Ambiente
Configure no painel da Vercel → Settings → Environment Variables:

| Variável | Valor | Escopo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://elitedaspechinchas-production.up.railway.app` | Production, Preview |
| `NEXT_PUBLIC_USE_MOCK` | `false` | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | `https://elitedaspechinchas.vercel.app` | Production |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` (opcional) | Production |

### 1.3 Deploy
- Automático em cada push para `main`.
- Previews automáticos em PRs.

### 1.4 Domínio Customizado (Opcional)
1. Vercel → Settings → Domains → Add Domain.
2. Adicione `elitedaspechinchas.com.br` (ou seu domínio).
3. Configure DNS conforme instruções da Vercel (CNAME ou A records).

---

## 2. Backend — Railway

### 2.1 Setup
1. Acesse [railway.app](https://railway.app) e faça login com GitHub.
2. **New Project** → **Deploy from GitHub Repo** → selecione `ELITEDASPECHINCHAS`.
3. Railway detecta automaticamente o `Procfile` e `requirements.txt`.

### 2.2 Adicionar PostgreSQL
1. No projeto Railway → **+ New** → **Database** → **Add PostgreSQL**.
2. A variável `DATABASE_URL` é injetada automaticamente.

### 2.3 Adicionar Redis
1. No projeto Railway → **+ New** → **Database** → **Add Redis**.
2. A variável `REDIS_URL` é injetada automaticamente.

### 2.4 Variáveis de Ambiente do Backend
No serviço do backend (Settings → Variables):

| Variável | Valor |
|---|---|
| `ENVIRONMENT` | `production` |
| `JWT_SECRET` | Gere com: `openssl rand -hex 32` |
| `SECRET_KEY` | Gere com: `openssl rand -hex 32` |
| `CORS_ORIGINS` | `https://SEU-APP.vercel.app,https://elitedaspechinchas.com.br` |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID para Web Push |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID para Web Push |
| `VAPID_CLAIMS_EMAIL` | Email de contato do remetente Push (ex: `admin@elitedaspechinchas.com.br`) |
| `AMAZON_TAG` | Sua tag Amazon Associates (ex: `elitedaspechi-20`) |
| `MERCADOLIVRE_TAG` | Sua tag Mercado Livre |
| `MAGALU_TAG` | Sua tag Magazine Luiza |
| `USE_MOCK_DATA` | `false` |

### 2.5 Start Command
O `railway.toml` já configura:
```
alembic upgrade head && python seed.py && uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

### 2.6 Validação
```bash
# Health check
curl https://SEU-APP.up.railway.app/health

# Ofertas
curl https://SEU-APP.up.railway.app/offers

# Swagger
# Acesse: https://SEU-APP.up.railway.app/docs
```

---

## 3. Celery Worker — Railway (Segundo Serviço)

### 3.1 Setup
1. No mesmo projeto Railway → **+ New** → **GitHub Repo** → mesmo repositório.
2. Settings → Start Command: `celery -A processor.celery_app worker --loglevel=info --pool=prefork --concurrency=2`
3. Copie as mesmas variáveis de ambiente do backend.

### 3.2 Validação
- Verifique nos logs que o worker conectou ao Redis e está pronto para receber tasks.

---

## 4. Manual Operacional de Desativação e Revogação do Telegram

Conforme a decisão arquitetural do projeto, **todas as integrações com Telegram (bots, userbots e canais) foram completamente descontinuadas**. Siga o checklist operacional abaixo para revogar credenciais externas e desligar serviços órfãos:

### 4.1 Revogação do Bot Token (@BotFather)
1. No Telegram, abra uma conversa com o [@BotFather](https://t.me/BotFather).
2. Envie o comando `/revoke`.
3. Selecione o bot que era utilizado (`EliteDasPechinchasBot` ou similar) para revogar e invalidar o token de forma imediata e irreversível.
4. *(Opcional)* Caso deseje remover o bot definitivamente, envie `/deletebot` e confirme.

### 4.2 Encerramento das Sessões Ativas do Userbot (Telethon)
Para invalidar chaves criptográficas de sessão (arquivos `.session` ou sessões em memória):
1. No aplicativo Telegram (no celular ou computador associado ao número usado pelo Userbot):
2. Acesse: **Configurações (Settings) → Dispositivos (Devices)**.
3. Na lista de sessões ativas, localize a sessão associada ao Telethon (geralmente identificada pelo nome da aplicação, IP do servidor Railway/VPS ou "Telethon").
4. Toque/clique na sessão e selecione **"Encerrar sessão" (Terminate session)**.
5. Uma vez encerrada, qualquer tentativa de reconexão usando arquivos residuais será sumariamente rejeitada pelo Telegram.

### 4.3 Limpeza de Serviços e Variáveis no Railway / VPS
1. **Excluir o Serviço `listener`**:
   - No painel da Railway, se houver um serviço separado rodando `main.py` / `listener`, acesse suas configurações (**Settings**) e clique em **Delete Service**.
2. **Remover Variáveis de Ambiente**:
   - No serviço da API e do Celery Worker, delete do painel de variáveis:
     - `TELEGRAM_BOT_TOKEN`
     - `TELEGRAM_API_ID`
     - `TELEGRAM_API_HASH`
     - `TARGET_CHANNEL_ID`
     - `SOURCE_CHANNELS`
     - `TELEGRAM_SESSION_NAME`
     - `TELEGRAM_STRING_SESSION`
     - `SIMULATED_BOT_ENABLED`
3. **Limpeza Local**:
   - Certifique-se de que nenhum arquivo `.session` ou `.session-journal` permaneça no diretório raiz ou de produção.

---

## 5. Validação End-to-End

### Checklist de Produção

#### Frontend
- [ ] Site acessível na URL da Vercel (`https://elitedaspechinchas.vercel.app`)
- [ ] Vitrine inicial carrega ofertas ativas com paginação e busca
- [ ] Filtro por categorias e lojas funciona com dados reais
- [ ] Botão de compra redireciona com tag de afiliado correta (Amazon, Mercado Livre, Shopee, Magalu)
- [ ] Páginas de cupons carregam e permitem copiar código
- [ ] Painel Administrativo (`/admin/ofertas`): botão "Nova Oferta" abre modal de cadastro
- [ ] Cadastro de nova oferta calcula desconto dinâmico e valida campos obrigatórios
- [ ] Cadastro e login de usuários funcionam (JWT e Google OAuth)
- [ ] Usuários podem favoritar ofertas e gerenciar alertas de preço
- [ ] Inscrição em Web Push funciona no navegador

#### Backend
- [ ] `GET /health` → 200 OK (`{"status":"healthy","database":"connected","redis":"connected"}`)
- [ ] `GET /offers` → retorna listagem paginada de ofertas do PostgreSQL
- [ ] `POST /offers` → cadastra nova oferta, higieniza links e aplica regras
- [ ] `GET /coupons` → retorna cupons cadastrados
- [ ] `GET /stores` e `GET /categories` → retornam metadados atualizados
- [ ] Documentação Swagger `/docs` acessível e funcional
- [ ] Celery Worker processa tarefas em background (`match_and_notify`, limpeza e deduplicação)

#### Fluxo Completo
- [ ] Cadastro de oferta via Painel Admin ou API → Aplicação de tags de afiliados → Persistência no PostgreSQL
- [ ] Ao publicar oferta: Celery executa `match_and_notify` e dispara notificação Web Push aos usuários com alertas compatíveis
- [ ] Clique em "Comprar Agora" na vitrine redireciona com parâmetros oficiais de monetização

### 6.1 Validação Automatizada End-to-End (E2E) em Produção

Para validar de forma automatizada que a API e o fluxo do bot estão 100% operacionais em produção, utilize o script `tests/test_production_e2e.py`.

#### Casos de Teste Inclusos:
- **`test_healthcheck`**: Valida que `/health` retorna status 200 com banco de dados conectado, status `healthy` e `uptime_seconds`.
- **`test_offers_endpoint`**: Valida que `/offers` responde 200 e fornece uma lista de ofertas públicas.
- **`test_auto_publish_flow`**: Confirma que a oferta mais recente possui status `published` e `affiliate_link` monetizado.
- **`test_deduplication`**: Garante que o motor de regras não publicou itens duplicados (mesmo título e preço).

#### Como Rodar:

```bash
# Execução rápida padrão contra a Railway de produção:
pytest tests/test_production_e2e.py -v

# Especificando uma URL customizada:
RAILWAY_API_URL="https://elitedaspechinchas-production.up.railway.app" pytest tests/test_production_e2e.py -v

# Com espera de processamento (ex: 120s após postagem manual no canal-fonte):
E2E_WAIT_SECONDS=120 pytest tests/test_production_e2e.py -v

# Validação com checagem estrita de Redis e Bot no healthcheck:
STRICT_HEALTHCHECK=true pytest tests/test_production_e2e.py -v
```

#### Execução no CI/CD (GitHub Actions):
O pipeline `.github/workflows/ci.yml` inclui o step automatizado **Fase 7 — Validação End-to-End (E2E) em Produção**, executando a suíte contra a API pública a cada build.

### 6.2 Teste de Carga e Validação de Latência (p95 < 100ms)

Para validar a capacidade de atendimento concorrente e garantir que a API mantém latência ultrabaixa sob carga contínua, utilize o script `tests/test_load.py`.

#### O que é validado:
- Disparo simultâneo contra `/offers`, `/health` e `/coupons` com 50 workers concorrentes por 30 segundos.
- Medição e cálculo de percentis de latência (**p50**, **p95**, **p99**) e taxa de erro.
- Asserção estrita: falha se **p95 > 100ms** ou **taxa de erros > 1%**.
- Exibição de comparativo entre tempo de processamento interno da API (`X-Response-Time`) e RTT de rede WAN.

#### Como Executar:

```bash
# Execução padrão (30 segundos, 50 workers concorrentes):
pytest tests/test_load.py -v -s

# Execução rápida (ex: 5 segundos para validação ágil):
LOAD_TEST_DURATION=5 pytest tests/test_load.py -v -s

# Apontando para outra URL ou instância local:
RAILWAY_API_URL="http://localhost:8000" pytest tests/test_load.py -v -s

# Ajustando concorrência (ex: 100 requisições simultâneas):
LOAD_TEST_CONCURRENCY=100 pytest tests/test_load.py -v -s

# Validação com limiar de latência personalizado (ex: p95 < 50ms):
LOAD_TEST_MAX_P95_MS=50 pytest tests/test_load.py -v -s
```

### 6.3 Teste de Resiliência (Queda e Falha do Redis)

Para garantir que a API continua 100% disponível servindo `/offers`, `/health` e `/coupons` mesmo se o Redis falhar, utilize o script `tests/test_resilience.py`.

#### O que é validado:
- **Sobrevivência da API**: Verifica que todas as rotas continuam respondendo com status 200 via fallback em memória (`_IN_MEMORY_CACHE`).
- **Healthcheck Transparente**: Valida que `/health` indica `redis: in_memory_fallback` mantendo `status: healthy` com zero downtime.
- **Simulação Local & Logs**: Valida que o `CacheService` captura o erro de conexão do Redis, emite aviso nos logs (`logger.warning`) e redireciona operações de leitura/escrita para a memória.

#### Como Executar:

```bash
# Execução padrão contra a API em produção:
pytest tests/test_resilience.py -v

# Apontando para outra URL ou instância local:
RAILWAY_API_URL="https://sua-api.up.railway.app" pytest tests/test_resilience.py -v
```

### 6.4 Validação de Links de Afiliado (Tags Corretas)

Para validar que todas as ofertas públicas da vitrine possuem os parâmetros e identificadores oficiais de monetização de cada loja parceira, utilize `tests/test_affiliate_links.py`.

#### O que é validado:
- **Amazon**: Presença obrigatória do parâmetro `tag=elitedaspechi-20`.
- **Mercado Livre**: Presença obrigatória de `matt_word=elitedaspechinchas` e `matt_tool=17470999`.
- **Shopee**: Presença obrigatória de `af_id=18337121236`, `affiliate_id=18337121236` ou `af_siteid=18337121236`.

#### Como Executar:

```bash
# Execução padrão contra a API de produção:
pytest tests/test_affiliate_links.py -v

# Apontando para outra URL:
RAILWAY_API_URL="https://sua-api.up.railway.app" pytest tests/test_affiliate_links.py -v
```

---

## 7. Monitoramento

### Logs
- **Vercel**: Dashboard → Deployments → Logs
- **Railway**: Dashboard → Service → Logs
- **Sentry** (opcional): Configure `SENTRY_DSN` para error tracking automático

### Health Checks
- Backend: `GET /health` → 200 OK
- Backend: `GET /metrics` → estatísticas de cache e banco

### Alertas
- Railway envia alertas automáticos por email se um serviço falhar.
- Configure webhook no Discord/Slack para notificações (Railway → Settings → Webhooks).

---

## 8. Custos Estimados

| Serviço | Plano | Custo |
|---|---|---|
| Vercel | Hobby (Free) | $0/mês |
| Railway | Starter ($5 crédito) | ~$5-15/mês |
| Railway PostgreSQL | Incluído no starter | Incluído |
| Railway Redis | Incluído no starter | Incluído |
| Domínio (.com.br) | Registro.br | ~R$40/ano |

---

## Troubleshooting

### "CORS error" no frontend
- Verifique que `CORS_ORIGINS` no backend inclui a URL exata do frontend.
- Em produção, o regex do Vercel é habilitado automaticamente.

### "Connection refused" no banco
- Verifique que `DATABASE_URL` está correto.
- Se usar Railway Postgres, a variável é injetada automaticamente.

### Migrações falham
- Execute manualmente: `railway run alembic upgrade head`
- Verifique se o banco está acessível.

---

## 8. Observabilidade de Imagens da Vitrine Web

Para assegurar uma vitrine visualmente rica e estável, o catálogo de ofertas gerencia URLs de imagens de produtos com validação e fallback:

### 8.1 Políticas de Mídia e Otimização Web
1. **Domínios Autorizados (`next.config.js`)**: O Next.js Image Optimization está configurado para permitir domínios de lojistas homologados (`m.media-amazon.com`, `http2.mlstatic.com`, `images.kabum.com.br`, `magazineluiza.com.br`, `cf.shopee.com.br`, etc.).
2. **Proteção SSRF**: O sistema valida URLs externas antes de qualquer consumo interno, bloqueando IPs privados (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`) e metadados de cloud (`169.254.169.254`).
3. **MIME Types Suportados**: Formatos padrão para e-commerce (`image/jpeg`, `image/png`, `image/webp`).
4. **Fallback Visual sem Erros**: Se uma oferta for cadastrada sem imagem ou a URL do parceiro estiver fora do ar, o frontend Next.js exibe automaticamente um placeholder temático elegante baseado na categoria e loja, sem quebrar o layout da vitrine.
5. **Persistência Eficiente**: O banco de dados armazena apenas a URL pública sanitizada (`image_url`), mantendo o banco leve e sem blob overhead.

