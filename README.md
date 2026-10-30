# 🪙 CashBank - Sistema de Gestão Financeira Pessoal

> Plataforma completa de controle, planejamento e administração financeira pessoal com Inteligência Artificial Generativa (**RAG + MCP**), Open Finance e suporte nativo a **PWA (Progressive Web App)**, desenvolvida com foco em alta fidelidade visual, experiência de uso intuitiva e robustez arquitetural.

🌐 **Deploy em Produção:** [https://cashbank-three.vercel.app/](https://cashbank-three.vercel.app/)

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Regras de Negócio](#-regras-de-negócio)
  - [1. Visão Geral (Dashboard) e Fluxo de Caixa](#1-visão-geral-dashboard-e-fluxo-de-caixa)
  - [2. Poupança e Cofrinhos (Metas Financeiras)](#2-poupança-e-cofrinhos-metas-financeiras)
  - [3. Despesas Fixas (Contas a Pagar)](#3-despesas-fixas-contas-a-pagar)
  - [4. Despesas Variáveis (Gastos do Dia a Dia)](#4-despesas-variáveis-gastos-do-dia-a-dia)
  - [5. Receitas (Minha Renda)](#5-receitas-minha-renda)
  - [6. Cartões de Crédito e Faturas](#6-cartões-de-crédito-e-faturas)
  - [7. Contas a Receber (Receivables)](#7-contas-a-receber-receivables)
  - [8. Autenticação, Segurança e Multi-Tenancy](#8-autenticação-segurança-e-multi-tenancy)
  - [9. Assistente Virtual Inteligente (CashAI: RAG + MCP)](#9-assistente-virtual-inteligente-cashai-rag--mcp)
  - [10. Contas Bancárias & Open Finance (Pluggy)](#10-contas-bancárias--open-finance-pluggy)
  - [11. Progressive Web App (PWA & Instalação Mobile)](#11-progressive-web-app-pwa--instalação-mobile)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Execução](#-instalação-e-execução)
  - [Acesso Online (Deploy)](#-acesso-online-deploy)
  - [Pré-requisitos](#pré-requisitos)
  - [Variáveis de Ambiente (.env)](#variáveis-de-ambiente-env)
  - [Executando o Backend](#executando-o-backend)
  - [Executando o Frontend](#executando-o-frontend)
- [Controle de Versão](#-controle-de-versão)

---

## 🎯 Visão Geral

O **CashBank** foi projetado para solucionar os desafios reais da organização financeira diária. Diferente de planilhas complexas ou aplicativos genéricos, o sistema consolida receitas, despesas fixas recorrentes, gastos do dia a dia, faturas de cartão de crédito (com distinção de compras de terceiros), cofrinhos com metas, contas a receber, contas bancárias Open Finance e um assistente inteligente integrado em uma visão unificada e em tempo real.

O sistema opera com isolamento absoluto de dados por usuário (**Multi-Tenancy** seguro).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18**: Biblioteca declarativa para interfaces reativas baseadas em componentes.
- **TypeScript**: Tipagem estática rigorosa para previsibilidade e manutenção.
- **Vite**: Build tool ultrarrápido para desenvolvimento moderno em ESM.
- **Lucide React**: Biblioteca de ícones vetoriais modernos e consistentes.
- **PWA (Progressive Web App)**: Service Worker com cache estratégico de assets, fallback offline e manifesto web com suporte a tela cheia no Android e iOS.
- **Vanilla CSS com Design Tokens**:
  - Variáveis nativas de CSS (`:root` e `.dark`) para temas claro e escuro.
  - Tipografia de alta legibilidade com Google Fonts (*Plus Jakarta Sans* e *Inter*).
  - Micro-interações, transições suaves, glassmorphism e sombras refinadas.
  - Layout totalmente responsivo para desktop, tablets e smartphones.

### Backend
- **Node.js**: Ambiente de execução JavaScript assíncrono orientado a eventos.
- **Express 4.x**: Framework HTTP minimalista e escalável.
- **TypeScript & TSX**: Desenvolvimento tipado de ponta a ponta sem etapa manual de transpilação em desenvolvimento.
- **Prisma ORM 5.x**: Abstração de banco de dados fortemente tipada com migrações declarativas.
- **PostgreSQL (Supabase)**: Banco de dados relacional robusto com *Connection Pooling* (porta 6543) e conexão direta para migrações (porta 5432).
- **Google Gemini API (@google/generative-ai)**: Modelo generativo de alta velocidade e precisão para consultas em linguagem natural e function calling (ferramentas de agente).
- **JWT (JSON Web Tokens)**: Autenticação stateless segura via tokens de autorização Bearer.
- **Bcryptjs**: Criptografia unidirecional com salt para proteção rigorosa de credenciais.
- **Resend API & Nodemailer**: Envio confiável de links e códigos de redefinição de senha por e-mail com fallback em log formatado.
- **Pluggy Open Finance API**: Integração para leitura e sincronização de contas bancárias e extratos via Open Finance.

---

## 🏛️ Arquitetura do Sistema

```
                       ┌─────────────────────────────────────────┐
                       │           Cliente Web (Vite)            │
                       │     React 18 + PWA + CashAI Widget      │
                       └────────────────────┬────────────────────┘
                                            │ HTTP / JSON (Bearer JWT)
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │            API REST (Express)           │
                       │             Node.js + TS                │
                       └───┬─────────────┬─────────────┬─────────┘
                           │             │             │
        ┌──────────────────┴──┐    ┌─────┴─────┐   ┌───┴───────────────────────┐
        │  Auth & Middlewares │    │ Controllers│   │ Módulo de IA (RAG + MCP)  │
        └─────────────────────┘    └─────┬─────┘   └───────────┬───────────────┘
                                         │                     │
                     ┌───────────────────┼─────────────────────┤
                     │                   │                     ▼
                     ▼                   ▼             ┌───────────────┐
             ┌───────────────┐   ┌───────────────┐     │ Google Gemini │
             │  Pluggy API   │   │  Prisma ORM   │     │  (Flash LLM)  │
             │ (Open Finance)│   └───────┬───────┘     └───────────────┘
             └───────────────┘           │
                                         ▼
                              ┌─────────────────────┐
                              │ Supabase PostgreSQL │
                              └─────────────────────┘
```

A arquitetura do backend segue o padrão em camadas desacoplado:
1. **Rotas (`routes/`)**: Mapeamento dos endpoints RESTful e injeção do middleware de autenticação (`authMiddleware`).
2. **Controllers (`controllers/`)**: Orquestração das regras de negócio, validação de payload e composição de respostas.
3. **Serviços de IA (`services/`)**:
   - `aiContextService.ts`: Monta o contexto RAG factual baseado nos lançamentos reais e projeções futuras do usuário.
   - `aiToolService.ts`: Declaração e execução segura de ferramentas MCP (Tool Calling) para manipular o banco.
4. **Utils (`utils/`)**: Funções puras para cálculos financeiros, manipulação de datas UTC e parcelamento.
5. **Prisma Client (`prisma/`)**: Comunicação segura com o PostgreSQL através de queries otimizadas com filtros estritos por `userId`.

---

## 📜 Regras de Negócio

### 1. Visão Geral (Dashboard) e Fluxo de Caixa

O Dashboard centraliza a saúde financeira do usuário no mês selecionado e oferece um modo analítico anual.

#### 1.1. Cálculo do Saldo em Conta e Saldo Previsto (Abordagem Híbrida)
O CashBank adota a **Abordagem Híbrida** para o gerenciamento do saldo, combinando a precisão do **Regime de Caixa** com a previsibilidade do **Regime de Competência / Orçamento**:

1. **Saldo Atual em Conta (Realizado):**
   $$\text{Saldo Atual} = \text{Receitas Totais} - \text{Despesas Realizadas/Pagas} - \text{Depósitos na Poupança} + \text{Retiradas da Poupança}$$
   - Deduz apenas despesas fixas e faturas de cartão quitadas (`isPaid === true`), além de gastos do dia a dia e depósitos líquidos em cofrinhos.
   - Reflete com exatidão o saldo presente na sua conta bancária no momento atual.

2. **Saldo Previsto pós-contas (Projetado / Fim do Mês):**
   $$\text{Saldo Previsto} = \text{Saldo Atual em Conta} - \text{Despesas Pendentes a Pagar}$$
   - Indica com transparência quanto sobrará ao final do mês após quitar todas as contas e faturas agendadas.
   - Se todas as contas do mês já estiverem pagas, o card indica automaticamente `✓ Contas quitadas`.

3. **Regra Fundamental de Poupança:**
   - Movimentações de poupança (aportes ou resgates) **NUNCA são computadas como despesas operacionais**. O card de Despesas Totais reflete unicamente contas a pagar e gastos de consumo.

---

### 2. Poupança e Cofrinhos (Metas Financeiras)

- **Cadastro de Cofrinhos:** Nome, valor alvo (`targetAmount`), prazo estimado (`targetDate`), categoria, cor e ícone personalizados.
- **Cofrinhos em Andamento:** Valores acumulados anteriormente (`initialAmount` / `isOngoing`) somam no saldo do cofrinho e no KPI global, sem deduzir do fluxo de caixa do mês corrente.
- **Aportes e Resgates:** Depósitos reduzem o saldo em conta corrente; resgates devolvem o montante ao saldo disponível com validação estrita de saldo suficiente.

---

### 3. Despesas Fixas (Contas a Pagar)

- **Recorrência por Intervalo de Vigência:** Início em `firstDueDate` e término opcional em `endDate`.
- **Status Independente por Mês:** Alternar uma conta entre `Pago` e `Pendente` altera apenas o status daquele mês e ano específicos.
- **Ajustes de Valor:** Permite alteração pontual (apenas no mês corrente) ou reajuste contratual permanente (deste mês em diante).

---

### 4. Despesas Variáveis (Gastos do Dia a Dia)

- Lançamentos pontuais com data, horário, valor, categoria e chave Pix opcional.
- Navegação mensal e atualização reativa instantânea do Dashboard.

---

### 5. Receitas (Minha Renda)

- Gestão de todas as entradas financeiras (Salário, Pró-labore, Freelance, Rendimentos).
- Cálculo automático de variação percentual em relação ao mês anterior.

---

### 6. Cartões de Crédito e Faturas

- **Compras Parceladas:** Geração automática das parcelas futuras subsequentes com base na data da compra e no dia de fechamento do cartão.
- **Compras de Terceiros:** Separação entre gastos do titular e compras feitas para terceiros, computando na Visão Geral apenas o montante devido pelo titular.
- **Projeções Futuras:** O sistema consolida compras parceladas contratadas para os meses posteriores, permitindo prever faturas com até 12 meses de antecedência.

---

### 7. Contas a Receber (Receivables)

- Controle de empréstimos, cobranças de terceiros e vendas a prazo.
- Flag "Venda / Renda" que integra o recebimento diretamente ao módulo de Receitas no momento da liquidação.

---

### 8. Autenticação, Segurança e Multi-Tenancy

- **Isolamento Absoluto:** Consultas no banco aplicam obrigatoriamente `where: { userId }`.
- **Criptografia:** Senhas com hash Bcryptjs (custo 10).
- **Sessões JWT:** Autenticação stateless via tokens Bearer.
- **Redefinição de Senha:** Links seguros com token assinado e expiração temporal.

---

### 9. Assistente Virtual Inteligente (CashAI: RAG + MCP)

O CashBank conta com um assistente virtual de inteligência artificial nativo (**CashAI**), acessível através de um botão flutuante expansível no canto inferior direito da tela.

#### 9.1. Arquitetura RAG (Retrieval-Augmented Generation)
- **Recuperação Contextual em Tempo Real:** Ao receber uma mensagem do usuário, o backend consulta os dados financeiros reais daquele usuário específico e constrói um contexto enriquecido contendo:
  - Saldo atual e saldo projetado pós-contas.
  - Receitas totais e detalhamento de despesas (pagas vs. pendentes).
  - Status de cada conta a pagar do mês.
  - Faturas do mês atual e **projeções futuras de parcelas contratadas para os próximos 6 meses**.
  - Metas e progresso de cada cofrinho.
- **Eliminação de Alucinações:** A IA responde com precisão matemática em formato `R$ X,XX`, baseando-se estritamente nas transações reais do usuário.

#### 9.2. Capacidades de Ação MCP (Model Context Protocol / Agentic Tools)
O CashAI utiliza a capacidade de *Function Calling* nativa da LLM para executar ações no sistema com base no comando do usuário:
* `create_variable_expense`: Cadastra um novo gasto do dia a dia inferindo automaticamente categoria e valor (ex: *"Cadastre um almoço de R$ 38 hoje"*).
* `create_revenue`: Registra uma nova receita (ex: *"Recebi R$ 1.500 de freelance"*).
* `mark_fixed_expense_paid`: Marca contas a pagar como quitadas ou pendentes (ex: *"Paguei a internet"*).
* `add_savings_deposit`: Realiza depósitos ou resgates em cofrinhos (ex: *"Guarde R$ 150 no cofrinho Viagem"*).
* `create_receivable`: Cadastra valores devidos por terceiros.
* `get_credit_card_invoice_details`: Consulta o valor total e o detalhamento item a item de faturas de qualquer cartão em qualquer mês (atual, passado ou futuro).

#### 9.3. Atualização Reativa da Interface
Quando o CashAI executa uma ação MCP (ex: cadastrar despesa ou pagar conta), a interface do CashBank atualiza imediatamente os cards de saldo, gráficos e tabelas em segundo plano sem necessidade de recarregar a página.

---

### 10. Contas Bancárias & Open Finance (Pluggy)

- Conexão e sincronização de contas digitais e tradicionais (Nubank, Inter, Itaú, Mercado Pago, etc.) através do **Pluggy Connect**.
- Consulta consolidada de saldos reais e extratos bancários.
- Opção para desconexão segura de contas a qualquer momento.

---

### 11. Progressive Web App (PWA & Instalação Mobile)

- **Instalável no Smartphone:** O CashBank é um PWA completo reconhecido nativamente pelo Google Chrome e Safari.
- **Ícones Adaptativos:** Conjunto completo de ícones de alta resolução (192px, 512px, maskable para Android e touch icon para iOS).
- **Service Worker (`sw.js`):** Cache seguro de arquivos estáticos com bypass estrito de chamadas de API financeiras (dados de saldo nunca ficam desatualizados).
- **Botão de Instalação:** Atalho inteligente no menu lateral para instalação com 1 clique no celular ou desktop.

---

## 📁 Estrutura do Projeto

```
cashbank/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Modelagem relacional PostgreSQL
│   │   └── client.ts             # Instância singleton do PrismaClient
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.ts           # Orquestrador do CashAI (chat & prompts rápidos)
│   │   │   ├── authController.ts         # Login direto e autenticação
│   │   │   ├── bankAccountController.ts  # Integração Open Finance / Pluggy
│   │   │   ├── creditCardController.ts   # Cartões e parcelas futuras
│   │   │   ├── dashboardController.ts    # Consolidação da Visão Geral
│   │   │   ├── fixedExpenseController.ts # Contas a pagar recorrentes
│   │   │   ├── piggyBankController.ts    # Cofrinhos e metas
│   │   │   ├── receivableController.ts   # Contas a receber
│   │   │   ├── revenueController.ts      # Minha renda
│   │   │   ├── savingsController.ts      # Aportes e resgates
│   │   │   └── variableExpenseController.ts # Gastos do dia a dia
│   │   ├── middleware/
│   │   │   └── auth.ts           # Interceptor de autorização JWT
│   │   ├── routes/
│   │   │   ├── aiRoutes.ts       # Endpoints /api/ai
│   │   │   ├── bankAccountRoutes.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── aiContextService.ts # Motor RAG (recuperação de contexto financeiro)
│   │   │   └── aiToolService.ts    # Motor MCP (declaração e execução de ferramentas)
│   │   ├── utils/                # Cálculos, datas UTC e emailService
│   │   └── server.ts             # Ponto de entrada Express
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   │   ├── icons/                # Ícones PWA (192px, 512px, maskable)
│   │   ├── manifest.json         # Manifesto Web PWA
│   │   ├── sw.js                 # Service Worker (Cache & Offline)
│   │   └── logo.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── AiAssistantWidget.tsx # Widget flutuante interativo do CashAI
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── usePwaInstall.ts  # Hook para captura do prompt de instalação
│   │   ├── services/
│   │   │   └── api.ts            # Cliente HTTP com métodos da API REST e IA
│   │   ├── views/                # Telas (Dashboard, Cofrinhos, Cartões, etc.)
│   │   ├── registerServiceWorker.ts # Registro automático do Service Worker
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vercel.json               # Headers de cache e rewrites para PWA
│   ├── package.json
│   └── vite.config.ts
│
├── .env                          # Variáveis de ambiente consolidadas
└── README.md
```

---

## 🚀 Instalação e Execução

### 🌐 Acesso Online (Deploy)

A aplicação está disponível publicamente:

👉 **[https://cashbank-three.vercel.app/](https://cashbank-three.vercel.app/)**

---

### Pré-requisitos
- **Node.js** v18.0.0 ou superior instalado.
- **npm** ou **yarn**.
- Instância PostgreSQL (local ou Supabase).
- Chave de API do **Google Gemini** ([Google AI Studio](https://aistudio.google.com/app/apikey)) para o assistente CashAI.

---

### Variáveis de Ambiente (.env)

Crie ou configure o arquivo `.env` na raiz do projeto (ou dentro da pasta `backend/`):

```env
# ==============================================================================
# CASHBANK - VARIÁVEIS DE AMBIENTE
# ==============================================================================

# 1. SERVIDOR & AUTENTICAÇÃO
PORT=5000
JWT_SECRET="cashbank-super-secret-jwt-key-2025"
FRONTEND_URL="http://localhost:3000"

# 2. BANCO DE DADOS POSTGRESQL (SUPABASE / PRISMA)
DATABASE_URL="postgresql://postgres.[SEU-APP]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.[SEU-APP]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres?sslmode=require"

# 3. ENVIO DE E-MAIL (REDEFINIÇÃO DE SENHA)
# Provedor HTTP para Produção (Render / Vercel / Railway):
RESEND_API_KEY="sua_chave_resend_aqui"
RESEND_FROM="CashBank <onboarding@resend.dev>"

# Fallback SMTP (desenvolvimento local):
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="seu-email@gmail.com"
EMAIL_PASS="sua-senha-de-app"
EMAIL_FROM="Suporte CashBank <seu-email@gmail.com>"

# 4. OPEN FINANCE (INTEGRAÇÃO BANCÁRIA VIA PLUGGY - OPCIONAL)
PLUGGY_CLIENT_ID="seu_client_id_pluggy"
PLUGGY_CLIENT_SECRET="seu_client_secret_pluggy"

# 5. INTELIGÊNCIA ARTIFICIAL GENERATIVA (RAG + MCP CASHAi)
# Obtenha sua chave gratuita em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="sua_chave_gemini_aqui"
```

---

### Executando o Backend

1. Abra o terminal e acesse a pasta `backend`:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Gere o cliente do Prisma com os modelos do schema:
   ```bash
   npm run prisma:generate
   ```

4. Inicie o servidor em modo de desenvolvimento com hot-reload:
   ```bash
   npm run dev
   ```
   *O backend estará acessível em `http://localhost:5000`.*

---

### Executando o Frontend

1. Abra um segundo terminal e acesse a pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento do Vite:
   ```bash
   npm run dev
   ```
   *O frontend estará disponível em `http://localhost:3000`.*

---

## 🔒 Controle de Versão

- **Atenção:** Em conformidade com as diretrizes do projeto, **não realize commits ou pushes diretamente no repositório remoto sem prévia autorização e alinhamento do responsável**.
