# 🗒️ Aviso de Vencimento de Fatura

- ID: PO-A-168
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🗒️ Aviso de Vencimento de Fatura
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-168

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `Invoice__NotifyBeforeMaturity`
* **EXPORTÁVEL:** <font color="Red">**NÃO**</font>
* **ROTINA DE APOIO:** <font color="Red">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Green">**SIM**</font>
* **MÉTODO DE ENVIO:** Email, FTP ou Mensageiro
* **LIMITE PADRÃO:** 50 execuções por hora

---

# ❓ O QUE FAZ ESTA REGRA?

Esta regra providencia uma forma de avisar os contatos do cliente o vencimento da fatura.

---

## 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Esta automação exige 1 configurações primordiais:

* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span><span style="color:red;"></span> </font><font color="Purple">**\[ LISTA \]**</font> `warning_in`: Lista numérica contendo os dias em que devem ser enviados os avisos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span>  `status`: \> Realiza a filtragem da parcela com base no status. Utilize: `0 - Cadastrado` ou `3 - Emitido`.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span>  `operation_id`: \> Realiza o filtro com base no ID da operação.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span>  `costcenter_id`: \> Realiza o filtro com base no ID do centro de custo.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span>  `customer_id`: \> Realiza o filtro com base no ID do cliente.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span>  `wallet_id`: \> Realiza o filtro com base no ID da carteira.

  

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Você também pode usar o parâmetro de nomenclatura disponível em* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#configuracao-padrao-de-nomenclatura).*
