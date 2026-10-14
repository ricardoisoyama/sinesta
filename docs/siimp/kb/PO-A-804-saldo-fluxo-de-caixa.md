# Saldo & Fluxo de Caixa

- ID: PO-A-804
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > Saldo & Fluxo de Caixa
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-804
- Anexos (não baixados): 00_banner.png; 01_tela.png; 02_saldos.png; 03_movimentacoes.png; 99_rodape.png

---

![Saldo & Fluxo de Caixa](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

A tela **SALDO & FLUXO DE CAIXA** reúne, dia a dia, o que entra e o que sai de cada carteira da empresa. Assim, o financeiro não precisa somar contas a pagar e a receber por fora para saber se vai sobrar ou faltar dinheiro.

O objetivo é dar uma visão rápida do caixa. Para cada data do período, a tela mostra os débitos, os créditos, o saldo do dia e o saldo acumulado, no total e por carteira. Ao lado, ficam os saldos atuais de todas as carteiras. Quando algum valor chama a atenção, é possível abrir as movimentações que o compõem.

A tela é usada pela equipe financeira e pelos gestores que acompanham o caixa. Os valores vêm das movimentações a pagar e a receber *(**FINANCEIRO -> MOVIMENTAÇÕES**)* e das carteiras cadastradas no sistema.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela mostra o fluxo de caixa dia a dia, no total e por carteira, e os saldos atuais de cada carteira. Fica em **FINANCEIRO -> SALDO & FLUXO DE CAIXA**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A tela abre com o período do mês atual já carregado (do primeiro ao último dia). O painel **SALDOS DAS CARTEIRAS** já vem aberto, à direita. A tela só consulta dados: nada é lançado ou alterado por ela.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra uma linha por dia do período. Para cada dia, traz os débitos, os créditos, o saldo do dia e o saldo acumulado, primeiro no total e depois em cada carteira.

![Tela SALDO & FLUXO DE CAIXA com uma célula selecionada e o painel de saldos aberto](01_tela.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❷ | **DÉBITO** | Esconde ou mostra as colunas de débito do total e de todas as carteiras. Clique de novo para voltar a mostrar. | Sempre. |
|  | **CRÉDITO** | Esconde ou mostra as colunas de crédito. | Sempre. |
|  | **SALDO** | Esconde ou mostra as colunas de saldo do dia. | Sempre. |
|  | **ACUMULADO** | Esconde ou mostra as colunas de saldo acumulado. | Sempre. |
| ❸ | **EXPORTAR** | Exporta a listagem em CSV ou PDF. | Sempre. |
| ❹ | **VER MOVIMENTAÇÕES** | Abre as movimentações da data e da carteira da célula selecionada *(ver **MOVIMENTAÇÕES**)*. | Quando uma célula de **DÉBITO** ou **CRÉDITO** está selecionada. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **7 DIAS** | Preenche o período com os últimos 7 dias. |
|  | **15 DIAS** | Preenche o período com os últimos 15 dias. |
|  | **30 DIAS** | Preenche o período com os últimos 30 dias. |
|  | **VENCIMENTO DE** | Primeiro dia do período. |
|  | **ATÉ** | Último dia do período. |
|  | **CARTEIRA** | Limita a listagem a uma ou mais carteiras, agrupadas por empresa. Vazio mostra todas. |
|  | **VENCIDOS?** | Inclui as movimentações em aberto que já venceram. |
|  | **REALIZADO?** | No saldo de hoje, considera só as movimentações liquidadas e parcialmente liquidadas. |
|  | **BUSCAR** *(lupa)* | Carrega a listagem com os filtros escolhidos. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❺ | **DATA** | Dia da linha. A primeira linha é o dia anterior ao início do período e traz só o saldo acumulado até ali *(saldo inicial)*. |
|  | **TOTAIS -> DÉBITO** | Soma das saídas do dia em todas as carteiras. |
|  | **TOTAIS -> CRÉDITO** | Soma das entradas do dia em todas as carteiras. |
|  | **TOTAIS -> SALDO** | Crédito menos débito do dia. Verde quando positivo, vermelho quando negativo. |
|  | **TOTAIS -> ACUMULADO** | Saldo inicial somado aos saldos de cada dia até a data da linha. |
|  | **<CARTEIRA> -> DÉBITO, CRÉDITO, SALDO E ACUMULADO** | As mesmas quatro colunas, só com os valores daquela carteira. Há um grupo para cada carteira, com o nome dela no cabeçalho. |
| ❻ | Célula selecionada | Célula marcada com um clique. Serve para abrir as movimentações dela. |
| ❼ | **TOTAL** | Linha final, com a soma das colunas no período. |
| ❽ | **SALDOS DAS CARTEIRAS** | Painel com o saldo de cada carteira *(ver **SALDOS DAS CARTEIRAS**)*. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*A coluna **DATA** fica fixa ao rolar a listagem para os lados. Use os botões de **COLUNAS** ❷ para esconder o que não precisa e ver mais carteiras na tela, por exemplo só **SALDO** e **ACUMULADO**.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Ao mudar o período, a carteira ou as marcações, clique em **BUSCAR** ❶ para recarregar a listagem.*</span>

---

## <font color="#FFAE00">▌</font>SALDOS DAS CARTEIRAS

O painel **SALDOS DAS CARTEIRAS**, à direita da listagem, mostra um cartão para cada carteira com a agência, a conta e o saldo atual. Ele já abre junto com a tela.

![Painel SALDOS DAS CARTEIRAS aberto](02_saldos.png){width=40%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | Recolher *(seta dupla)* | Recolhe o painel para a lateral e deixa mais espaço para a listagem. Clique de novo para abrir. |
| ❷ | **ATUALIZAR SALDOS** | Recarrega os saldos dos cartões. |
| ❸ | Nome da carteira | Título do cartão, com o nome da carteira como está no cadastro. |
| ❹ | Ícone | Logotipo do banco da carteira. Carteiras sem banco *(caixas internos)* mostram um saco de dinheiro. |
| ❺ | **AG** e **CC** | Agência e conta da carteira. |
| ❻ | **SALDO** | Saldo atual da carteira. Verde quando positivo, vermelho quando negativo. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O painel lista todas as carteiras, mesmo que a listagem esteja filtrada por **CARTEIRA**. Role o painel para ver as demais.*</span>

---

## <font color="#FFAE00">▌</font>MOVIMENTAÇÕES

Para ver as movimentações que formam um valor, clique na célula de **DÉBITO** ou **CRÉDITO** e depois em **VER MOVIMENTAÇÕES**. A tela **MOVIMENTAÇÕES** abre já filtrada pela data e pela carteira da célula.

![Movimentações abertas a partir do débito total de 08/10/2026](03_movimentacoes.png){width=100%}

| Nº | Elemento | O que acontece |
| :---: | --- | --- |
| ❶ | Célula selecionada | Define a data e a carteira da consulta. Uma célula do grupo **TOTAIS** traz as movimentações de todas as carteiras. Uma célula de carteira traz só as daquela carteira. |
| ❷ | **VER MOVIMENTAÇÕES** | Abre a tela **MOVIMENTAÇÕES** com os filtros da célula. |
| ❸ | Abas **RECEBER** e **PAGAR** | A célula de **DÉBITO** abre a aba **PAGAR**. A célula de **CRÉDITO** abre a aba **RECEBER**. |
| ❹ | Listagem | Movimentações da data e da carteira, nos status **EM ABERTO**, **LIQUIDADA** e **PARC. LIQUIDADA**. |
| ❺ | **FILTROS** | Painel recolhido onde ficam os filtros aplicados. A data da célula vai para **MOVIMENTADO DE** e **ATÉ**. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*No exemplo, o débito total de 08/10/2026 (R$ 3.700,00) abre as três contas a pagar que somam esse valor, de duas carteiras diferentes.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Células de **SALDO** e **ACUMULADO** não abrem movimentações. Com elas selecionadas, **VER MOVIMENTAÇÕES** fica desabilitado.*</span>

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*O duplo clique na célula não abre as movimentações. Use sempre o botão **VER MOVIMENTAÇÕES** ❷.*</span>

Os botões, filtros e colunas da tela **MOVIMENTAÇÕES** são explicados em seu respectivo manual.

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
