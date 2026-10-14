# Intercâmbio Bancário

- ID: PO-A-894
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > Intercâmbio Bancário
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-894
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_filtros.png; 03_logs_retorno.png; 04_form_novo.png; 05_selecionar.png; 06_parcelas.png; 07_selecao_rodape.png; 08_salvo.png; 09_historico.png; 10_erro_emitir.png; 99_rodape.png

---

![Intercâmbio Bancário](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

O **INTERCÂMBIO BANCÁRIO** envia ao banco, num único arquivo, os pagamentos que a empresa precisa fazer. Assim o financeiro não lança cada pagamento à mão no internet banking.

O objetivo é juntar as parcelas a pagar de uma carteira, gerar o arquivo de remessa no padrão FEBRABAN *(CNAB 240 ou 400)* e depois ler o retorno do banco para baixar os pagamentos. A remessa aceita transferência, boleto, conta de consumo, PIX e tributos.

Quem usa é o contas a pagar. A tela depende da **CARTEIRA** configurada em **EMPRESA -> CARTEIRAS -> PARÂMETROS -> INTERCÂMBIO BANCÁRIO** e das movimentações a pagar de **FINANCEIRO -> MOVIMENTAÇÕES**.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela lista os intercâmbios bancários e permite criar, emitir, exportar e cancelar cada um, além de importar e consultar os arquivos de retorno. Caminho de menu: **FINANCEIRO -> OPÇÕES BANCÁRIAS -> INTERCÂMBIO BANCÁRIO**.

Cada intercâmbio passa pelos status **CADASTRADO**, **EMITIDO**, **FINALIZADO** e **CANCELADO**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O acesso depende da permissão **INTERCÂMBIO BANCÁRIO**, na aba **FINANCEIRO** das permissões do usuário.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra os intercâmbios da empresa selecionada, dos mais recentes para os mais antigos.

![Listagem do Intercâmbio Bancário](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário de um novo intercâmbio. | Sempre. |
| ❷ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❸ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❹ | **ARQUIVO DE RETORNO** | Importa um ou mais arquivos de retorno enviados pelo banco. O sistema mostra quantos pagamentos o arquivo trouxe e quantos não foram processados, e registra o resultado no histórico do intercâmbio. | Sempre. |
| ❺ | **LOGS DE RETORNO** | Abre a janela **ARQUIVOS DE RETORNO**, com os últimos arquivos importados. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❻ | **BUSCAR** | Escolhe a empresa. Vazio, mostra **TODAS AS EMPRESAS**. |
|  | **NÚMERO** | Filtra pelo número do intercâmbio. |
|  | **TODAS AS CARTEIRAS** | Filtra por carteira. |
|  | **TODOS OS STATUS** | Filtra por status: **CADASTRADO**, **EMITIDO**, **FINALIZADO** ou **CANCELADO**. |
|  | Lupa | Aplica os filtros. |
| ❽ | **FILTROS** | Abre o painel lateral com filtros adicionais. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❼ | **CÓDIGO** | Código interno do intercâmbio. |
|  | **NÚMERO** | Número sequencial enviado como número do arquivo de remessa. |
|  | **EMPRESA** | Empresa dona do intercâmbio, com o CNPJ. |
|  | **CARTEIRA** | Código da carteira bancária. |
|  | **STATUS** | Status do intercâmbio, com ícone e cor. |
|  | **DT CRIAÇÃO** | Data e hora em que o intercâmbio foi criado. |

### ▌FILTROS

O painel **FILTROS** ❽ traz mais opções de busca. Preencha e clique em **FILTRAR**.

![Painel de filtros aberto](02_filtros.png){width=100%}

| Nº | Campo | Para que serve |
| :---: | --- | --- |
| ❶ | **NÚMERO (DE)** / **NÚMERO (ATÉ)** | Faixa de números do intercâmbio. |
|  | **CRIADO DE** / **ATÉ** | Período de criação. |

### ▌LOGS DE RETORNO

O botão **LOGS DE RETORNO** ❺ abre a janela **ARQUIVOS DE RETORNO**. Ela lista os arquivos de retorno recebidos, inclusive os de pagamentos que não saíram por este sistema.

![Janela Arquivos de Retorno](03_logs_retorno.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **CÓDIGO BANCO** / **LAYOUT** e lupa | Filtra os arquivos pelo banco e pelo layout. |
| ❷ | **ARQUIVO**, **CRIAÇÃO ARQUIVO**, **DATA UPLOAD**, **CÓD. BANCO**, **BANCO**, **LAYOUT** | Nome do arquivo, data em que o banco o gerou, data da importação e banco/layout. |
| ❸ | **SINCRONIZAR** | Sincroniza a lista com os arquivos processados. |
| ❹ | **FILTROS** | Filtros por período: **UPLOAD DE** / **ATÉ** e **CRIAÇÃO ARQUIVO DE** / **ATÉ**. |

Dois cliques num arquivo abrem os logs de cada pagamento. A coluna **MENSAGEM** mostra a análise do sistema, se encontrou ou não o pagamento. A coluna **MENSAGEM OCORRÊNCIA** traz a ocorrência como veio no arquivo do banco.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Na base usada para este manual não havia arquivos de retorno, por isso a lista aparece vazia.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O botão **NOVO** abre a janela **NOVO INTERCÂMBIO BANCÁRIO**. No cabeçalho você define a carteira e a data de pagamento. Na aba **MOVIMENTAÇÕES** você inclui as parcelas a pagar.

![Formulário de novo intercâmbio](04_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Cabeçalho | **CARTEIRA** | Carteira que define a empresa pagadora e os dados bancários do arquivo. <span style="color:red;">**OBRIGATÓRIO.**</span> Fica bloqueada depois de salvar. |
|  |  | **DATA DE PAGAMENTO** | Data em que o banco deve executar os pagamentos. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **NÚMERO**, **CADASTRO**, **ATUALIZAÇÃO** | Preenchidos pelo sistema ao salvar. |
|  |  | **TIPO REMESSA** | Hoje só existe **PAGAMENTO**. |
|  |  | **STATUS** | **CADASTRADO**, **EMITIDO**, **FINALIZADO** ou **CANCELADO**. |
| ❷ | Aba **MOVIMENTAÇÕES** | **CÓDIGOS** | Códigos das parcelas, para incluir direto. |
|  |  | **SELECIONAR** | Abre a tela **MOVIMENTAÇÕES** na aba **PAGAR** para escolher as parcelas. |
|  |  | **CÓDIGO DIGITÁVEL PAGAMENTO** | Busca a parcela pela linha digitável. |
|  |  | Tipo de data + **DE** / **ATÉ** | Período de busca por **DATA DE CRIAÇÃO**, **DATA DE VENCIMENTO** ou **DATA DE COMPETÊNCIA**. |
|  |  | **CLIENTE/CREDOR** e lupa | Filtra pelo favorecido e inclui as parcelas encontradas. |
| ❸ | Grade | Colunas | **NÚMERO**, **INSTRUÇÃO REMESSA**, **CRIAÇÃO**, **EMPRESA**, **CLIENTE/FORNECEDOR**, **CREDOR**, **VALOR**, **LÍQUIDO**, **VENCIMENTO** e **STATUS**. Ocultas: **CÓD. DIGITÁVEL**, **SERVIÇO** e **LANÇAMENTO**. |
| ❹ | Rodapé | **SALVAR**, **SALVAR & EMITIR**, **EXPORTAR** | Gravação, emissão e download do arquivo. |
| ❺ | Rodapé | **HISTÓRICO**, **CANCELAR**, **FECHAR** | Consulta, cancelamento e saída. |

### ▌INCLUIR PARCELAS

Há duas formas de incluir parcelas:

- **SELECIONAR**: abre a tela **MOVIMENTAÇÕES** na aba **PAGAR**. Dê dois cliques na parcela para trazê-la.
- Busca da aba: informe os **CÓDIGOS** ou um período **DE** / **ATÉ** e clique na lupa. As parcelas encontradas entram na grade.

![Tela Movimentações aberta pelo Selecionar](05_selecionar.png){width=100%}

![Parcelas incluídas pela busca de vencimento](06_parcelas.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Só entram parcelas **APROVADAS** e da mesma carteira do intercâmbio. Sem parcelas aprovadas, aparece "Nenhuma movimentação aprovada foi encontrada para os critérios informados". A aprovação é feita em **MOVIMENTAÇÕES -> APROVAR PARCELAS**.*</span>

### ▌SELECIONAR PARCELAS NA GRADE

Ao marcar uma ou mais parcelas, aparecem novas opções.

![Parcelas selecionadas com os totais do rodapé](07_selecao_rodape.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **REMOVER** | Tira as parcelas selecionadas do intercâmbio. A tecla **DELETE** faz o mesmo. |
| ❷ | **TOTAL**, **TOTAL LÍQUIDO**, **TOTAL PAGO** | Soma das parcelas selecionadas. |
| ❸ | **INSTRUÇÃO PADRÃO DA REMESSA** | Define a ação enviada ao banco para as parcelas selecionadas. Hoje só existe **INCLUIR**. |

O número da parcela é um link que abre a movimentação.

### ▌SALVAR

**SALVAR** grava o intercâmbio com status **CADASTRADO**. O título da janela passa a mostrar o código, e o número sequencial aparece no cabeçalho.

![Intercâmbio salvo](08_salvo.png){width=100%}

### ▌HISTÓRICO

O **HISTÓRICO** lista cada ação no intercâmbio, com **DATA**, **USUÁRIO** e **MENSAGEM**. Ao salvar, registra cada movimentação incluída. O mesmo registro aparece no histórico da movimentação.

![Histórico do intercâmbio](09_historico.png){width=100%}

### ▌SALVAR & EMITIR

**SALVAR & EMITIR** grava o intercâmbio, valida os dados dos favorecidos e gera o arquivo. Com sucesso, o status muda para **EMITIDO** e o **EXPORTAR** é liberado.

Se faltar algum dado, o sistema mostra o erro no rodapé e mantém o status **CADASTRADO**.

![Erro de validação ao emitir](10_erro_emitir.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Antes de emitir, confira os cadastros. Pagamentos via PIX exigem a identificação do tipo de transferência na conta bancária do favorecido. Cada pagamento precisa de um **TIPO DE SERVIÇO** no cliente/credor, na movimentação ou na carteira.*</span>

### ▌EXPORTAR

**EXPORTAR** baixa o arquivo TXT do intercâmbio, que deve ser enviado ao banco. Fica ativo depois da emissão.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O sistema considera o arquivo enviado ao banco no primeiro download. A partir daí, o intercâmbio não pode mais ser cancelado.*</span>

### ▌ENVIO AO BANCO E RETORNO

O **EXPORTAR** do formulário gera o arquivo de pagamentos que o usuário envia ao banco. Não há integração automática com o banco.

1. Emita o intercâmbio e clique em **EXPORTAR** para baixar o arquivo.
2. Um usuário autorizado entra no internet banking e faz o upload do arquivo no local de remessa de pagamentos.
3. Quando o banco disponibilizar o retorno, o usuário baixa o arquivo no internet banking.
4. Na listagem, clique em **ARQUIVO DE RETORNO** e envie o arquivo para baixar os pagamentos efetuados e registrar os recusados.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Depois da emissão, não altere valores, formas de pagamento, favorecidos ou datas nas parcelas do intercâmbio. Qualquer mudança compromete a leitura do retorno do banco.*</span>

### ▌CANCELAR

**CANCELAR** pede confirmação e cancela o intercâmbio, desvinculando as parcelas. Só fica ativo com status **EMITIDO** e antes do primeiro **EXPORTAR**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Uma permissão especial permite cancelar um intercâmbio que já está em processamento.*</span>

### ▌EDITAR UM INTERCÂMBIO

Dê dois cliques no intercâmbio na listagem. A janela abre com o título **INTERCÂMBIO BANCÁRIO** + código, a carteira bloqueada e as parcelas na grade.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro. A tela é a mesma do print de **SALVAR**.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O intercâmbio depende da homologação com o banco e da carteira configurada em **EMPRESA -> CARTEIRAS -> PARÂMETROS -> INTERCÂMBIO BANCÁRIO** (layout CNAB de pagamento, convênio, serviço e lançamento). Transferências e PIX transferência exigem a conta bancária cadastrada no favorecido. Com duas ou mais contas, vale sempre a primeira.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

