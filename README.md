# 🪙 CashBank - Sistema de Gestão Financeira Pessoal

> Plataforma completa de controle, planejamento e administração financeira pessoal, desenvolvida com foco em alta fidelidade visual, experiência de uso intuitiva, responsividade e robustez arquitetural.

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
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Execução](#-instalação-e-execução)
  - [Pré-requisitos](#pré-requisitos)
  - [Variáveis de Ambiente (.env)](#variáveis-de-ambiente-env)
  - [Executando o Backend](#executando-o-backend)
  - [Executando o Frontend](#executando-o-frontend)
- [Controle de Versão](#-controle-de-versão)

---

## 🎯 Visão Geral

O **CashBank** foi projetado para solucionar os desafios reais da organização financeira diária. Diferente de planilhas complexas ou aplicativos genéricos, o sistema consolida receitas, despesas fixas recorrentes, gastos variáveis, faturas de cartão de crédito (com distinção de compras de terceiros), cofrinhos com metas e contas a receber em uma visão unificada e em tempo real.

O sistema inicia limpo (**Zero Mock**), pronto para receber lançamentos reais com isolamento absoluto de dados por usuário.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18**: Biblioteca declarativa para interfaces reativas baseadas em componentes.
- **TypeScript**: Tipagem estática rigorosa para previsibilidade e manutenção.
- **Vite**: Build tool ultrarrápido para desenvolvimento moderno em ESM.
- **Lucide React**: Biblioteca de ícones vetoriais modernos e consistentes.
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
- **JWT (JSON Web Tokens)**: Autenticação stateless segura via tokens de autorização Bearer.
- **Bcryptjs**: Criptografia unidirecional com salt para proteção rigorosa de credenciais.
- **Nodemailer**: Envio de códigos de recuperação de senha por e-mail com fallback em log formatado.
- **CORS & Middlewares Customizados**: Controle estrito de origens e interceptores de autenticação.

---

## 🏛️ Arquitetura do Sistema

```
                       ┌────────────────────────┐
                       │   Cliente Web (Vite)   │
                       │   React + TypeScript   │
                       └───────────┬────────────┘
                                   │ HTTP / JSON (Bearer JWT)
                                   ▼
                       ┌────────────────────────┐
                       │   API REST (Express)   │
                       │   Node.js + TS         │
                       └─────┬────────────┬─────┘
                             │            │
       ┌─────────────────────┴──┐      ┌──┴─────────────────────┐
       │   Auth & Middlewares   │      │   Controllers & Utils   │
       └────────────────────────┘      └──────────┬─────────────┘
                                                  │ Prisma ORM Client
                                                  ▼
                                       ┌─────────────────────┐
                                       │ Supabase PostgreSQL │
                                       └─────────────────────┘
```

A arquitetura do backend segue o padrão em camadas desacoplado:
1. **Rotas (`routes/`)**: Mapeamento dos endpoints RESTful e injeção do middleware de autenticação (`authenticateToken`).
2. **Controllers (`controllers/`)**: Orquestração das regras de negócio, validação de payload e composição de respostas.
3. **Utils (`utils/`)**: Funções puras para cálculos financeiros, manipulação de datas UTC e tratamento de faturas.
4. **Prisma Client (`prisma/`)**: Comunicação segura com o PostgreSQL através de queries otimizadas com filtros por `userId`.

---

## 📜 Regras de Negócio

### 1. Visão Geral (Dashboard) e Fluxo de Caixa

O Dashboard centraliza a saúde financeira do usuário no mês selecionado e oferece um modo analítico anual.

#### 1.1. Cálculo do Saldo Disponível
O Saldo Disponível reflete o dinheiro líquido em conta corrente / disponível para uso imediato no mês corrente:

$$\text{Saldo Disponível} = \text{Receitas Totais} - \text{Despesas Totais} - \text{Depósitos na Poupança} + \text{Retiradas da Poupança}$$

- **Depósitos na Poupança (Aportes):** Reduzem o saldo disponível da conta corrente, pois o recurso foi guardado em uma reserva.
- **Retiradas da Poupança (Resgates):** Aumentam o saldo disponível da conta corrente, pois o recurso voltou para a conta corrente.
- **Regra Fundamental de Poupança:** Os lançamentos de poupança (aportes ou resgates) **NUNCA são computados como despesas operacionais**. O card de Despesas Totais reflete unicamente contas a pagar e gastos do período.

#### 1.2. Cartões Herói (KPIs)
- **Saldo Disponível:** Exibe o saldo calculado dinamicamente. O card adota estilo esmeralda quando positivo e vermelho carmesim quando negativo, acompanhado do percentual de crescimento em relação ao mês anterior.
- **Minha Renda:** Soma estrita de todas as receitas do mês selecionado.
- **Despesas Totais:** Soma das contas fixas ativas no mês (incluindo faturas de cartão de crédito do titular) e despesas variáveis realizadas.
- **Na Poupança:** Saldo consolidado acumulado em todos os cofrinhos do usuário e percentual de atingimento da meta global.

#### 1.3. Extrato Unificado de Transações
- Exibe em ordem cronológica decrescente todas as movimentações financeiras do mês:
  - Receitas recebidas.
  - Despesas fixas e faturas de cartão quitadas (`isPaid === true`).
  - Despesas variáveis efetuadas.
  - Aportes e resgates de cofrinhos.
- Filtros rápidos por tipo: **Todas**, **Entradas** (Receitas e Resgates) e **Saídas** (Despesas e Aportes).
- Edição rápida inline com atualização em tempo real de valores, datas, categorias e cofrinhos.

#### 1.4. Painel Anual Consolidado
- Exibição de tabela analítica dos 12 meses do exercício selecionado.
- Detalhamento de receitas, despesas, aportes líquidos e saldo mês a mês.
- Atalho com um clique para alternar para a visão mensal do mês selecionado.

---

### 2. Poupança e Cofrinhos (Metas Financeiras)

A seção de Poupança permite criar múltiplos cofrinhos com objetivos claros e independentes (ex: *Reserva de Emergência*, *Viagem*, *Carro Novo*).

- **Cadastro de Cofrinhos:** Cada cofrinho possui nome, valor alvo (`targetAmount`), prazo estimado (`targetDate`), categoria, cor e ícone personalizados.
- **Cofrinhos em Andamento (Saldo Inicial Pré-existente):**
  - Permite registrar cofrinhos que já possuem valores acumulados anteriormente (iniciados antes do uso do sistema ou em meses passados).
  - **Regra Fundamental de Saldo:** O valor já acumulado (`initialAmount` / `isInitialBalance`) soma normalmente no saldo atual do cofrinho (`currentAmount`), na barra de progresso da meta e no KPI "Na Poupança", **mas NÃO é deduzido do Saldo Disponível** da Visão Geral deste mês (não afeta o fluxo de caixa do mês corrente).
  - É possível marcar um cofrinho como "Em andamento" e ajustar seu saldo inicial tanto no momento do cadastro quanto na edição posterior do cofrinho.
- **Depósitos Regulares (Novos Aportes):** Registram uma transação com valor positivo associada ao cofrinho. Atualizam a barra de progresso da meta e deduzem o valor do saldo disponível no Dashboard como saída de caixa realizada no mês.
- **Retiradas (Resgates):** Registram uma transação com valor negativo.
  - *Validação de Saldo:* O sistema impede retiradas superiores ao saldo existente no cofrinho selecionado, exibindo mensagem amigável com o saldo remanescente disponível.
  - O valor resgatado é reintegrado ao saldo disponível da Visão Geral (recurso volta para a conta corrente).
- **Exclusão de Cofrinho:** Ao excluir um cofrinho, suas movimentações vinculadas são removidas em cascata via chave estrangeira relacional.

---

### 3. Despesas Fixas (Contas a Pagar)

Destinada aos compromissos financeiros recorrentes (ex: Aluguel, Condomínio, Internet, Academia).

- **Recorrência por Intervalo de Vigência:**
  - `firstDueDate`: Mês/ano de início da obrigatoriedade.
  - `endDate` (opcional): Mês/ano final do compromisso. Se nulo, a despesa se repete indefinidamente.
  - A conta só é exibida e somada nos meses em que está ativa (`isFixedExpenseActiveInMonth`).
- **Status de Pagamento Independente por Mês (`FixedExpensePayment`):**
  - Alternar uma conta entre `Pago` e `Pendente` altera apenas o status daquele mês e ano específicos, sem alterar a regra para outros períodos.
- **Ajustes de Valor:**
  - **Apenas este mês:** Permite registrar um valor pontual (ex: conta de luz mais alta) gravado no pagamento do mês, mantendo o valor base inalterado para os demais meses.
  - **Deste mês em diante:** Registra um `FixedExpenseAdjustment` que atualiza o valor base da conta a partir daquele mês/ano em diante, preservando o histórico dos meses passados.
- **Facilitador Pix:** Permite cadastrar chave Pix da conta para cópia instantânea com um clique.

---

### 4. Despesas Variáveis (Gastos do Dia a Dia)

Destinada aos gastos pontuais e não recorrentes (ex: Restaurantes, Supermercado, Farmácia, Combustível).

- **Lançamentos:** Registrados com data, hora, descrição, valor, categoria e chave Pix opcional.
- **Filtragem Mensal:** Navegação simplificada através do carrossel mensal, exibindo os cartões herói (total do mês e quantidade de lançamentos) e a listagem paginada/filtrada.
- **CRUD Completo:** Edição e exclusão direta com atualização reativa do Dashboard.

---

### 5. Receitas (Minha Renda)

Gerencia todas as entradas financeiras do usuário (ex: Salário, Pró-labore, Freelance, Rendimentos de investimentos).

- **Lançamentos:** Registrados com data, hora, descrição, valor e categoria.
- **Cálculo de Crescimento:** O sistema compara o faturamento do mês atual com o mês anterior para exibir a variação percentual real no card herói.
- **Integração com Contas a Receber:** Recebíveis marcados como "Venda/Renda" integram-se automaticamente às receitas no momento da confirmação do recebimento.

---

### 6. Cartões de Crédito e Faturas

Gestão detalhada de cartões com simulação inteligente de compras parceladas e separação de gastos de terceiros.

- **Cadastro do Cartão:** Nome do emissor, bandeira, limite total, dia de fechamento (melhor dia de compra) e dia de vencimento.
- **Compras Parceladas:**
  - Ao cadastrar uma compra em $N$ vezes, o backend gera automaticamente todas as parcelas (`CreditCardInstallment`) nos meses futuros subsequentes.
  - O cálculo considera a data da compra em relação ao dia de fechamento do cartão: se a compra foi feita após o fechamento, a 1ª parcela é lançada no mês seguinte.
- **Compras de Terceiros:**
  - Permite identificar compras realizadas no cartão para amigos ou familiares (`isThirdParty`, `thirdPartyName`, `thirdPartyAmount`).
  - **Regra de Visão Geral:** Apenas o montante pertencente ao **titular do cartão** é computado como despesa do usuário no Dashboard. O valor de terceiros pode ser acompanhado separadamente e cobrado via módulo de Recebíveis.
- **Fatura Mensal:**
  - Consolidação automática das parcelas que vencem no mês.
  - Permite ajuste manual do valor da fatura (`manualAdjustment`).
  - Quitação da fatura com registro de data de pagamento (`paidAt`).

---

### 7. Contas a Receber (Receivables)

Módulo voltado ao controle de empréstimos, cobranças de terceiros e vendas a prazo.

- **Gestão de Devedores:** Cadastro de valor, devedor (`payer`), data prevista de recebimento e categoria.
- **Status do Recebimento:** Permite alternar entre `Pendente` e `Recebido` com registro da data efetiva.
- **Flag "Venda / Renda":** Quando ativada, a liquidação do recebível gera automaticamente uma entrada no módulo de **Receitas**, impactando o faturamento do usuário.

---

### 8. Autenticação, Segurança e Multi-Tenancy

- **Isolamento de Dados:** Cada consulta no banco de dados aplica obrigatoriamente a cláusula `where: { userId }`, garantindo privacidade completa entre usuários.
- **Proteção de Senhas:** Senhas são salvas no banco exclusivamente como hashes criptográficos via Bcryptjs (fator de custo 10).
- **Sessões JWT:** Autenticação stateless com tokens contendo o identificador do usuário e expiração configurada.
- **Recuperação de Senha:** Fluxo seguro via código numérico de 6 dígitos enviado por e-mail com tempo de expiração.

---

## 📁 Estrutura do Projeto

```
cashbank/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Modelagem do banco relacional PostgreSQL
│   │   └── client.ts             # Instância singleton do PrismaClient
│   ├── src/
│   │   ├── controllers/          # Controladores de regras de negócio
│   │   │   ├── authController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── fixedExpenseController.ts
│   │   │   ├── variableExpenseController.ts
│   │   │   ├── revenueController.ts
│   │   │   ├── piggyBankController.ts
│   │   │   ├── savingsController.ts
│   │   │   ├── creditCardController.ts
│   │   │   └── receivableController.ts
│   │   ├── middleware/
│   │   │   └── auth.ts           # Interceptor de autorização JWT
│   │   ├── routes/               # Definição dos endpoints da API
│   │   ├── utils/                # Utilitários de data, timezone UTC e parcelamento
│   │   └── server.ts             # Ponto de entrada do servidor Express
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Componentes reutilizáveis (Sidebar, Modais, Seletor)
│   │   ├── context/              # Contexto global de Autenticação e Tema
│   │   ├── services/
│   │   │   └── api.ts            # Cliente HTTP centralizado com fetch e tokens
│   │   ├── utils/                # Formatadores de moeda, máscaras e datas
│   │   ├── views/                # Telas do sistema
│   │   │   ├── DashboardView.tsx
│   │   │   ├── FixedExpensesView.tsx
│   │   │   ├── VariableExpensesView.tsx
│   │   │   ├── RevenuesView.tsx
│   │   │   ├── SavingsView.tsx
│   │   │   ├── CreditCardsView.tsx
│   │   │   ├── ReceivablesView.tsx
│   │   │   └── LoginView.tsx
│   │   ├── App.tsx               # Roteamento e orquestração de modais rápidos
│   │   ├── main.tsx              # Ponto de entrada React
│   │   └── index.css             # Tokens de design e estilos globais
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js** v18.0.0 ou superior instalado.
- **npm** ou **yarn**.
- Banco de dados PostgreSQL (instância local ou Supabase).

---

### Variáveis de Ambiente (.env)

Crie ou configure o arquivo `.env` na raiz do projeto (ou dentro da pasta `backend/`):

```env
# Conexão com o banco PostgreSQL (Supabase)
# Connection Pooling (Porta 6543)
DATABASE_URL="postgresql://postgres.[SEU-APP]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexão direta para Migrações do Prisma (Porta 5432)
DIRECT_URL="postgresql://postgres.[SEU-APP]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres"

# Porta do Servidor Backend
PORT=5000

# Chave secreta para geração dos tokens JWT
JWT_SECRET="cashbank-super-secret-jwt-key-change-in-production"

# Configuração de E-mail para recuperação de senha (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-app"
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

4. (Opcional) Aplique o schema ao banco de dados:
   ```bash
   npm run prisma:push
   ```

5. Inicie o servidor em modo de desenvolvimento com hot-reload:
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

4. Acesse pelo navegador, crie sua conta gratuitamente e comece a gerenciar suas finanças!

---

## 🔒 Controle de Versão

- **Atenção:** Em conformidade com as diretrizes do projeto, **não realize commits ou pushes diretamente no repositório remoto sem prévia autorização e alinhamento do responsável**.
