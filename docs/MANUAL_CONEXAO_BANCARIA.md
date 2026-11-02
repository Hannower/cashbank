# 🏦 Manual do Usuário - Importação de Extratos Bancários no CashBank

Este guia orienta você no cadastro e importação das suas contas bancárias no **CashBank**.

No CashBank, a integração das suas contas é feita **100% através de arquivos de extrato** (OFX, CSV ou PDF). Esse método foi escolhido por ser:
* 🔒 **100% Seguro e Privado:** Você não precisa fornecer senhas, tokens de API ou certificados digitais. Seus dados bancários permanecem totalmente sob seu controle.
* 🇧🇷 **Compatível com Todos os Bancos do Brasil:** Funciona com Nubank, PicPay, Banco Inter, Mercado Pago, Itaú, Bradesco, Santander, Caixa, C6 Bank, Sicoob, Sicredi, Banco do Brasil e qualquer outra cooperativa ou fintech.
* ⚡ **Sem Burocracia:** Você não precisa de contas de desenvolvedor nem de aprovações demoradas. Basta exportar o extrato no app do banco e enviar para o CashBank.

---

## 📁 Formatos de Extrato Suportados

O CashBank aceita três formatos universais de arquivo:

1. **Arquivo OFX (.ofx) - *Formato Mais Recomendado*:**  
   O OFX (Open Financial Exchange) é o padrão bancário internacional. Ele traz as datas, descrições e identificadores únicos de cada movimentação com 100% de exatidão.
2. **Planilha CSV (.csv):**  
   Extratos baixados em formato de planilha. O CashBank possui um analisador inteligente capaz de identificar colunas de data, histórico, valor e o saldo final da conta.
3. **Extrato em PDF (.pdf) - *Leitura por Inteligência Artificial*:**  
   Extratos e demonstrativos oficiais em formato PDF. Graças à inteligência artificial integrada (Google Gemini), o CashBank analisa o documento, extraindo as transações e o saldo da conta com precisão.

---

## 📲 Como Baixar o Extrato nos Principais Bancos

### 🟣 Nubank
1. Abra o aplicativo do Nubank no seu celular.
2. Toque na área da sua **Conta** (onde é exibido seu saldo).
3. Toque no botão **"Pedir extrato"** (ou no ícone de configurações / extrato).
4. Selecione o mês desejado (mês atual ou meses anteriores).
5. Escolha o formato **OFX** (ou CSV / PDF) e confirme.
6. O Nubank enviará o arquivo para o seu e-mail em poucos segundos.
7. No **CashBank**, acesse sua conta Nubank e envie o arquivo.

---

### 🟢 PicPay
1. Abra o aplicativo do PicPay no celular.
2. Acesse a aba **Extrato** (ou Carteira).
3. Toque no ícone de exportar/compartilhar extrato no topo da tela.
4. Selecione o período desejado e escolha **OFX**, **CSV** ou **PDF**.
5. No **CashBank**, acesse sua conta PicPay, clique em **Importar Extrato** e selecione o arquivo baixado.

---

### 🟠 Banco Inter
1. Acesse o aplicativo do Banco Inter no celular ou o Internet Banking no computador.
2. Vá em **Extrato**.
3. Defina o período desejado (últimos 30, 60 dias ou período personalizado).
4. Toque no botão de **Exportar** / **Compartilhar**.
5. Escolha **OFX**, **PDF** ou **CSV** e importe no CashBank.

---

### 🔵 Mercado Pago
1. Acesse o aplicativo do Mercado Pago ou o site [mercadopago.com.br](https://www.mercadopago.com.br).
2. Vá até a seção **Seu dinheiro** ou **Extrato / Relatórios**.
3. Clique em **Exportar extrato** ou **Baixar extrato**.
4. Selecione o período e o formato desejado (PDF, CSV ou OFX).
5. No **CashBank**, importe o arquivo diretamente na sua conta Mercado Pago.

---

### 🏦 Itaú, Bradesco, Santander, Caixa, C6 e Banco do Brasil
1. Acesse o Internet Banking ou o aplicativo do banco.
2. Vá até a tela de **Extrato**.
3. Defina o período desejado.
4. Procure a opção **Exportar**, **Salvar como** ou **Baixar extrato**.
5. Selecione **OFX** (muitas vezes identificado como *"Money / Quicken / OFX"*), **PDF** ou **CSV**.
6. No **CashBank**, importe o arquivo na conta correspondente.

---

## 🛡️ Anti-Duplicação Inteligente

Você **pode importar o extrato do mesmo mês quantas vezes quiser** (por exemplo, semanalmente ou sempre que fizer uma nova movimentação).

O CashBank possui um sistema de detecção única de movimentações:
* Compara o código identificador bancário (`FITID`) e a assinatura digital da transação;
* Se uma movimentação já existir no sistema, ela é **automaticamente ignorada**;
* Apenas os novos lançamentos são inseridos, mantendo seu extrato e saldo 100% corretos sem duplicações.

---

## ✏️ Ajuste Manual de Saldo

Caso você queira informar ou corrigir o saldo de uma conta a qualquer momento sem precisar importar um novo arquivo:
1. No card da conta bancária, clique no botão **Editar Conta** (ícone de lápis ✏️);
2. Altere o campo **Saldo Atual (R$)** para o valor exato que você tem no banco;
3. Clique em **Salvar Alterações**. O CashBank atualizará o saldo imediatamente!

---

## ❓ Perguntas Frequentes (FAQ)

### Posso cadastrar mais de uma conta do mesmo banco?
Sim! Você pode cadastrar quantas contas desejar (por exemplo, "Nubank Pessoal", "Nubank Jurídica", "Inter Poupança", etc.).

### Como funciona o card "Saldo em conta" na Visão Geral?
O card **Saldo em conta** soma exatamente os saldos de todas as suas contas bancárias cadastradas. Caso você ainda não tenha nenhuma conta bancária cadastrada, o card fica oculto para manter o visual limpo.

### Meus extratos são compartilhados com alguém?
Não. Todos os extratos e transações são restritos à sua conta de usuário (multi-usuário isolado) e protegidos pelo banco de dados do CashBank.
