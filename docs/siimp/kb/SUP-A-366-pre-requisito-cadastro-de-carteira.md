# PRÉ REQUISITO: CADASTRO DE CARTEIRA

- ID: SUP-A-366
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > INTERCÂMBIO BANCÁRIO > PRÉ REQUISITOS > PRÉ REQUISITO: CADASTRO DE CARTEIRA
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-366
- Anexos (não baixados): image-20230531-171734.png; tela-carteira.png

---

## 🗒 INTRODUÇÃO

Para realizar emissão de um CNAB DE REMESSA de Intermcâbio bancário, é necessário seguir pré requisitos que o banco solicita na integração. Neste manual, veremos sobre cadastro da carteira.

* * *

## 📔 PASSO A PASSO

A carteira será a principal informação enviada para emitir o arquivo de remessa. É através dela que será informado os dados da empresa e os dados bancários.

Assim que o usuário **SALVAR** a carteira, será enviada uma requisição de cadastro ou atualização:

![](image-20230531-171734.png)

Campos necessários:

* **EMPRESA:** empresa que deseja realizar os pagamentos.
* **BANCO:** banco que irá efetuar os pagamentos.
* **AGÊNCIA E CONTA:** agência bancária e conta que irá efetuar os pagamentos.
* **CONVÊNIO DE PAGAMENTO\*:** código de contrato entre a empresa e o banco.
* **CNAB PAGAMENTO:** layout do arquivo de remessa e retorno (240 ou 400).

\*O Convênio atualmente é exigido apenas para o **BRADESCO**.

Todas as movimentações do intercâmbio bancário precisam ser da mesma carteira.

* * *

## ❓ FAQ


