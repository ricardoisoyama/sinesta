# 🔗 Disparo de Webhook Personalizado

- ID: PO-A-153
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🔗 Disparo de Webhook Personalizado
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-153
- Anexos (não baixados): image.png

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `General__FireWebhook`
* **EXPORTÁVEL:** <font color="Red">**NÃO**</font>
* **ROTINA DE APOIO:** <font color="Green">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Red">**NÃO**</font>
* **MÉTODO DE ENVIO:** *[Deixar o campo como OUTRO]*
* **LIMITE PADRÃO:** 50 execuções por hora
* **VERSÃO:** Preencher com o método de disparo, podendo ser um dos seguintes:
  * `GET`
  * `POST` *(padrão, se não for informado)*
  * `PUT`
  * `PATCH`
  * `DELETE`
  * `OPTIONS`

---

# ❓ O QUE FAZ ESTA REGRA?

Esta regra serve exclusivamente para ser utilizada através de um **GATILHO**. Ao ser ativada, a automação dispara o *payload* de um gatilho automaticamente para um endpoint configurado nesta automação. Desta forma, a aplicação externa que receberá este *payload* pode realizar trabalhos reativos à ação de usuários no sistema.

Alguns casos de uso são:

* Depois de cancelar um CT-e, deve-se disparar o *payload* de sucesso de cancelamento para um *endpoint* externo que realiza algumas regras de negócio adicionais.
* Depois de cadastrar uma NF-e, deve-se disparar uma automação que realiza o envio de um e-mail para a operação, avisando que uma nova nota fiscal chegou.
* Depois de emitir uma Fatura, deve-se disparar o DOCCOB automaticamente para os e-mails configurados.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Abaixo, segue a relação de parâmetros da automação que podem ser configurados dentro da aba **CONFIGURAÇÕES**, explicando como deve ser feito o preenchimento de cada um deles:

* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span></font> `url`: URL de recebimento do disparo.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `timeout`: Campo inteiro contendo o *timeout* padrão para aguardar uma resposta do servidor que recebeu o disparo. Se não for definido, o padrão adotado é **10 segundos**.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ LISTA \]**</font> `headers` Lista de cabeçalhos para serem enviados na requisição do disparo. Usar a `chave` para informar o nome do cabecalho e o `valor` para informar o dado que será enviado no cabeçalho.

![](image.png)
