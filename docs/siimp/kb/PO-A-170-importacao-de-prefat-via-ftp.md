# 🗒️ Importação de PREFAT via FTP

- ID: PO-A-170
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🗒️ Importação de PREFAT via FTP
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-170

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `Invoice__ImportPrefatFromFtp`
* **EXPORTÁVEL:** <font color="Red">**NÃO**</font>
* **ROTINA DE APOIO:** <font color="Green">**SIM**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Red">**NÃO**</font>
* **MÉTODO DE ENVIO:** FTP
* **LIMITE PADRÃO:** 50 execuções por hora
* **VERSÃO:** Selecionar o layout de PREFAT a ser lido *(ex.: `PR3M50`)*

---

# ❓ O QUE FAZ ESTA REGRA?

Realiza a leitura dos arquivos **PREFAT** *(pré-fatura)* disponibilizados pelo embarcador em uma pasta de FTP ou SFTP, e importa cada um deles para dentro do sistema, criando as faturas com status **CADASTRADA**, da mesma forma que a importação manual feita no módulo **FATURAMENTO**, através da opção **UPLOAD → PREFAT**.

Para cada arquivo encontrado na pasta, a regra:

1️⃣ Valida o arquivo, aplicando as mesmas regras da importação manual: somente arquivos com extensão `.txt` e com, no máximo, 5 MB são aceitos.

2️⃣ Lê o conteúdo do arquivo de acordo com o layout informado no campo **VERSÃO** da automação.

3️⃣ Cria as faturas correspondentes aos CT-es listados no arquivo, em nome da empresa transportadora do usuário da automação.

4️⃣ Move o arquivo importado para a pasta informada no parâmetro `move_to`, evitando que ele seja importado novamente na próxima execução.

Cada arquivo é processado de forma *independente*. Se um arquivo apresentar qualquer erro *(layout inválido, CT-e não encontrado, divergência de valores, entre outros)*, nenhuma fatura daquele arquivo é criada, o arquivo *permanece na pasta de leitura* e o motivo do erro é registrado no histórico da automação. Os demais arquivos da pasta seguem sendo importados normalmente.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Os dados de acesso ao servidor devem ser preenchidos na aba **FTP** da automação. Para esta regra, eles indicam de onde os arquivos serão *lidos*, e não para onde serão enviados:

* <span style="color:Red;">**\[ OBRIGATÓRIA \]**</span> **TIPO:** Selecionar **FTP** ou **SFTP**, conforme o servidor disponibilizado pelo embarcador.
* <span style="color:Red;">**\[ OBRIGATÓRIA \]**</span> **HOST:** Endereço do servidor.
* <span style="color:Red;">**\[ OBRIGATÓRIA \]**</span> **USUÁRIO:** Usuário de acesso ao servidor.
* <span style="color:Red;">**\[ OBRIGATÓRIA \]**</span> **SENHA:** Senha de acesso ao servidor.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> **PORTA:** Se não for informada, será considerada a porta `21` para FTP e `22` para SFTP.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> **PASTA DE DESTINO (ROOT):** Pasta onde o embarcador deposita os arquivos PREFAT. É nela que a automação fará a leitura. Se não for informada, será lida a pasta inicial do usuário no servidor.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> **PASSIVO:** Marcar quando o servidor exigir conexão em modo passivo. Utilizado somente em conexões FTP.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> **SSL:** Marcar quando o servidor exigir conexão segura *(FTPS)*. Utilizado somente em conexões FTP.

Abaixo, segue a relação de parâmetros da automação que podem ser configurados dentro da aba **CONFIGURAÇÕES**, explicando como deve ser feito o preenchimento de cada um deles:

* <span style="color:Red;">**\[ OBRIGATÓRIA \]**</span> `move_to`: Pasta para onde os arquivos importados com sucesso serão movidos. O caminho é *relativo à pasta de leitura (ROOT)*, ou seja, ao informar `importados`, os arquivos serão movidos para a subpasta `importados` dentro da pasta de leitura. Se a pasta não existir no servidor, ela será criada automaticamente. Caso este parâmetro não seja informado, a automação *não fará a leitura da pasta* e registrará o erro no histórico, pois sem ele os mesmos arquivos seriam importados novamente em todas as execuções.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]** </span> `timeout`: Campo numérico contendo o tempo máximo, em segundos, de espera pela conexão SFTP. Por padrão, será considerado o valor de 30 segundos.

> <span style="color:dodgerblue;">***DICA:***</span> Somente os arquivos que estão diretamente na pasta de leitura são considerados. Subpastas, inclusive a própria pasta do\* `move_to`*, são ignoradas.*

---

# 🧑‍💻 ACIONAMENTO VIA ROTINA DE APOIO

Além do agendamento configurado na automação, a leitura pode ser acionada manualmente pelo usuário através de uma **ROTINA DE APOIO** liberada no módulo **FATURAMENTO**. Ao executar a rotina, o sistema aciona todas as automações de importação de PREFAT via FTP cadastradas para a empresa.

> * <span style="color:Red;">**ATENÇÃO:** </span>*Diferente de outras rotinas de apoio, esta rotina não realiza a importação no mesmo momento. Ela coloca as automações na fila de execução, e o resultado da importação de cada arquivo pode ser acompanhado no histórico da automação. Caso a automação já esteja na fila, acionar a rotina novamente não gera uma segunda leitura.*

---

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Você também pode usar o parâmetro de nomenclatura disponível em* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#configuracao-padrao-de-nomenclatura).*
