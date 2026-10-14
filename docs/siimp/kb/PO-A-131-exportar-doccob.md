# 🗒️ Exportar DOCCOB

- ID: PO-A-131
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🗒️ Exportar DOCCOB
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-131

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `Invoice__ExportDoccob`
* **EXPORTÁVEL:** <font color="Green">**SIM**</font>
* **ROTINA DE APOIO:** <font color="Red">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Red">**NÃO**</font>
* **MÉTODO DE ENVIO:** E-mail ou FTP
* **LIMITE PADRÃO:** 50 execuções por hora
* **VERSÃO:** Selecionar o DOCCOB desejado para exportação

---

# ❓ O QUE FAZ ESTA REGRA?

Realiza a geração de um arquivo DOCCOB para cada fatura com status <font color="Green">EMITIDA</font> dentro do sistema.
Serão pesquisadas faturas com data de emissão posterior à data "a partir de" da automação.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Abaixo, segue a relação de parâmetros da automação que podem ser configurados dentro da aba **CONFIGURAÇÕES**, explicando como deve ser feito o preenchimento de cada um deles:

* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span> </font><font color="Purple">**\[ LISTA \]**</font> `clients`: Lista de códigos de clientes que deverão ser considerados para filtrar os resultados que farão parte do arquivo a ser gerado. É necessário a existência de, pelo menos, um código dentro da lista.
* <font color="Blue"><span style="color:dodgerblue;">**\[ OPCIONAL \]**</span></font> `owner_id`: Campo numérico contendo o código da empresa transportadora. *Quando informado, o sistema irá considerar faturas que foram emitidas somente pela empresa marcada neste parâmetro*. Por padrão, se não for informado, o sistema capturará faturas de todas as empresas do grupo.

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Você também pode usar o parâmetro de nomenclatura disponível em* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#configuracao-padrao-de-nomenclatura).*

*Adicionalmente às opções já listadas na documentação mencionada no link acima, você também pode utilizar a seguinte opção:*

| **VALOR** | **SIGNIFICADO** |
| --- | --- |
| [[invoice_number]] | Número da fatura exportada no arquivo |

