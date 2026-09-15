# 🚀 DEPLOY.md — Elite das Pechinchas

Guia completo para colocar o projeto em produção.

---

## Arquitetura de Produção

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Vercel         │     │   Railway                            │
│   (Frontend)     │────▶│   ┌─────────┐  ┌─────────┐         │
│   Next.js 14     │     │   │ FastAPI  │  │ Celery  │         │
│   App Router     │     │   │  API     │  │ Worker  │         │
└─────────────────┘     │   └────┬────┘  └────┬────┘         │
                         │        │            │               │
                         │   ┌────▼────────────▼────┐         │
                         │   │   PostgreSQL          │         │
                         │   │   Redis               │         │
                         │   └──────────────────────┘         │
                         │                                     │
                         │   ┌─────────────┐                  │
                         │   │ Telegram    │                  │
                         │   │ Listener    │                  │
                         │   │ (main.py)   │                  │
                         │   └─────────────┘                  │
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
| `NEXT_PUBLIC_API_URL` | `https://SEU-APP.up.railway.app` | Production, Preview |
| `NEXT_PUBLIC_USE_MOCK` | `false` | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-APP.vercel.app` | Production |
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
| `TELEGRAM_BOT_TOKEN` | Token do [@BotFather](https://t.me/BotFather) |
| `TARGET_CHANNEL_ID` | `@SeuCanal` ou `-100XXXXXXXXXX` |
| `SOURCE_CHANNELS` | `@canal1,@canal2` |
| `TELEGRAM_API_ID` | De [my.telegram.org/apps](https://my.telegram.org/apps) |
| `TELEGRAM_API_HASH` | De [my.telegram.org/apps](https://my.telegram.org/apps) |
| `AMAZON_TAG` | Sua tag Amazon Associates |
| `MERCADOLIVRE_TAG` | Sua tag Mercado Livre |
| `MAGALU_TAG` | Sua tag Magazine Luiza |
| `SIMULATED_BOT_ENABLED` | `false` |
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

## 4. Telegram Listener — Railway (Terceiro Serviço)

### 4.1 Setup
1. No mesmo projeto Railway → **+ New** → **GitHub Repo** → mesmo repositório.
2. Settings → Start Command: `python main.py`
3. Copie as mesmas variáveis de ambiente do backend + credenciais Telegram.

### 4.2 Primeira Execução (Autenticação Telethon)
Na primeira vez, o Telethon pedirá o código de verificação do Telegram.
- Use `railway logs` para ver o prompt.
- Use `railway shell` para interagir e inserir o código.

### 4.3 Validação
- Logs mostram: `✅ Userbot conectado com sucesso como: ...`
- Logs mostram: `🎯 Monitoramento ativo em tempo real em: ...`

---

## 5. Telegram Bot — Setup no BotFather

### 5.1 Criar Bot
1. Abra [@BotFather](https://t.me/BotFather) no Telegram.
2. Envie `/newbot`.
3. Nome: `Elite das Pechinchas`.
4. Username: `EliteDasPechinchasBot` (ou outro disponível).
5. Copie o token gerado → `TELEGRAM_BOT_TOKEN`.

### 5.2 Configurar Bot
```
/setdescription - Encontre as melhores ofertas e promoções do Brasil!
/setabouttext - Bot oficial do Elite das Pechinchas
/setcommands - 
start - Iniciar o bot
help - Ajuda
offers - Ver ofertas recentes
```

### 5.3 Criar Canal
1. Crie um canal no Telegram (público ou privado).
2. Adicione o bot como **administrador** com permissão de postar.
3. Copie o ID do canal (use [@userinfobot](https://t.me/userinfobot) ou encaminhe mensagem).

### 5.4 Obter API ID/HASH
1. Acesse [my.telegram.org/apps](https://my.telegram.org/apps).
2. Faça login com seu número de telefone.
3. Crie um aplicativo → copie `api_id` e `api_hash`.

---

## 6. Validação End-to-End

### Checklist de Produção

#### Frontend
- [ ] Site acessível na URL da Vercel
- [ ] Home carrega ofertas reais (não mocks)
- [ ] Busca funciona
- [ ] Filtros por categoria e loja funcionam
- [ ] Links de afiliado clicáveis e com tag correta
- [ ] Páginas de cupons carregam

#### Backend
- [ ] `GET /health` → 200 OK
- [ ] `GET /offers` → retorna dados do banco
- [ ] `GET /coupons` → retorna cupons reais
- [ ] `GET /stores` → retorna lojas
- [ ] `GET /categories` → retorna categorias
- [ ] Swagger `/docs` funcional

#### Bot Telegram
- [ ] Bot online e respondendo `/start`
- [ ] Listener conectado aos grupos fonte
- [ ] Mensagem de teste processada com sucesso
- [ ] Oferta publicada no canal com formatação correta

#### Fluxo Completo
- [ ] Mensagem no grupo → Bot processa → Banco → API → Frontend
- [ ] Clique em "Comprar Agora" redireciona com link de afiliado

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

### Bot não conecta
- Verifique `TELEGRAM_API_ID` e `TELEGRAM_API_HASH`.
- Na primeira execução, precisa autenticar interativamente.

### Migrações falham
- Execute manualmente: `railway run alembic upgrade head`
- Verifique se o banco está acessível.
