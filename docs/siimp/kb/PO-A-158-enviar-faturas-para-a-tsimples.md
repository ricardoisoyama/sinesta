# 🔗 Enviar Faturas para a TSimples

- ID: PO-A-158
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🔗 Enviar Faturas para a TSimples
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-158

---

# 📚 DETALHES PRINCIPAIS

* **TIPO DA REGRA:** `Invoice__SendInvoiceToTSimples`
* **EXPORTÁVEL:** <span style="color:red;"></span><span style="color:red;">**NÃO**</span>
* **ROTINA DE APOIO:** <span style="color:darkgreen;"></span><span style="color:darkgreen;">**SIM**</span>
* **SUPORTA FILTROS EM TELA:** <span style="color:darkgreen;"></span><span style="color:darkgreen;">**SIM**</span>
* **MÉTODO DE ENVIO:** *\[Deixar o campo como OUTRO\]*
* **LIMITE PADRÃO:** 50 a cada 5 minutos
* **VERSÃO:** *\[Deixar o campo vazio\]*
* **INTEGRAÇÃO CONFIGURADA:** PO-A-110

---

# ❓ O QUE FAZ ESTA REGRA?

Executa uma automação que captura os dados necessários das **Faturas** para a comunicação com a integradora TSimples que recebe esses dados e realiza o processamento.

A automação busca por **Faturas** que estejam <u>emitidas</u> a partir da data de execução da automação.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

> *<span style="color:darkorange;">**ATENÇÃO:**</span> Os filtros precisam ser preenchidos na coluna **VALOR**, mantendo o campo **CHAVE** em branco.*

* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ LISTA \]**</font> `owner_id`: Lista de códigos de empresas que deverão ser considerados para filtrar os documentos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ LISTA \]**</font> `customer_id`: Lista de códigos de clientes que deverão ser considerados para filtrar os documentos.
