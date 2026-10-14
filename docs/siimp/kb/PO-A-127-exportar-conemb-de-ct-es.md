# 🗒️ Exportar CONEMB de CT-es

- ID: PO-A-127
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > 🗒️ Exportar CONEMB de CT-es
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-127
- Filhos: PO-A-171 🗒️ Exportar CONEMB de Minutas

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `Cte__ExportConemb`
* **EXPORTÁVEL:** <font color="Green">**SIM**</font>
* **ROTINA DE APOIO:** <font color="Red">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Red">**NÃO**</font>
* **MÉTODO DE ENVIO:** E-mail ou FTP
* **LIMITE PADRÃO:** 50 execuções por hora
* **VERSÃO:** Selecionar o CONEMB desejado para exportação

---

# ❓ O QUE FAZ ESTA REGRA?

Realiza a geração de um arquivo CONEMB feito à partir de CT-es emitidos dentro do sistema.

* CT-es que estiverem com status **\[ CADASTRADO \]**, <font color="Red">**\[ CANCELADO \]**</font> ou <span style="color:darkorange;"></span><span style="color:darkorange;">**\[ INUTILIZADO \]**</span><font color="Yellow"><span style="color:darkorange;"></span></font> serão ignorados automaticamente.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Abaixo, segue a relação de parâmetros da automação que podem ser configurados dentro da aba **CONFIGURAÇÕES**, explicando como deve ser feito o preenchimento de cada um deles:

* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span> </font><font color="Purple">**\[ LISTA \]**</font> `clients`: Lista de códigos de clientes que deverão ser considerados para filtrar os resultados que farão parte do arquivo a ser gerado. É necessário a existência de, pelo menos, um código dentro da lista.
* <font color="Blue"><span style="color:dodgerblue;">**\[ OPCIONAL \]**</span></font> `owner_id`: Campo numérico contendo o código da empresa transportadora. *Quando informado, o sistema irá considerar CT-es que foram emitidos somente pela empresa marcada neste parâmetro*. Por padrão, se não for informado, o sistema capturará CT-es de todas as empresas do grupo.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `origin_uf`: A automação deverá considerar CT-es que foram emitidos somente onde a *UF de origem for igual ao valor informado*.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> `destination_uf`: A automação deverá considerar CT-es que foram emitidos somente onde a *UF de destino for igual ao valor informado*.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span><span style="color:dodgerblue;"></span> `date_emission`: A automação deverá pesquisar CT-es de acordo com a data emissão ou data de autorização.

  | **VALOR** | **SIGNIFICADO** |
  | --- | --- |
  | 0 | Data de Emissão (valor padrão) |
  | 1 | Data da Autorização |
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ PODE SER UMA LISTA \]**</font> `category1_id`: A automação deverá considerar CT-es que contém o campo **CATEGORIA 1** preenchido com um dos códigos informados. Pode ser preenchido com um ou vários códigos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ PODE SER UMA LISTA \]**</font> `category2_id`: A automação deverá considerar CT-es que contém o campo **CATEGORIA 2** preenchido com um dos códigos informados. Pode ser preenchido com um ou vários códigos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ PODE SER UMA LISTA \]**</font> `category3_id`: A automação deverá considerar CT-es que contém o campo **CATEGORIA 3** preenchido com um dos códigos informados. Pode ser preenchido com um ou vários códigos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ PODE SER UMA LISTA \]**</font> `operation_id`: A automação deverá considerar CT-es que contém o campo **OPERAÇÃO** preenchido com um dos códigos informados. Pode ser preenchido com um ou vários códigos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ PODE SER UMA LISTA \]**</font> `costcenter_id`: A automação deverá considerar CT-es que contém o campo **CENTRO DE CUSTO** preenchido com um dos códigos informados. Pode ser preenchido com um ou vários códigos.

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Você também pode usar o parâmetro de nomenclatura disponível em* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#configuracao-padrao-de-nomenclatura).*
