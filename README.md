# CashBank - Sistema de Controle Financeiro Pessoal

Sistema completo de controle e administração financeira desenvolvido com foco em alta fidelidade visual, responsividade e robustez técnica, seguindo a identidade e os fluxos dos protótipos de design.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:**
  - React 18
  - TypeScript
  - Vite
  - Lucide React (Ícones consistentes)
  - Vanilla CSS com Tokens de Design customizados (Tipografia Google Fonts: *Plus Jakarta Sans* e *Inter*)

- **Backend:**
  - Node.js & Express
  - TypeScript & TSX
  - Prisma ORM 5.x
  - Supabase PostgreSQL (Configurado via connection pooling)
  - Autenticação JWT & Criptografia de senhas com Bcryptjs
  - CORS, validações e tratamento de erros

---

## 🌟 Funcionalidades e Ajustes Realizados

1. **Pronto para ser Alimentado (Zero Mock):**
   - Todos os dados mockados e o acesso de demonstração da Marina foram totalmente removidos do banco de dados e do código.
   - O sistema inicia com valores zerados (`R$ 0,00`), indicadores dinâmicos e telas limpas com mensagens de incentivo para cadastrar novos lançamentos.

2. **Abas Mensais em Despesas Variáveis e Receitas:**
   - Adicionada a barra seletora de meses (Abr, Mai, Jun, Jul, Ago, Set) em **Despesas Variáveis** e em **Receitas**, exatamente igual ao padrão existente em **Despesas Fixas**.
   - Ao selecionar um mês, tanto os cartões herói (total do mês, contagem de registros) quanto as tabelas filtram e exibem os dados correspondentes em tempo real.

3. **Autenticação Real de Usuários:**
   - Tela de login limpa permitindo que qualquer usuário crie sua própria conta através do link "Criar conta grátis" ou acesse sua conta existente.
   - Cada usuário possui seus próprios registros isolados no banco de dados Supabase PostgreSQL.

4. **CRUD Completo em Todas as Telas:**
   - **Despesas Fixas:** Cadastrar, editar, excluir e alternar status (`Pago` / `Pendente`) com um clique.
   - **Despesas Variáveis:** Cadastrar, editar e excluir com filtragem mensal.
   - **Receitas:** Cadastrar, editar e excluir com filtragem mensal.
   - **Poupança:** Cadastrar aportes, editar valores/objetivos e excluir.
   - **Dashboard (Visão Geral):** Gráfico de 6 meses, KPIs de saldo/receitas/despesas/poupança e próximos vencimentos alimentados 100% pelos dados reais do usuário.

---

## 🚀 Como Acessar e Utilizar

1. Acesse o frontend no navegador: **`http://localhost:3000`**
2. Clique em **"Criar conta grátis"**, informe seu nome, e-mail e senha.
3. Você será autenticado imediatamente no painel inicial pronto para cadastrar suas receitas, despesas e aportes de poupança.
