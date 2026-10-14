# PRÉ REQUISITO: CADASTRO DE PESSOA

- ID: SUP-A-367
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > INTERCÂMBIO BANCÁRIO > PRÉ REQUISITOS > PRÉ REQUISITO: CADASTRO DE PESSOA
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-367
- Anexos (não baixados): image-20221229-124831.png; pessoa-banco.png; pessoa-parametros.png; tela-carteira.png; image-20230531-171734.png

---

## 🗒 INTRODUÇÃO

Para realizar emissão de um CNAB DE REMESSA de Intermcâbio bancário, é necessário seguir pré requisitos que o banco solicita na integração. Neste manual, veremos sobre cadastro de pessoa.

* * *

## 📔 PASSO A PASSO

A pessoa será o cliente/ credor que irá receber o pagamento. **Caso o pagamento seja via transferência ou PIX transferência, é necessário o cadastro na aba conta bancária.**

### 1️⃣ **Aba de Parâmetros**:

![](pessoa-parametros.png)

### 2️⃣ **Aba de Contas Bancárias:**

![](pessoa-banco.png)

➡️ **Campos necessários:**

* **SERVIÇO:** Código adotado pela FEBRABAN para indicar o tipo de serviço/ produto contido no arquivo/ lote da remessa. Hoje no sistema as opções são:

  * **Pagamento Fornecedor**: pagamento via transferência ou boleto para o fornecedor.
  * **Pagamento de Contas, Tributos e Impostos**: pagamento de contas de consumo e tributos com código de barras.
  * **Pagamento Salários**: pagamento de salários via transferência ou cartão salário. 
  * **Pagamento de honorários**: pagamento de honorários via transferência.
  * **Pagamento de bolsa auxílio**: pagamento de bolsa auxílio via transferência. 

* **LANÇAMENTO:** Código adotado pela FEBRABAN para identificar a operação que está contida no lote da remessa. Hoje no sistema as opções são:

  * Crédito em Conta Corrente;
  * Cartão Salário;
  * Crédito em Conta Poupança;
  * Pagamento de Contas e Tributos com Código de Barras;
  * Liquidação de Títulos do Próprio Banco;
  * Pagamento de Títulos de Outros Bancos;
  * DOC - Outra Titularidade;
  * DOC - Mesma Titularidade;
  * TED - Outra Titularidade;
  * TED - Mesma Titularidade;

### 3️⃣ Serviços homologados em cada banco:

| **Serviço** | **Lançamento Bradesco** | **Lançamento Itaú** |
| - | - | - |
| 20 - Pagamento Fornecedor | * Crédito em Conta Corrente<br/>* Crédito em Conta Poupança<br/>* Liquidação de Títulos do Próprio Banco<br/>* Pagamento de Títulos de Outros Bancos<br/>* DOC – Mesma Titularidade<br/>* DOC – Outra Titularidade<br/>* TED – Outra Titularidade<br/>* TED – Mesma Titularidade | * Crédito em Conta Corrente<br/>* Crédito em Conta Poupança<br/>* Pagamento de Contas e Tributos com Código de Barras (menos FGTS)<br/>* Liquidação de Títulos do Próprio Banco<br/>* Pagamento de Títulos de Outros Bancos<br/>* DOC – Mesma Titularidade<br/>* DOC – Outra Titularidade<br/>* TED – Outra Titularidade<br/>* TED – Mesma Titularidade<br/>* PIX - Transferência<br/>* PIX - QR Code |
| 22 - Pagamento de Contas, Tributos e Impostos | * Pagamento de Contas e Tributos com Código de Barras<br/><span style="color: rgb(255,86,48);">(atualmente apenas para contas de consumo. </span> <span style="color: rgb(255,86,48);">Bradesco ainda </span>**<span style="color: rgb(255,86,48);">não </span>**<span style="color: rgb(255,86,48);">possui pagamento de tributos integrado)</span> | * Darf<br/>* GPS<br/>* Darf Simples<br/>* IPTU Prefeituras<br/>* Gare SP ICMS<br/>* IPVA<br/>* DPVAT<br/>* FGTS<br/>* GNRE |
| 30 - Pagamento Salários<br/>33 - Pagamento de bolsa auxílio<br/><span style="color: rgb(255,86,48);">(não homologado)</span> | * Crédito em Conta Corrente<br/>* Cartão Salário | * Crédito em Conta Corrente<br/>* Cartão Salário |
| 32 - Pagamento de honorários<br/><span style="color: rgb(255,86,48);">(não homologado)</span> | * Crédito em Conta Corrente | * Crédito em Conta Corrente |



Caso a pessoa tenha duas ou mais contas bancárias, será sempre considerada a primeira.

note

Para cada tipo de serviço, são aceitos determinados lançamentos, conforme tabela acima. Importante observar que no caso de contas de consumo (concessionárias), o Bradesco enquadra no **Serviço 22** e o Itaú no **Serviço 20**.



### 4️⃣ Configuração do PIX

Formatação das chaves PIX:

![](image-20221229-124831.png)note

Para pagamentos via *PIX transferência*, é necessário cadastrar na conta bancária da pessoa o **número do PIX** e a **Identificação**: Celular, E-mail, CPF, CNPJ ou Chave Aleatória.

Para pagamentos via **PIX QR Code**, é necessário informar a **URL** sem o https&#x3A;// ou a **chave de endereçamento** na linha da parcela dentro da movimentação.





* * *

## ❓ FAQ


