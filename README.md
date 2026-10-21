# ⚡ Elite das Pechinchas — Agregador de Promoções & Cupons

Um ecossistema completo para agregação, curadoria e recomendação de ofertas em tempo real inspirado no **Pechinchou** e **Promobit**.

- **Frontend (Fases 1 e 2)**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query + Recharts.
- **Backend (Fases 1, 2 e 3)**: FastAPI + PostgreSQL + SQLAlchemy + Alembic + Celery + Redis + Web Push (pywebpush) + JWT & Google OAuth.

---

## 🏛️ Arquitetura das 3 Fases

```mermaid
flowchart TD
    subgraph Ingestao["1. Curadoria e Gestão Web"]
        ADMIN[Painel Admin / Curador] -->|Cadastro / Importação| ADM_API[FastAPI POST /offers]
        ADM_API -->|Troca Automática de Afiliado| AF[Motor de Afiliados]
        AF --> DB[(PostgreSQL)]
    end

    subgraph Backend_API["2. FastAPI Backend (Fases 1, 2 e 3)"]
        PUB["/offers (Vitrine Pública)"]
        ADM["/admin (Curadoria & Publicação)"]
        AUTH["/auth (JWT + Google OAuth)"]
        USER_MODS["/me (Favoritos, Preferências, Alertas, Push)"]
        FEED["/feed (Recomendações Personalizadas)"]
    end

    subgraph Notificacoes["3. Celery + Redis Worker"]
        ADM -->|Ao publicar oferta| QUEUE[Fila Celery: match_and_notify]
        QUEUE -->|pywebpush| PUSH[Notificação Web Push no Navegador]
        CRON[Tarefas Agendadas] -->|Limpeza & Deduplicação| DB
    end

    subgraph Web_App["4. Web App Next.js 14"]
        VITRINE[Vitrine Pública & Cupons]
        PAINEL[Painel de Curadoria & Nova Oferta]
    end

    DB <--> Backend_API
    Backend_API <--> Web_App
```

---

## 🚀 Novas Funcionalidades da Fase 3 (Backend FastAPI)

1. **Autenticação Segura & Google OAuth**:
   - Cadastro e Login com e-mail/senha criptografados com `bcrypt`.
   - Login social Google via validação segura de `id_token` (`google-auth`).
   - Sessão com access token curto (30 min) + refresh token (30 dias).
   - Dependência `get_current_user` para proteção de rotas.
   - Proteção contra brute force via rate limiting por IP.

2. **Preferências do Usuário (`/me/preferences`)**:
   - Definição de categorias favoritas (ex: eletrônicos, games).
   - Definição de lojas favoritas (ex: Amazon, Kabum, Mercado Livre).
   - Desconto mínimo padrão personalizado.

3. **Favoritos (`/me/favorites`)**:
   - Salvar ofertas favoritas para consulta rápida.
   - Prevenção de duplicidade com chave única (`user_id + offer_id`) retornando `409 Conflict`.
   - Exclusão e listagem completa com dados do produto.

4. **Alertas de Preço Inteligentes (`/me/alerts`)**:
   - Criação de alertas flexíveis: por categoria, loja e/ou palavra-chave no título (ex: "RTX 4060", "Air Fryer", "iPhone 15").
   - Disparo condicional baseado no desconto alvo mínimo (`discount_pct >= target_discount`).

5. **Notificações Web Push em Tempo Real (Celery + Redis + pywebpush)**:
   - Registro de inscrições Push do navegador com chaves VAPID (`p256dh` e `auth`).
   - Celery Task assíncrona `match_and_notify`: ao publicar uma oferta, cruza instantaneamente com os alertas ativos.
   - Envio de notificação rica com imagem do produto, percentual de desconto e link direto.
   - Deduplicação: o mesmo usuário nunca recebe notificações repetidas para a mesma oferta.
   - Auto-limpeza de inscrições canceladas (`410 Gone`).

6. **Feed Personalizado (`/feed`)**:
   - Algoritmo de ranqueamento que prioriza ofertas das categorias e lojas preferidas do usuário com desconto acima do mínimo, completando com ofertas populares como fallback.

---

## 📂 Estrutura do Backend FastAPI

```
├── requirements.txt                  # Dependências Python
├── alembic.ini                       # Configurações de migração
├── api/
│   ├── main.py                       # Instância FastAPI, CORS, rate limiting e rotas
│   ├── deps.py                       # Injeção de dependências (get_db, get_current_user)
│   ├── security.py                   # Hash bcrypt, JWT e Google ID Token
│   ├── routes/
│   │   ├── auth.py                   # /auth/register, /auth/login, /auth/google, /auth/refresh, /me
│   │   ├── preferences.py            # GET /me/preferences, PATCH /me/preferences
│   │   ├── favorites.py              # GET, POST, DELETE /me/favorites
│   │   ├── alerts.py                 # GET, POST, DELETE /me/alerts
│   │   ├── push.py                   # POST, DELETE /me/push/subscribe
│   │   └── feed.py                   # GET /feed (ranqueamento personalizado)
│   └── schemas/
│       ├── user.py                   # Schemas Pydantic v2 de auth e usuário
│       ├── preference.py             # Schemas de preferências
│       ├── favorite.py               # Schemas de favoritos
│       ├── alert.py                  # Schemas de alertas
│       ├── push.py                   # Schemas de Web Push
│       └── feed.py                   # Schemas do feed
├── processor/
│   ├── celery_app.py                 # Instância Celery com broker Redis
│   └── notify.py                     # Task match_and_notify + pywebpush
├── database/
│   ├── connection.py                 # Engine SQLAlchemy e gerador get_db
│   ├── models.py                     # Modelos SQLAlchemy (Users, Preferences, Favorites, Alerts, Push, Offers)
│   └── migrations/
│       ├── env.py                    # Runner do Alembic
│       └── versions/
│           └── 20260912_phase3_user_layer.py # Migração criando tabelas da Fase 3
└── tests/
    ├── conftest.py                   # Fixtures de banco SQLite em memória
    ├── test_auth.py                  # Testes de registro, login e JWT
    ├── test_favorites.py             # Testes de favoritos e conflito 409
    └── test_alerts_matching.py       # Testes da lógica de matching de alertas
```

---

---

## 🏷️ Curadoria e Gestão de Ofertas no Site (Web Curation + Celery)

A plataforma opera com foco 100% web, provendo ferramentas completas para cadastro, moderação, deduplicação, injeção de links de afiliado e disparo de notificações Web Push.

### Fluxo de Ingestão e Curadoria Web:
1. **Cadastro Direto via Painel Administrativo (`/admin/ofertas` -> "Nova Oferta")**:
   - Curadores podem cadastrar ofertas e cupons diretamente pela interface web com cálculo em tempo real de desconto e preview.
   - Suporte a ingestão automatizada via API REST (`POST /offers`) com payload estruturado e validação Pydantic.
2. **Parser e Sanitização de Dados (`processor/parser.py`)**:
   - Extrai e higieniza títulos, detecta padrões de cupons (`CUPOM: ...`, `Use o código ...`), normaliza valores numéricos e categoriza automaticamente.
   - Identifica lojas de origem por domínio e regras heurísticas (Amazon, Mercado Livre, Magalu, Shopee, Kabum, etc.).
3. **Substituição Automática de Afiliado (`processor/affiliate.py`)**:
   - Converte URLs da Amazon extraindo o ASIN (`/dp/ASIN?tag=elitedaspechi-20`).
   - Higieniza e substitui parâmetros de terceiros no Mercado Livre injetando `matt_word` e `matt_tool`.
   - Redireciona links Magalu para a vitrine oficial do parceiro.
   - Injeta parâmetros oficiais para Kabum, Shopee e AliExpress.
   - Fallback tolerante: links não suportados são mantidos intactos para curadoria manual.
4. **Motor de Regras & Deduplicação (`processor/rules.py`)**:
   - **Desconto Mínimo**: Filtra ofertas abaixo do piso de desconto configurado.
   - **Deduplicação**: Previne cadastros idênticos por hash de conteúdo (`título + preço`) nas últimas 24 horas.
   - **Manutenção Agendada**: Tarefas Celery limpam ofertas expiradas (`task_cleanup_expired`) e deduplicam a base periodicamente (`task_deduplicate`).
5. **Notificações Web Push em Tempo Real (`processor/notify.py`)**:
   - Ao publicar uma oferta (com status `published`), a tarefa Celery `match_and_notify` cruza instantaneamente a oferta com os alertas cadastrados pelos usuários.
   - Dispara notificações nativas no navegador dos usuários inscritos via `pywebpush` (VAPID).

---

## 🐳 Subir com Docker (Stack Completa)

A aplicação conta com orquestração completa via **Docker Compose** que sobe todos os serviços interconectados em uma rede privada com um único comando.

### 🧩 Serviços Orquestrados no `docker-compose.yml`

| Serviço | Imagem / Build | Porta | Descrição |
|---|---|---|---|
| **`postgres`** | `postgres:16-alpine` | `5432` | Banco de dados relacional com volume persistente `postgres_data` e healthcheck. |
| **`redis`** | `redis:7-alpine` | `6379` | Broker de mensagens Celery e cache com persistência e healthcheck. |
| **`api`** | `Dockerfile.backend` | `8000` | FastAPI (Uvicorn), aplica migrações Alembic automaticamente no start e expõe OpenAPI Swagger. |
| **`worker`** | `Dockerfile.backend` | — | Celery Worker que consome tarefas de motor de regras, troca de afiliados e Web Push. |
| **`web`** | `Dockerfile.frontend` | `3000` | Frontend Next.js 14 App Router construído em imagem multi-stage Node 20. |

---

### 🚀 Passo a Passo para Subir a Stack

#### 1. Clonar o repositório e configurar variáveis:
```bash
cp .env.example .env
```
> Preencha suas tags de afiliados (`AMAZON_TAG`, `MERCADOLIVRE_TAG`, etc.) e chaves JWT/VAPID no `.env`.

#### 2. Subir todos os serviços com build:
```bash
docker compose up --build
```
Para rodar em segundo plano (modo detached):
```bash
docker compose up -d --build
```

#### 3. Popular o banco de dados com dados iniciais (Seed):
Em outro terminal (com os containers rodando):
```bash
docker compose exec api python seed.py
```

#### 4. Verificar o status dos serviços e healthchecks:
```bash
docker compose ps
```

Acessos locais:
- 🌐 **Web App:** http://localhost:3000
- 📚 **Documentação Swagger:** http://localhost:8000/docs
- 🩺 **Healthcheck da API:** http://localhost:8000/health

---

### ☁️ Estratégias de Deploy em Produção

1. **Deploy Híbrido (Vercel + VPS)**:
   - O frontend Next.js pode ser hospedado diretamente na **Vercel**, configurando a variável de ambiente `NEXT_PUBLIC_API_URL` apontando para o seu domínio da API (ex: `https://api.elitedaspechinchas.com.br`).
   - Em sua VPS (ex: Hetzner, DigitalOcean, AWS), execute apenas a infraestrutura e backend 24/7 omitindo o container web:
     ```bash
     docker compose up -d postgres redis api worker
     ```

2. **Deploy All-in-One (VPS Única)**:
   - Execute todos os containers via `docker compose up -d`.
   - Utilize um reverse proxy como **Nginx** ou **Caddy** com SSL automático (Let's Encrypt) roteando `elitedaspechinchas.com.br` para a porta 3000 e `api.elitedaspechinchas.com.br` para a porta 8000.

---

## ⚙️ Guia de Execução Local (Sem Docker)

### 1. Criar e Ativar Ambiente Virtual
```bash
python -m venv venv
# No Windows:
venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate
```

### 2. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 3. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha suas chaves:
```bash
cp .env.example .env
```
Variáveis principais:
- Chaves de segurança: `JWT_SECRET`, `SECRET_KEY`
- Notificações Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`
- Conexões: `DATABASE_URL`, `REDIS_URL`
- Tags de afiliados: `AMAZON_TAG`, `MERCADOLIVRE_TAG`, `MAGALU_TAG`, etc.

### 4. Executar Migrações e Inicializar Dados (Seed)
```bash
# Executa migrações do banco
alembic upgrade head

# Popula dados e regras iniciais de afiliados
python seed.py
```

### 5. Iniciar o Worker Celery (Processamento + Web Push)
Certifique-se de que o Redis está rodando:
```bash
celery -A processor.celery_app worker --loglevel=info
```

### 6. Iniciar a API FastAPI
Em outro terminal:
```bash
uvicorn api.main:app --reload --port 8000
```
Documentação Swagger interativa: **http://localhost:8000/docs**

### 7. Executar a Suíte de Testes
```bash
pytest tests/ -v
```
Foram implementados testes unitários e de integração cobrindo:
- `tests/test_site_only_validation.py`: validação estrita da arquitetura exclusiva do site (zero Telegram, zero vazamentos).
- `tests/test_parser.py`: extração de preços, lojas, categorias e cupons.
- `tests/test_affiliate.py`: substituição e sanitização de links por loja.
- `tests/test_rules.py`: motor de regras, pisos de desconto e deduplicação 24h.
- `tests/test_celery_tasks.py`: tarefas assíncronas do Celery (limpeza, deduplicação, alertas).
- `tests/test_auth.py`, `tests/test_favorites.py`, `tests/test_alerts_matching.py`: rotas de usuário e Web Push.


---

## 🌐 Resumo de Endpoints da API

| Método | Rota | Autenticado? | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Não | Cadastro com e-mail, senha e nome |
| `POST` | `/auth/login` | Não | Login com emissão de access e refresh token |
| `POST` | `/auth/google` | Não | Login social via Google `id_token` |
| `POST` | `/auth/refresh` | Não | Renovação de access token |
| `GET` | `/me` | Sim | Perfil do usuário atual |
| `GET` | `/me/preferences` | Sim | Consulta de preferências (categorias, lojas, desconto min) |
| `PATCH` | `/me/preferences` | Sim | Atualização das preferências |
| `GET` | `/me/favorites` | Sim | Listagem de produtos favoritados (com join) |
| `POST` | `/me/favorites` | Sim | Adiciona oferta aos favoritos |
| `DELETE`| `/me/favorites/{id}`| Sim | Remove oferta dos favoritos |
| `GET` | `/me/alerts` | Sim | Lista alertas de preço ativos/inativos |
| `POST` | `/me/alerts` | Sim | Cria alerta por categoria, loja, palavra-chave e % OFF |
| `DELETE`| `/me/alerts/{id}` | Sim | Remove alerta de preço |
| `POST` | `/me/push/subscribe` | Sim | Registra inscrição Web Push do navegador |
| `DELETE`| `/me/push/subscribe` | Sim | Cancela inscrição Web Push |
| `GET` | `/feed` | Sim | Feed personalizado baseado nas preferências |
| `GET` | `/offers` | Não | Vitrine pública com filtros e paginação |
| `POST` | `/admin/offers/{id}/publish` | Sim | Publica oferta e dispara Celery `match_and_notify` |

---

## 🔄 Integração Contínua (CI/CD) & Validação de Migrations

O projeto conta com uma pipeline automatizada via **GitHub Actions** (`.github/workflows/ci.yml`) executada em todos os Pull Requests e pushes para a branch `main`.

### Serviços Descartáveis de Teste (Service Containers)
- **PostgreSQL 16** (`postgres:16`): banco relacional efêmero e isolado para testes (`elitedaspechinchas_test`). Nenhum banco ou migration de produção é afetado.
- **Redis 7** (`redis:7-alpine`): broker de mensagens e backend Celery descartável para testes.

### Etapas Validadas pelo Pipeline
1. **Auditoria de Qualidade e Segurança**:
   - `git diff --check` para verificar formatação e espaçamentos.
   - Bloqueio de arquivos de ambiente reais (`.env`, `.env.local`).
   - Bloqueio de sessões Telethon (`*.session`) e chaves privadas confidenciais (PEM/RSA).
   - Bloqueio de senhas expostas ou credenciais administrativas hardcoded.
   - Nenhuma credencial de produção é utilizada ou exposta nos logs.
2. **Validação Estrita de Migrations Alembic no PostgreSQL**:
   - Execução de `alembic upgrade head` em banco limpo.
   - Verificação de todas as 9 tabelas obrigatórias (`offers`, `sources`, `affiliate_rules`, `users`, `user_preferences`, `favorites`, `price_alerts`, `push_subscriptions`, `notifications`).
   - Validação da coluna `offers.telegram_msg_id` como tipo `BIGINT`.
   - Validação de chaves estrangeiras e índices.
   - Execução de `alembic downgrade base` e confirmação de remoção completa.
   - Re-execução de `alembic upgrade head` e confirmação de restauração de integridade.
3. **Testes Automatizados de Backend**:
   - `python -m pytest -v` executando todos os testes unitários e de integração contra o PostgreSQL e Redis descartáveis.
4. **Validação Frontend & Build**:
   - Verificação estrita de tipagem TypeScript via `npx tsc --noEmit`.
   - Build de produção Next.js via `npm run build` (sem mock e sem dependência de API ativa em build time).
   - Linting via `npm run lint` (`next lint`).
5. **Validação End-to-End (E2E) em Produção**:
   - `python -m pytest tests/test_production_e2e.py -v` validando healthcheck, listagem de ofertas, fluxo de auto-publicação e deduplicação no ambiente de produção.

### Como Executar os Testes E2E de Produção Localmente
```bash
# Executar testes contra a API em produção (Railway):
pytest tests/test_production_e2e.py -v

# Ou apontando para outra URL:
RAILWAY_API_URL="https://elitedaspechinchas-production.up.railway.app" pytest tests/test_production_e2e.py -v
```

### Como Executar o Teste de Carga e Latência (p95 < 100ms)
```bash
# Execução padrão (50 workers concorrentes por 30s):
pytest tests/test_load.py -v -s

# Execução rápida (5s):
LOAD_TEST_DURATION=5 pytest tests/test_load.py -v -s
```

### Como Executar o Teste de Resiliência (Fallback do Redis)
```bash
# Execução padrão:
pytest tests/test_resilience.py -v
```

### Como Executar o Teste de Tags de Afiliado
```bash
# Execução padrão contra a API:
pytest tests/test_affiliate_links.py -v
```

### Como Executar a Validação de Migrations Localmente
Caso possua o Docker rodando localmente:
```bash
# Subir PostgreSQL de teste
docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=elitedaspechinchas_test -p 5432:5432 postgres:16-alpine

# Executar script de validação de migrações
TEST_POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/elitedaspechinchas_test python scripts/verify_migrations.py
```

---

## 🚀 Deploy em Produção (Vercel + Railway) — NO AR! 🟢

O ecossistema está **100% online e operando em produção**:

- 🌐 **Frontend (Vercel)**: [https://elitedaspechinchas.vercel.app](https://elitedaspechinchas.vercel.app)
- ⚙️ **Backend API (Railway)**: [https://elitedaspechinchas-production.up.railway.app](https://elitedaspechinchas-production.up.railway.app)
- 📖 **Documentação Swagger**: [https://elitedaspechinchas-production.up.railway.app/docs](https://elitedaspechinchas-production.up.railway.app/docs)
- 🐘 **PostgreSQL 16 & Redis 7**: Gerenciados e conectados na Railway
- 📦 **Celery Worker**: Preparado para processamento assíncrono, limpeza de ofertas e disparo de Web Push
- 📋 **Guia Operacional**: Consulte o manual completo em [`DEPLOY.md`](DEPLOY.md).

