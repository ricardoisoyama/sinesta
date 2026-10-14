# Cheques

- ID: PO-A-808
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > CHEQUES > Cheques
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-808
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_receber.png; 04_liquidar.png; 05_form_edicao.png; 99_rodape.png

---

![Cheques](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Quando a empresa paga contas com cheque, ou recebe cheques de clientes, é preciso saber quais contas cada cheque quita, quando ele foi emitido e quando compensou. O módulo **CHEQUES** existe para registrar cada cheque e ligá-lo às movimentações financeiras que ele paga ou recebe.

O objetivo é acompanhar o cheque do lançamento até a compensação. O cheque nasce **CADASTRADO**, passa a **EMITIDO** e termina **LIQUIDADO**, quando as movimentações são baixadas na data de compensação, ou **CANCELADO**. O sistema também imprime o cheque nos modelos de banco disponíveis e guarda o histórico de cada mudança.

O módulo é usado pela área financeira, em especial contas a pagar e a receber. Ele se apoia nos **TALÕES** *(numeração dos cheques a pagar)*, nas **CARTEIRAS** *(contas bancárias)* e nas **MOVIMENTAÇÕES**, que são baixadas na liquidação.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **CHEQUES** lista os cheques a pagar e a receber, permite lançar e editar cheques e executa a emissão, a impressão, a liquidação e o cancelamento. Fica em **FINANCEIRO -> CHEQUES -> CHEQUES**.

| Status | O que significa | Como chega nele |
| --- | --- | --- |
| **CADASTRADO** | Cheque lançado, ainda não emitido. Só neste status é possível adicionar movimentações. | Ao salvar um cheque novo. |
| **EMITIDO** | Cheque emitido: libera impressão, liquidação e cancelamento. O cabeçalho do formulário fica verde. | Botão **EMITIR** *(listagem)*, **SALVAR E EMITIR** *(formulário)* ou **REABRIR** de um cheque liquidado. |
| **LIQUIDADO** | Cheque compensado: as movimentações são baixadas na data de compensação. | Botão **LIQUIDAR**. |
| **CANCELADO** | Cheque cancelado: as movimentações deixam de estar vinculadas a ele. | Botão **CANCELAR**, com motivo. |

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todos os cheques, com o talão, o valor, as datas e o status de cada um.

![Listagem de Cheques](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário **NOVO CHEQUE**. | Sempre. |
| ❷ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❸ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❹ | **IMPRIMIR** | Imprime os cheques selecionados no modelo escolhido: Modelo 1 - Itau, Modelo 1 - Caixa, Modelo 1 - Bradesco, Modelo 2 - Santander, Modelo 2 - Bradesco, Modelo 2 - Sicredi, Modelo 3 - Sicoob ou Modelo 4 - Santander. | Com pelo menos um cheque selecionado. |
| ❺ | **EMITIR** | Emite os cheques selecionados, após confirmação. Só cheques **CADASTRADOS** com movimentações são emitidos. | Com pelo menos um cheque selecionado. |
| ❻ | **LIQUIDAR** | Abre a janela **LIQUIDAR CHEQUES** para baixar os cheques selecionados *(ver **LIQUIDAR UM CHEQUE**)*. | Com pelo menos um cheque selecionado. |
| ❼ | **CANCELAR** | Cancela os cheques selecionados. Pede um motivo. Só cheques **EMITIDOS** são cancelados. | Com pelo menos um cheque selecionado. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❽ | **DT CRIAÇÃO** | Filtra pela data de cadastro do cheque. |
| | **TODAS AS CARTEIRAS** | Filtra pela carteira. |
| | **DESCRIÇÃO** | Filtra pela descrição do cheque. |
| | **Nº CHEQUES** | Filtra pelo número do cheque. |
| | **TALÕES** | Filtra pela descrição do talão. |
| | **Nº MOVIMENTAÇÕES** | Filtra pelo número de uma movimentação paga pelo cheque. |
| | **STATUS** | Filtra pelo status: Cadastrado, Emitido, Liquidado ou Cancelado. |
| | **LUPA** *(BUSCAR)* | Aplica os filtros preenchidos. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❾ | **CARTEIRA/TALÃO** | Talão do cheque a pagar, ou carteira do cheque a receber. |
| | **AÇÃO** | Resultado da última ação feita pela barra de botões: **SUCESSO!** ou **ERRO!**. No erro, o motivo aparece ao passar o mouse. |
| | **NÚMERO** | Número do cheque. |
| | **DESCRIÇÃO** | Descrição do cheque. |
| | **QUANTIDADE** | Quantidade de movimentações vinculadas ao cheque. |
| | **TOTAL** | Valor do cheque, igual à soma das movimentações. |
| | **PAGAMENTO** | Data de pagamento informada no cheque. |
| | **COMPENSAÇÃO** | Data de compensação. |
| | **STATUS** | Situação do cheque: Cadastrado, Emitido, Liquidado ou Cancelado. |
| | **CRIADO EM** | Data e hora do cadastro. |

### ▌COLUNAS OCULTAS

| Coluna | O que mostra |
| --- | --- |
| **CRIADO POR** | Usuário que cadastrou o cheque. |
| **ATUALIZADO POR** | Usuário que fez a última alteração. |

Para exibir, abra o menu de qualquer cabeçalho de coluna e marque a coluna em **COLUNAS**.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os botões **IMPRIMIR**, **EMITIR**, **LIQUIDAR** e **CANCELAR** ficam ativos com qualquer seleção, mas a regra de status só é conferida na execução. Se o cheque não puder receber a ação, a coluna **AÇÃO** mostra **ERRO!** e o motivo, por exemplo "Nenhuma movimentação foi encontrada para este cheque!" ou "O cheque precisa estar emitido para ser cancelado!".*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, com o título **NOVO CHEQUE** e o tipo **A PAGAR** já selecionado.

![Formulário de Novo Cheque](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Identificação | **TIPO** | Define se o cheque é **A PAGAR** ou **A RECEBER**. Fica bloqueado depois que o cheque é salvo. |
| | | **TALÃO** | Talão de onde sai o cheque a pagar. A busca começa ao digitar 4 caracteres da descrição do talão. |
| | | **CÓDIGO** | Código do cheque, gerado ao salvar. Só leitura. |
| | | **CADASTRO** | Data e hora do cadastro. Só leitura. |
| | | **ATUALIZAÇÃO** | Data e hora da última alteração. Só leitura. |
| | | **STATUS** | Situação do cheque. Todo cheque novo nasce **CADASTRADO**. Só leitura. |
| ❷ | Informações do Cheque | **COMP** | Código de compensação do cheque. |
| | | **NÚMERO** | Número do cheque. No cheque a pagar, se ficar vazio, o sistema usa o **PRÓXIMO Nº** do talão ao salvar. |
| | | **DATA DE PAGAMENTO** | Data de pagamento do cheque. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **DATA DE COMPENSAÇÃO** | Data em que o cheque compensou. Também é preenchida na liquidação. |
| | | **DESCRIÇÃO DO CHEQUE** | Texto livre que identifica o cheque. |
| ❸ | Filtros de movimentações | **TODAS AS EMPRESAS** | Filtra as movimentações pela empresa. |
| | | **TODAS AS CARTEIRAS** | Filtra as movimentações pela carteira. |
| | | **CLIENTE / FORNECEDOR** | Filtra pelo nome do cliente ou fornecedor. |
| | | **NÚMERO** | Filtra pelo número da movimentação. |
| | | **TIPO DE DATA** | Data usada no período: Vencimento, Cadastro ou Competência. <span style="color:red;">**OBRIGATÓRIO PARA BUSCAR.**</span> |
| | | **DE** | Início do período. <span style="color:red;">**OBRIGATÓRIO PARA BUSCAR.**</span> |
| | | **ATÉ** | Fim do período. <span style="color:red;">**OBRIGATÓRIO PARA BUSCAR.**</span> |
| | | **BUSCAR** | Busca as movimentações e as adiciona ao cheque *(ver **MOVIMENTAÇÕES DO CHEQUE**)*. |
| ❹ | Movimentações do Cheque | **GRADE** | Movimentações vinculadas ao cheque *(colunas abaixo)*. |
| ❺ | Totais | **QUANTIDADE** | Quantidade de movimentações na grade. |
| | | **VALOR TOTAL** | Soma dos valores das movimentações, que é o valor do cheque. |
| ❻ | Observações | **OBSERVAÇÕES** | Texto livre sobre o cheque. |
| ❼ | Botões de gravação | **SALVAR E EMITIR** | Salva o cheque e já o emite. Fica ativo depois que o tipo e o talão são escolhidos. |
| | | **SALVAR** | Salva o cheque com o status atual. |
| ❽ | Botões de ação | **IMPRIMIR** | Imprime o cheque no modelo escolhido *(mesmos modelos da listagem)*. Ativo no cheque **EMITIDO**. |
| | | **LIQUIDAR** | Abre a janela **LIQUIDAR CHEQUE**. Ativo no cheque **EMITIDO**. |
| | | **CANCELAR** | Cancela o cheque, com motivo. Ativo no cheque **EMITIDO**. |
| | | **HISTÓRICO** | Abre o histórico de ações do cheque *(ver **HISTÓRICO**)*. |
| | | **FECHAR** | Fecha o formulário. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O resultado de cada ação aparece na faixa logo acima dos botões, por exemplo "Item cadastrado com sucesso!" ou uma mensagem de erro em vermelho.*</span>

### ▌MOVIMENTAÇÕES DO CHEQUE

As movimentações que o cheque paga ou recebe entram pela busca do grupo ❸. Preencha **TIPO DE DATA**, **DE** e **ATÉ** e, se quiser, os demais filtros, e clique em **BUSCAR**.

| Coluna | O que mostra |
| --- | --- |
| **EMPRESA** | Empresa da movimentação. |
| **Nº** | Número da movimentação e da parcela, em forma de link. |
| **CLIENTE / FORNECEDOR** | Cliente ou fornecedor da movimentação. |
| **CARTEIRA** | Carteira da movimentação. |
| **VALOR** | Valor da parcela. |
| **STATUS** | Situação da parcela, por exemplo **EM ABERTO**. |
| **VENCIMENTO** | Data de vencimento da parcela. |
| **PAGO EM** | Data em que a parcela foi paga. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Todas as movimentações encontradas são adicionadas ao cheque de uma vez, e cada nova busca soma às anteriores. Use filtros restritos, como **NÚMERO** ou **CLIENTE / FORNECEDOR**, e um período curto. A mensagem abaixo da grade informa quantas foram encontradas e adicionadas.*</span>

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para retirar uma movimentação, clique na linha e tecle **DELETE**. O sistema pede confirmação.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Movimentações que já estão em outro cheque não são adicionadas. A mensagem informa "Todas já estão em um cheque".*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Só é possível adicionar movimentações enquanto o cheque está **CADASTRADO**.*</span>

### ▌CHEQUE A RECEBER

Com o **TIPO** em **A RECEBER**, o campo **TALÃO** dá lugar a **CARTEIRA** ❶ e o **NÚMERO** ❷ passa a ser obrigatório, porque o cheque vem de terceiros.

![Formulário de Novo Cheque com tipo A receber](03_form_receber.png){width=100%}

| Nº | Campo | Para que serve |
| :---: | --- | --- |
| ❶ | **CARTEIRA** | Carteira onde o cheque recebido será depositado. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❷ | **NÚMERO** | Número impresso no cheque recebido. <span style="color:red;">**OBRIGATÓRIO.**</span> |

### ▌LIQUIDAR UM CHEQUE

O botão **LIQUIDAR** abre a janela **LIQUIDAR CHEQUE**, com o campo **DATA DE COMPENSAÇÃO** e as regras da liquidação.

![Janela Liquidar Cheque](04_liquidar.png){width=60%}

| Campo ou botão | Para que serve |
| --- | --- |
| **DATA DE COMPENSAÇÃO** | Data em que as movimentações serão baixadas. Se ficar vazia, vale a data de compensação do cheque. |
| **LIQUIDAR** | Liquida o cheque e as movimentações. |
| **FECHAR** | Fecha a janela sem liquidar. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Só cheques **EMITIDOS** podem ser liquidados, e as parcelas precisam estar aprovadas. Caso contrário, o sistema mostra "A parcela precisa estar aprovada antes de ser liquidada!".*</span>

### ▌CANCELAR E REABRIR

- **CANCELAR**: pergunta "Deseja realmente cancelar este cheque?" e pede o motivo. O cheque fica **CANCELADO** e as movimentações deixam de estar vinculadas a ele.
- **REABRIR**: aparece, com **SALVAR E EMITIR** e **SALVAR** desativados, quando o cheque está **LIQUIDADO**. Pede o motivo da reabertura, com no mínimo 15 caracteres, e volta o cheque para **EMITIDO**.

### ▌HISTÓRICO

O botão **HISTÓRICO** abre uma janela com as ações registradas no cheque, com as colunas **DATA**, **MENSAGEM** e **USUÁRIO**, e um campo para pesquisar por termo. Exemplo de mensagem: "Cheque emitido com sucesso!".

### ▌EDITAR UM CHEQUE

Para editar, dê um duplo clique no cheque na listagem. A janela abre com o número no título *(ex.: **CHEQUE 101**)*, os campos preenchidos e as movimentações vinculadas. No cheque emitido, o cabeçalho fica verde e os botões **IMPRIMIR**, **LIQUIDAR** e **CANCELAR** ficam ativos.

![Cheque emitido aberto para edição](05_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro. O **TIPO** fica bloqueado depois que o cheque é salvo.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Um cheque sem movimentações não pode ser emitido. O sistema mostra "Nenhuma movimentação foi encontrada para este cheque!".*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Para cancelar, o cheque precisa estar **EMITIDO**. Um cheque **CADASTRADO** retorna "O cheque precisa estar emitido para ser cancelado!".*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O número do cheque a pagar vem do **PRÓXIMO Nº** do talão escolhido. Cadastre o talão antes em **FINANCEIRO -> CHEQUES -> TALÕES**.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

