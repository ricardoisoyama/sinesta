# PRÉ REQUISITO: CADASTRO DE MOVIMENTAÇÃO

- ID: SUP-A-365
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > INTERCÂMBIO BANCÁRIO > PRÉ REQUISITOS > PRÉ REQUISITO: CADASTRO DE MOVIMENTAÇÃO
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-365
- Anexos (não baixados): image-20230531-174415.png; image-20230531-174310.png; image-20230531-174040.png; image-20221128-190320.png

---

## 🗒 INTRODUÇÃO

Para realizar emissão de um CNAB DE REMESSA de Intermcâbio bancário, é necessário seguir pré requisitos que o banco solicita na integração. Neste manual, veremos sobre cadastro da movimentação.

* * *

## 📔 PASSO A PASSO

Uma movimentação pode ter 1 ou mais parcelas. Cada parcela de uma movimentação será tratada de forma separada.

### 1️⃣ **CADASTRO DE MOVIMENTAÇÃO**

![](image-20230531-174040.png)

Campos necessários:

* **EMPRESA:** empresa que deseja realizar os pagamentos.
* **CLIENTE/ FORNECEDOR/ CREDOR:** empresa ou pessoa que irá receber o pagamento. Caso o **CREDOR** esteja preenchido, será enviado o pagamento para ele.
* **DATA:** data de vencimento do pagamento ou boleto.
* **CARTEIRA:** indique a carteira cadastrada na etapa anterior.
* **CÓDIGO DIGITÁVEL DE PAGAMENTO:** caso o pagamento seja por boleto, conta de consumo, imposto por código de barras ou PIX QRCode, é necessário o preenchimento.

Insira todos os dados antes de gerar as parcelas. Caso precise alterar algum campo, certifique-se que as informações da movimentação foram atualizadas nas parcelas.

Caso precise editar o serviço e lançamento de uma parcela específica, basta dar dois cliques na linha e salvar a movimentação:

![](image-20230531-174415.png)

### 2️⃣ OPÇÕES DA MOVIMENTAÇÃO

Na aba de **OPÇÕES** é possível indicar o serviço e o lançamento para aquele pagamento. Esses dois campos também constam no cliente/ credor e na carteira

![](image-20230531-174310.png)

A prioridade será: **movimentação** → **pessoa** → **carteira**. Ou seja, caso um ou os dois campos estejam vinculados com a **PARCELA**, será enviado o serviço e/ou lançamento da parcela, e não os que estão cadastrados na pessoa.

Após vincular a movimentação a um intercâmbio bancário e emiti-lo, não será possível sua edição, a não ser que o banco retorne um erro, o intercâmbio seja cancelado ou o usuário retire a movimentação do intercâmbio.

* * *

## ❓ FAQ


