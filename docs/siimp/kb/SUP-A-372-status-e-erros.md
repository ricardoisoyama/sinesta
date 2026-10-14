# STATUS E ERROS

- ID: SUP-A-372
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > INTERCÂMBIO BANCÁRIO > INTERCAMBIO BANCÁRIO, O QUE É? > STATUS E ERROS
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-372

---

## 🗒 INTRODUÇÃO

Neste manual veremos os status dos intercâmbios e erros que podem acontecer com suas soluções.

* * *

## :check_mark: STATUS

O módulo possui 4 status:

* **CADASTRADO**: primeira etapa, onde os **dados da movimentação e do intercâmbio podem ser alterados** e nenhum arquivo de remessa foi gerado.
* **EMITIDO:** ao clicar no botão **SALVAR E EMITIR**, um arquivo de remessa é gerado. Ainda é possível realizar o cancelamento nessa etapa, até o momento do primeiro download.
* **FINALIZADO**: quando todas as movimentações possuem um retorno do banco de **LIQUIDADO** ou **ERRO**, o intercâmbio bancário é considerado processado e finalizado. Caso a movimentação tenha retornado com erro, ela será liberada para adicionar em outro intercâmbio.
* **CANCELADO**: ao cancelar, as movimentações são desvinculadas e nada mais é possível fazer com esse intercâmbio.

* * *

## ⛔ ERROS

Possíveis erros e como resolver:

| **Erro** | **Descrição** | **Solução** |
| - | - | - |
| `Erro: O valor selecionado para o campo identificador_carteira é inválido.` | A carteira não está salva no Baratheon. | Salve a carteira e tente emitir novamente. Verifique se ela está cadastrada no SM. |
| `Erro: Layout CNAB não integrado.` | Hoje apenas o layout 240 é aceito. | Mudar na carteira o CNAB PAGAMENTO para 240. |
| `Erro: Banco não integrado.` | Hoje apenas os bancos Bradesco e Itaú são aceitos. | Selecionar uma carteira onde o banco é Bradesco ou Itaú. |
| `Erro: É necessário preencher o convênio na carteira!` | Código de convênio para pagamentos entre banco e empresa.<br/>Obs: existem 2 convênios na carteira. | Adicionar na carteira o CONVÊNIO DE PAGAMENTO.<br/>Obs: para Itaú, preencher com qualquer número. |
| `Erro: Nenhuma movimentação a pagar cadastrada, da mesma carteira e que não esteja em outro intercâmbio foi encontrada!` | Verificar:<br/>* A movimentação é **A Pagar**<br/>* A movimentação não está em outro intercâmbio<br/>* A parcela selecionada está com a mesma carteira do intercâmbio (a movimentação pode estar com carteira diferente da parcela)<br/>* A parcela está como **cadastrada** | |

* * *

## ❓ FAQ


