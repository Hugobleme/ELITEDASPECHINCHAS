# ⚡ Elite das Pechinchas — Agregador de Promoções & Cupons

Um ecossistema completo para agregação, curadoria e recomendação de ofertas em tempo real inspirado no **Pechinchou** e **Promobit**.

- **Frontend (Fases 1 e 2)**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query + Recharts.
- **Backend (Fases 1, 2 e 3)**: FastAPI + PostgreSQL + SQLAlchemy + Alembic + Celery + Redis + Web Push (pywebpush) + JWT & Google OAuth.

---

## 🏛️ Arquitetura das 3 Fases

```mermaid
flowchart TD
    subgraph Ingestao["1. Automação Python"]
        TG[Grupos Telegram] -->|Telethon Userbot| BOT[Captura & Parser]
        BOT -->|Troca Automática| AF[Gera Link Afiliado]
        AF -->|status: pending| DB[(PostgreSQL)]
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
    end

    subgraph Web_App["4. Web App Next.js 14"]
        VITRINE[Vitrine Pública]
        PAINEL[Painel de Curadoria Admin]
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

## 🤖 Automação de Captura & Ingestão (Telethon + Celery)

A camada de automação é responsável por monitorar grupos-fonte no Telegram, realizar o parsing das mensagens, aplicar filtros de curadoria/deduplicação, trocar as tags de afiliados e persistir as ofertas no banco para posterior curadoria ou publicação automática.

### Fluxo de Ingestão em 5 Etapas:
1. **Captura em Tempo Real (`bot/listener.py`)**:
   - Userbot Telethon escuta mensagens dos grupos/canais autorizados configurados em `SOURCE_CHANNELS`.
   - Extrai texto, ID da mensagem, hyperlinks (`MessageEntityTextUrl`) e mídia.
   - Enfileira a mensagem no Celery via task assíncrona `process_telegram_message`.
2. **Parser Inteligente (`processor/parser.py`)**:
   - Extrai título limpo, preço atual, preço original e calcula o `% OFF`.
   - Reconhece cupons de desconto (`CUPOM: ...`, `Use o cupom ...`).
   - Identifica a loja de origem por domínio e heurística textual (Amazon, Mercado Livre, Magalu, Shopee, Kabum, etc.).
   - Classifica automaticamente na categoria correta (smartphones, informatica, games, moda, etc.).
3. **Motor de Regras & Deduplicação (`processor/rules.py`)**:
   - **Desconto Mínimo**: Rejeita ofertas com desconto abaixo de `MIN_DISCOUNT_PERCENT` (padrão 10%).
   - **Deduplicação Dupla**: Verifica unicidade por `telegram_msg_id` e por hash de conteúdo (`título + preço`) nas últimas 24 horas.
   - **Rate Limit**: Limita o volume de postagens por fonte para evitar inundações de spam.
4. **Substituição Automática de Afiliado (`processor/affiliate.py`)**:
   - Converte URLs da Amazon extraindo o ASIN (`/dp/ASIN?tag=minhatag-20`).
   - Limpa parâmetros de outros afiliados no Mercado Livre e injeta a tag própria.
   - Redireciona links Magalu para a vitrine do parceiro (`magazinevoce.com.br/parceiro/...`).
   - Injeta parâmetros oficiais para Kabum, Shopee e AliExpress.
   - Fallback tolerante: se a loja não tiver regra, mantém o link original e encaminha para revisão.
5. **Persistência & Publicação (`processor/tasks.py`)**:
   - Salva no banco com status `pending` (para aprovação na curadoria `/admin/ofertas`) ou `published` (se auto-aprovação estiver ligada).
   - Ao ser publicada, dispara `publish_offer_to_channel` (publica no canal oficial via Bot API) e `match_and_notify` (envia Web Push aos alertas cadastrados pelos usuários).

---

## 🐳 Subir com Docker (Stack Completa)

A aplicação conta com orquestração completa via **Docker Compose** que sobe todos os 6 serviços interconectados em uma rede privada com um único comando.

### 🧩 Serviços Orquestrados no `docker-compose.yml`

| Serviço | Imagem / Build | Porta | Descrição |
|---|---|---|---|
| **`postgres`** | `postgres:16-alpine` | `5432` | Banco de dados relacional com volume persistente `postgres_data` e healthcheck. |
| **`redis`** | `redis:7-alpine` | `6379` | Broker de mensagens Celery e cache com persistência e healthcheck. |
| **`api`** | `Dockerfile.backend` | `8000` | FastAPI (Uvicorn), aplica migrações Alembic automaticamente no start e expõe OpenAPI Swagger. |
| **`worker`** | `Dockerfile.backend` | — | Celery Worker que consome tarefas de parsing, motor de regras, troca de afiliados e Web Push. |
| **`listener`** | `Dockerfile.backend` | — | Userbot Telethon que monitora canais-fonte em tempo real com volume persistente para o `.session`. |
| **`web`** | `Dockerfile.frontend` | `3000` | Frontend Next.js 14 App Router construído em imagem multi-stage Node 20. |

---

### 🚀 Passo a Passo para Subir a Stack

#### 1. Clonar o repositório e configurar variáveis:
```bash
cp .env.example .env
```
> Preencha suas credenciais do Telegram (`TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`), tags de afiliados e chaves JWT/VAPID no `.env`.

#### 2. Subir todos os serviços com build:
```bash
docker compose up --build
```
Para rodar em segundo plano (modo detached):
```bash
docker compose up -d --build
```

#### 3. Popular o banco de dados com fontes e regras iniciais (Seed):
Em outro terminal (com os containers rodando):
```bash
docker compose exec api python seed.py
```

#### 4. Autenticação Inicial do Userbot Telethon (Primeira Execução):
Na primeira execução, o Telegram exige autenticação do número de telefone via código SMS/Telegram. Execute o container em modo interativo para digitar seu telefone e código:
```bash
docker compose run --rm listener python main.py
```
> **Nota de Persistência:** A sessão fica gravada no volume persistente `telethon_sessions` (`/app/sessions`). Uma vez autenticado, o container `listener` iniciará automaticamente 24h sem pedir código novamente.

#### 5. Verificar o status dos serviços e healthchecks:
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
     docker compose up -d postgres redis api worker listener
     ```

2. **Deploy All-in-One (VPS Única)**:
   - Execute todos os 6 containers via `docker compose up -d`.
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
- `TELEGRAM_API_ID` e `TELEGRAM_API_HASH`: obtidos em https://my.telegram.org/apps
- `TELEGRAM_BOT_TOKEN`: obtido com o @BotFather no Telegram
- `TARGET_CHANNEL_ID`: canal de destino das ofertas (ex: `@elitedaspechinchas`)
- `SOURCE_CHANNELS`: canais monitorados separados por vírgula (ex: `@grupo1,@grupo2`)
- Tags de afiliados: `AMAZON_TAG`, `MERCADOLIVRE_TAG`, etc.

### 4. Executar Migrações e Inicializar Dados (Seed)
```bash
# Executa migrações do banco
alembic upgrade head

# Popula fontes e regras iniciais de afiliados
python seed.py
```

### 5. Iniciar o Worker Celery (Processamento + Notificações)
Certifique-se de que o Redis está rodando:
```bash
celery -A processor.celery_app worker --loglevel=info
```

### 6. Iniciar o Listener do Userbot Telethon
Em um terminal separado:
```bash
python main.py
```

### 7. Iniciar a API FastAPI
```bash
uvicorn api.main:app --reload --port 8000
```
Documentação Swagger interativa: **http://localhost:8000/docs**

### 8. Executar a Suíte de Testes
```bash
pytest tests/ -v
```
Foram implementados testes unitários e de integração cobrindo:
- `tests/test_parser.py`: extração de preços, lojas, categorias e cupons.
- `tests/test_affiliate.py`: substituição e sanitização de links por loja.
- `tests/test_rules.py`: motor de regras, pisos de desconto e deduplicação 24h.
- `tests/test_bot_formatter_publisher.py`: renderização de cards e publicação.
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
- 📦 **Celery Worker & Telegram Listener**: Preparados para processamento assíncrono e captura de ofertas
- 📋 **Guia Operacional**: Consulte o manual completo em [`DEPLOY.md`](DEPLOY.md).

