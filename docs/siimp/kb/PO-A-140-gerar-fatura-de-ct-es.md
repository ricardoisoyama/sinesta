# ⏲️ Gerar Fatura de CT-es

- ID: PO-A-140
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > ⏲️ Gerar Fatura de CT-es
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-140

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `Cte__GenerateInvoice`
* **EXPORTÁVEL:** <font color="Red">**NÃO**</font>
* **ROTINA DE APOIO:** <font color="Red">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Green">**SIM**</font>
* **MÉTODO DE ENVIO:** *\[Deixar o campo como OUTRO\]*
* **LIMITE PADRÃO:** 50 execuções por minuto
* **VERSÃO:** *\[Deixar o campo vazio\]*

---

# ❓ O QUE FAZ ESTA REGRA?

Gera uma ou mais faturas de acordo com os CT-es emitidos disponíveis em **FISCAL → CT-E 3.00**.

Todos os CT-es são elegíveis para gerar uma fatura, <u>*EXCETO SE*</u>:

* Já estiverem em outra fatura no sistema.
* O status do CT-e estiver como **\[ CADASTRADO \]**, <font color="Red">**\[ CANCELADO \]**</font> ou <span style="color:darkorange;"></span><span style="color:darkorange;">**\[ INUTILIZADO \]**</span>.
* O tipo do CT-e for **ANULAÇÃO**.
* O CT-e foi substituído.

*Se uma das condições se aplicar à um CT-e, ele não será selecionado pela regra de execução ao gerar uma fatura*, visto que CT-es com características acima não podem ser vinculados à uma fatura.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Abaixo, segue a relação de parâmetros da automação que podem ser configurados dentro da aba **CONFIGURAÇÕES**, explicando como deve ser feito o preenchimento de cada um deles:

* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ LISTA \]**</font> `clients`: Lista de códigos de clientes que deverão ser considerados para filtrar os resultados de CT-es que gerarão faturas. Lembrando que, caso o CT-e esteja vinculado a uma programação de carga e essa programação tenha um consignatário, a automação fará a busca do documento com base no consignatário; caso contrário, fará a busca com base no tomador do CT-e.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `grouping_type`: Informar qual é o tipo de agrupamento que os CT-es deverão formar para gerar as faturas. Usar um dos valores da tabela abaixo *(será considerado o valor padrão, caso não seja informado, ou informado incorretamente)*:

| **VALOR** | **SIGNIFICADO** | **EXEMPLO** |
| --- | --- | --- |
| <span style="background-color:#e3fcef;" class="full-cell-size">0</span> | <span style="background-color:#e3fcef;" class="full-cell-size">Individual *(valor padrão)*</span> | <span style="background-color:#e3fcef;" class="full-cell-size">Cada CT-e irá gerar uma fatura</span> |
| 1 | Por Tomador | Os CT-es serão agrupados por tomadores. Cada conjunto irá gerar uma fatura. |
| 2 | Por Tomador e Perfil de Faturamento | Os CT-es serão agrupados por tomadores e perfis de faturamento. Cada conjunto irá gerar uma fatura. |
| 3 | Por Tomador e Centro de Custos | Os CT-es serão agrupados por tomadores e centro de custos. Cada conjunto irá gerar uma fatura. |

* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `wallet_id`: Campo numérico contendo o código da carteira que deverá ser considerada para geração da fatura. Se não for informado, o sistema irá identificar a carteira vinculada ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhuma carteira for encontrada, um erro será logado no histórico.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `payment_form`: Informar qual é a forma de pagamento que deverá ser considerada para geração da fatura. Se não for informado, o sistema irá identificar a forma de pagamento vinculada ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhuma forma de pagamento for encontrada, um erro será logado no histórico. Usar um dos valores da tabela abaixo:

| **VALOR** | **SIGNIFICADO** |
| --- | --- |
| <span style="background-color:#ffffff;" class="full-cell-size">1</span> | <span style="background-color:#ffffff;" class="full-cell-size">DINHEIRO</span> |
| 2 | CHEQUE |
| 3 | TRANSFERÊNCIA |
| 4 | DEPÓSITO |
| 5 | CARTÃO |
| 6 | BOLETO |
| 7 | DÉBITO EM CONTA |
| 8 | PIX |

* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `maturity`: Vencimento que deverá ser considerado para a geração das faturas. Este é um campo de data relativa. Para isso, verifique a formatação correta de inserção deste parâmetro em [🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#parametros-de-datas-de-formatos-relativos). Se não for informado, o sistema irá identificar o vencimento vinculado ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhum tipo de período for encontrado, será considerado como *amanhã*.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `plots`: Campo numérico maior ou igual a 1 que informa qual é a quantidade de parcelas que deverá ser considerada para geração da fatura. Se não for informado, o sistema irá identificar a quantidade de parcelas vinculada ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhuma quantidade de parcelas for encontrada, um erro será logado no histórico.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `period`: Campo numérico maior ou igual a 1. Período que deverá ser considerada para a geração das parcelas da fatura. Usar em conjunto com o parâmetro `period_type`. Se não for informado, o sistema irá identificar o período vinculado ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhum período for encontrado, um erro será logado no histórico.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `period_type`: Tipo de período que deverá ser considerado para a geração das parcelas da fatura. Se não for informado, o sistema irá identificar o tipo de período vinculado ao perfil de faturamento do primeiro CT-e do agrupamento. Se ainda assim nenhum tipo de período for encontrado, um erro será logado no histórico. Usar um dos valores da tabela abaixo *(será considerado o valor padrão, caso não seja informado, ou informado incorretamente)*:

| **VALOR** | **SIGNIFICADO** |
| --- | --- |
| <span style="background-color:#e3fcef;" class="full-cell-size">1</span> | <span style="background-color:#e3fcef;" class="full-cell-size">MESES *(valor padrão)*</span> |
| 0 | DIAS |

