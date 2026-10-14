# CNAB de Remessa

- ID: PO-A-893
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > CNAB de Remessa
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-893
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_pesquisa.png; 04_arrastar.png; 05_adicionar.png; 06_historico.png; 07_cancelar.png; 08_cancelada.png; 09_form_edicao.png; 99_rodape.png

---

![CNAB de Remessa](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

A tela **CNAB DE REMESSA** gera o arquivo que leva os boletos da empresa até o banco. Sem ela, cada título teria de ser registrado manualmente no internet banking.

O objetivo é juntar os boletos de uma carteira numa remessa, emitir o arquivo no padrão CNAB *(240 ou 400)* e acompanhar o que o banco devolve. O retorno do banco é importado pela própria tela, no botão **ARQUIVO DE RETORNO**.

Quem usa é a área financeira, responsável pelo contas a receber e pela cobrança bancária. A tela depende da **CARTEIRA** cadastrada em **EMPRESA -> CARTEIRAS**, que define o banco, o layout e os parâmetros da remessa.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela lista as remessas de boletos e permite criar, emitir, exportar e cancelar cada uma. Caminho de menu: **FINANCEIRO -> OPÇÕES BANCÁRIAS -> CNAB DE REMESSA**.

Cada remessa passa pelos status **CADASTRADA**, **EMITIDA**, **PROCESSANDO**, **FINALIZADA** e **CANCELADA**.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra as remessas da empresa selecionada, das mais recentes para as mais antigas.

![Listagem da tela Remessas](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVA** | Abre o **FORMULÁRIO DE REMESSA** para montar uma nova remessa. | Sempre. |
| ❷ | **REMOVER** | Exclui a remessa selecionada. | Fica desativado nas remessas **EMITIDAS** e **CANCELADAS**. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❺ | **ARQUIVO DE RETORNO** | Importa o arquivo de retorno enviado pelo banco. O sistema lê o arquivo e atualiza os boletos da remessa *(ex.: registrado, liquidado, baixado)*. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❻ | **BUSCAR** | Escolhe a empresa dona das remessas. |
|  | **NÚMERO** | Filtra pelo número da remessa. |
|  | **DESDE** | Mostra as remessas criadas a partir da data informada. |
|  | Lupa | Aplica os filtros. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❼ | **NÚMERO** | Número sequencial da remessa. |
|  | **EMPRESA** | Empresa dona da remessa, com o CNPJ. |
|  | **CARTEIRA** | Carteira bancária usada na remessa. |
|  | **STATUS** | **CADASTRADA**, **EMITIDA**, **PROCESSANDO**, **FINALIZADA** ou **CANCELADA**. |
|  | **CRIAÇÃO** | Data e hora em que a remessa foi criada. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*A importação do retorno também pode ser feita direto pelo **ARQUIVO DE RETORNO** ❺, sem abrir a remessa.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O botão **NOVA** abre o **FORMULÁRIO DE REMESSA**. Nele você pesquisa os boletos de uma carteira e escolhe quais entram na remessa.

![Formulário de remessa vazio](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **OPÇÕES DE FILTRO** | **EMPRESA** | Empresa dona dos boletos. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CARTEIRA** | Carteira bancária dos boletos. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❷ | **DATA DE CRIAÇÃO** | **DE** / **ATÉ** | Período de criação dos boletos. |
| ❸ | **DATA DE VENCIMENTO** | **DE** / **ATÉ** | Período de vencimento dos boletos. |
| ❹ | **DADOS DA REMESSA** | **CÓDIGO**, **CRIAÇÃO**, **STATUS** | Dados da remessa depois de salva. Não são editáveis. |
| ❺ | **BUSCAR** | — | Pesquisa os boletos disponíveis com os filtros informados. |
| ❻ | **BOLETOS DISPONÍVEIS** | Grade e **ADICIONAR** | Boletos da carteira que ainda não estão em nenhuma remessa. |
| ❼ | **BOLETOS NESSA REMESSA** | Grade e **REMOVER** | Boletos que vão para o arquivo da remessa. |
| ❽ | Rodapé | **SALVAR**, **SALVAR & EMITIR**, **EXPORTAR** | Ações de gravação e geração do arquivo. |
| ❾ | Rodapé | **HISTÓRICO**, **CANCELAR**, **FECHAR** | Consulta, cancelamento e saída. |

As grades **BOLETOS DISPONÍVEIS** e **BOLETOS NESSA REMESSA** têm as colunas **NOSSO NÚMERO**, **Nº FATURA**, **CLIENTE**, **VENCIMENTO** e **VALOR**. As colunas **Nº PROG. CARGA** e **CENTRO DE CUSTO** ficam ocultas.

### ▌PESQUISAR BOLETOS

Informe a empresa e a carteira e clique em **BUSCAR** ❺. Os boletos encontrados aparecem em **BOLETOS DISPONÍVEIS**.

![Boletos disponíveis após a busca](03_pesquisa.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Sem empresa e carteira, a busca não roda e aparece a mensagem "Há campos obrigatórios que devem ser preenchidos antes de realizar a pesquisa!".*</span>

### ▌MONTAR A REMESSA

Há três formas de levar um boleto para **BOLETOS NESSA REMESSA**:

- Arrastar a linha de uma grade para a outra.
- Selecionar uma ou mais linhas e clicar em **ADICIONAR**.
- Dar dois cliques na linha.

Para tirar um boleto da remessa, faça o caminho inverso: arraste de volta, use **REMOVER** ou dê dois cliques na linha.

![Arrastando um boleto para a remessa](04_arrastar.png){width=100%}

![Boletos adicionados à remessa](05_adicionar.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Só é possível mover boletos numa remessa com status **CADASTRADA**. Em outro status, o sistema mostra "Você não pode mover um boleto para uma remessa que possui um status diferente de Cadastrado!".*</span>

### ▌BOTÕES DO RODAPÉ

| Botão | Para que serve | Quando fica ativo |
| --- | --- | --- |
| **SALVAR** | Grava a remessa com status **CADASTRADA**. | Remessa nova ou **CADASTRADA**. |
| **SALVAR & EMITIR** | Grava a remessa e muda o status para **EMITIDA**. | Remessa nova ou **CADASTRADA**. |
| **EXPORTAR** | Pede confirmação e gera o arquivo da remessa para enviar ao banco. | Depois que a remessa é salva. |
| **HISTÓRICO** | Abre o histórico de alterações da remessa. | Depois que a remessa é salva. |
| **CANCELAR** | Cancela a remessa. | Remessas **CADASTRADAS** ou **EMITIDAS**. |
| **FECHAR** | Fecha o formulário sem salvar. | Sempre. |

### ▌ENVIO AO BANCO E RETORNO

O **EXPORTAR** do formulário gera o arquivo de remessa que o usuário envia ao banco. Não há integração automática com o banco.

1. Emita a remessa e clique em **EXPORTAR** para baixar o arquivo.
2. Um usuário autorizado entra no internet banking e faz o upload do arquivo no local de remessa de cobrança.
3. Quando o banco disponibilizar o retorno, o usuário baixa o arquivo no internet banking.
4. Na listagem, clique em **ARQUIVO DE RETORNO** e envie o arquivo para atualizar os boletos no sistema.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Depois da emissão, não altere valores, formas de pagamento ou datas nos títulos da remessa. Qualquer mudança compromete a leitura do retorno do banco.*</span>

### ▌HISTÓRICO

O **HISTÓRICO** lista cada mudança de status da remessa, com data e mensagem.

![Janela de histórico da remessa](06_historico.png){width=80%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **EXPORTAR** | Exporta o histórico em CSV. |
| ❷ | Pesquisa | Filtra as mensagens pelo termo digitado. Tecle **ENTER** para pesquisar. |
| ❸ | **DATA** / **MENSAGEM** | Data e hora de cada registro e o que aconteceu. |

### ▌CANCELAR UMA REMESSA

Abra a remessa e clique em **CANCELAR**. O sistema pede confirmação com três opções.

![Confirmação do cancelamento](07_cancelar.png){width=100%}

| Nº | Opção | O que faz |
| :---: | --- | --- |
| ❶ | **SIM, CANCELAR** | Cancela a remessa e libera os boletos para outra remessa. |
| ❷ | **SIM, CANCELAR E DUPLICAR** | Cancela a remessa e cria uma nova com os mesmos boletos. |
| ❸ | **NÃO** | Fecha a confirmação sem cancelar. |

Depois do cancelamento, o status muda para **CANCELADA** e a grade **BOLETOS NESSA REMESSA** fica vazia.

![Remessa cancelada](08_cancelada.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Com o parâmetro de carteira **VOLTAR NUMERAÇÃO** ligado, o cancelamento é bloqueado se já existir uma remessa gerada depois dela.*</span>

### ▌EDITAR UMA REMESSA

Dê dois cliques na remessa na listagem. A janela **FORMULÁRIO DE REMESSA** abre com a empresa e a carteira bloqueadas, os **DADOS DA REMESSA** preenchidos e os boletos em **BOLETOS NESSA REMESSA**.

![Remessa emitida aberta para edição](09_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro. Numa remessa **EMITIDA**, **SALVAR** e **SALVAR & EMITIR** ficam desativados.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*A remessa só funciona com uma carteira bem configurada em **EMPRESA -> CARTEIRAS** (banco, layout CNAB, numeração e parâmetros de cobrança). Dados errados na carteira geram um arquivo que o banco recusa.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

