# Faturamento

- ID: PO-A-802
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > PERFIS > Faturamento
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-802
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_por_periodo.png; 04_form_ocorrencias.png; 05_form_edicao.png; 06_exemplo_1.png; 07_simulacao_1.png; 08_exemplo_2.png; 09_simulacao_2.png; 10_exemplo_3_ocorrencias.png; 11_exemplo_3.png; 12_simulacao_3.png; 99_rodape.png

---

![Perfil de Faturamento](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Cada cliente combina um prazo diferente para pagar o frete: em 28 dias, numa fatura mensal parcelada, alguns dias depois da entrega. Calcular esse vencimento à mão em cada documento ou fatura toma tempo e abre espaço para erro.

O **PERFIL DE FATURAMENTO** guarda essa regra uma única vez. Nele você define em que momento o vencimento é calculado *(no documento, no boletim, na fatura ou numa ocorrência)*, como contar os dias, o que fazer em fins de semana e feriados, as parcelas, a carteira e a forma de pagamento. Também é possível incluir observações automáticas na fatura e no CT-e.

A tela é usada pelas áreas comercial e financeira. Com os perfis cadastrados, o sistema calcula o vencimento sozinho, sempre do mesmo jeito para cada cliente.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **PERFIL DE FATURAMENTO** lista os perfis de vencimento usados no faturamento e permite criar, editar e remover perfis. Cada perfil pode valer para todas as empresas do grupo ou só para uma.

Caminho: **EMPRESA -> PERFIS -> FATURAMENTO**.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todos os perfis de faturamento cadastrados, do mais novo para o mais antigo.

![Listagem da tela Perfil de Faturamento](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar um perfil. | Sempre. |
| ❷ | **REMOVER** | Remove os perfis marcados na caixa de seleção da linha. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **EMPRESA** | Filtra os perfis de uma empresa. Vazio, mostra **TODAS AS EMPRESAS**. |
|  | **NOME** | Filtra os perfis pelo nome. |
|  | **LUPA** | Aplica a busca. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **CÓDIGO** | Número do perfil, gerado pelo sistema ao salvar. |
|  | **EMPRESA** | Empresa à qual o perfil se aplica, ou **TODAS**. |
|  | **NOME** | Nome dado ao perfil. |
|  | **CRIADO EM** | Data e hora do cadastro. |
|  | **ATUALIZADO EM** | Data e hora da última alteração. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O **REMOVER** apaga o perfil escolhido. Confira a seleção antes de usar.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, com o título **NOVO PERFIL DE FATURAMENTO**. Ele já vem com **EMPRESA** em **TODAS**, **TIPO DO PERFIL** em **VIA DOCUMENTO** e **TIPO DE VENCIMENTO** em **DIÁRIO**.

![Formulário Novo Perfil de Faturamento](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Identificação | **EMPRESA** | Empresa à qual o perfil se aplica. Vazio, vale para **TODAS**. |
|  |  | **NOME** | Nome do perfil, como ele aparece na listagem. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❷ | Controle | **CÓDIGO** | Número do perfil, preenchido pelo sistema ao salvar. |
|  |  | **CADASTRO** | Data e hora em que o perfil foi salvo pela primeira vez. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. |
| ❸ | Configurações | **TIPO DO PERFIL** | Momento em que o vencimento é calculado: **VIA DOCUMENTO**, **VIA BOLETIM**, **VIA FATURAMENTO** ou **VIA OCORRÊNCIA** *(ver **TIPOS DO PERFIL**)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **TIPO DE VENCIMENTO** | Regra de cálculo: **POR PERÍODO**, **DIÁRIO**, **SEMANAL**, **QUINZENAL** ou **MENSAL**. Muda os campos da aba **PERÍODOS DE VENCIMENTOS** ❽. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❹ | Financeiro | **CARTEIRA** | Carteira financeira usada no recebimento. Lista as carteiras cadastradas na empresa. |
|  |  | **FORMA PAGAMENTO** | **DINHEIRO**, **CHEQUE**, **TRANSFERÊNCIA**, **DEPÓSITO**, **CARTÃO**, **BOLETO**, **DÉBITO EM CONTA**, **PIX** ou **CRÉDITO EM CONTA**. |
|  |  | **PARCELAS** | Quantidade de parcelas. Vem com 1. |
|  |  | **A CADA** | Intervalo entre as parcelas. Vem com 1. |
|  |  | **PERÍODO** | Unidade do intervalo: **DIA(S)** ou **MES(ES)**. Vem com **MES(ES)**. |
|  |  | **CÓD. INTEGRAÇÃO** | Código do perfil para integração com outros sistemas. |
| ❺ | Dias Corridos | **SÁBADO** | Marcado, o sábado entra na contagem de dias corridos. Vem marcado. |
|  |  | **DOMINGO** | Marcado, o domingo entra na contagem de dias corridos. Vem marcado. |
|  |  | **FERIADO** | Marcado, os feriados entram na contagem de dias corridos. Vem marcado. |
| ❻ | Dias Úteis | **SÁBADO** | Marcado, o sábado passa a ser considerado dia útil. Vem desmarcado. |
|  |  | **DOMINGO** | Marcado, o domingo passa a ser considerado dia útil. Vem desmarcado. |
|  |  | **FERIADO** | Marcado, os feriados passam a ser considerados dias úteis. Vem desmarcado. |
| ❼ | Observações | **OBSERVAÇÕES DA FATURA** | Texto adicionado ao final da fatura. |
|  |  | **OBSERVAÇÕES DO CT-E** | Texto adicionado ao final do CT-e. |
| ❽ | Abas | **PERÍODOS DE VENCIMENTOS** | Regra de contagem dos dias *(ver **TIPOS DE VENCIMENTO** e **POR PERÍODO**)*. |
|  |  | **OCORRÊNCIAS** | Ocorrências ligadas ao perfil *(ver **OCORRÊNCIAS**)*. |
| ❾ | Ações | **SALVAR & NOVO** | Salva o perfil e abre um formulário em branco para o próximo. |
|  |  | **SALVAR** | Salva o perfil e mantém a janela aberta, com a mensagem *Item cadastrado com sucesso!*. |
|  |  | **PADRÃO** | Marca o perfil como padrão. |
| ❿ | Simulação | **UF**, **CIDADE** e **DATA** | Dados usados pela simulação. A data é a do faturamento. Liberados só depois de salvar. |
|  |  | **SIMULAÇÃO** | Abre a janela **SIMULAÇÃO DE VENCIMENTO** com a data que o sistema calcularia, e repete o resultado na barra acima dos botões. Liberado só depois de salvar. |
| ⓫ | Histórico e fechar | **HISTÓRICO** | Mostra o histórico de alterações do perfil. Liberado só depois de salvar. |
|  |  | **FECHAR** | Fecha o formulário. |

### ▌TIPOS DO PERFIL

O **TIPO DO PERFIL** define quando o sistema calcula o vencimento. A explicação de cada opção também aparece ao parar o mouse sobre o campo.

| Tipo | Quando o vencimento é calculado |
| --- | --- |
| **VIA DOCUMENTO** | Ao **SALVAR** o documento. A data é gravada no próprio documento. |
| **VIA BOLETIM** | Não é calculado. O perfil fica ligado ao documento para ser usado depois num boletim de caixa. Neste tipo a aba **OCORRÊNCIAS** fica desabilitada. |
| **VIA FATURAMENTO** | Só na criação da fatura, com base na data de emissão dela. Depois de criada a fatura, a data não muda. |
| **VIA OCORRÊNCIA** | Quando uma determinada ocorrência é lançada no documento. |

### ▌TIPOS DE VENCIMENTO

Nos tipos **DIÁRIO**, **SEMANAL**, **QUINZENAL** e **MENSAL**, a aba **PERÍODOS DE VENCIMENTOS** mostra um único **PERÍODO GLOBAL**:

| Campo | Para que serve |
| --- | --- |
| **CONTAR X DIAS CORRIDOS** | Quantidade de dias corridos até o vencimento. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **A PARTIR DE** | Ponto de partida da contagem; as opções mudam conforme o tipo *(tabela abaixo)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **NO FIM DO CÁLCULO, FAZER COM QUE O VENCIMENTO CAIA SEMPRE** | Ajusta a data calculada. Vazio, mantém **NA MESMA DATA CALCULADA**. Opções: **NO PRÓXIMO DIA ÚTIL** ou **NA PRÓXIMA** segunda, terça, quarta, quinta, sexta, sábado ou domingo. |
| **SE A DATA CALCULADA NÃO FOR UM DIA ÚTIL, ENTÃO** | Vazio, mantém **MANTER A MESMA DATA**. Opções: **JOGAR PARA O PRÓXIMO DIA ÚTIL** ou **JOGAR PARA O DIA ÚTIL ANTERIOR**. |

| Tipo | Opções de **A PARTIR DE** |
| --- | --- |
| **DIÁRIO** | **A PARTIR DA DATA ATUAL** ou **A PARTIR DO DIA SEGUINTE** |
| **SEMANAL** | **A PARTIR DE DOMINGO, DA SEMANA ATUAL** ou **A PARTIR DE DOMINGO, DA PRÓXIMA SEMANA** |
| **QUINZENAL** | **A PARTIR DO PRIMEIRO DIA DA QUINZENA ATUAL** ou **A PARTIR DO PRIMEIRO DIA DA PRÓXIMA QUINZENA** |
| **MENSAL** | **A PARTIR DO PRIMEIRO DIA DO MÊS ATUAL** ou **A PARTIR DO PRIMEIRO DIA DO MÊS SEGUINTE** |

### ▌POR PERÍODO

No tipo **POR PERÍODO**, cada faixa de dias do mês tem a sua própria regra. O formulário abre com o **PERÍODO 1**, e o **ADICIONAR** inclui novas faixas.

![Tipo Por Período](03_form_por_periodo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Período | **DO DIA** | Primeiro dia do mês da faixa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **AO DIA** | Último dia do mês da faixa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CONTAR X DIAS CORRIDOS** | Dias corridos somados antes de definir o vencimento. Vazio, conta 0. |
|  |  | **E VENCER NO DIA** | Dia do mês em que vence. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **DO MESMO MÊS / DO MÊS SEGUINTE** | Diz se o dia de vencimento é do mesmo mês ou do seguinte. |
|  |  | **NO FIM DO CÁLCULO, FAZER COM QUE O VENCIMENTO CAIA SEMPRE** | Mesmas opções do **PERÍODO GLOBAL**. |
|  |  | **SE A DATA CALCULADA NÃO FOR UM DIA ÚTIL, ENTÃO** | Mesmas opções do **PERÍODO GLOBAL**. |
| ❷ | Período | **ADICIONAR** | Inclui mais uma faixa. A partir da segunda aparece também o **REMOVER**, que tira a última faixa. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Monte as faixas cobrindo o mês inteiro, do dia 1 ao 31, para que todo faturamento caia em alguma regra.*</span>

### ▌OCORRÊNCIAS

A aba **OCORRÊNCIAS** liga ocorrências de entrega ao perfil. Ela fica disponível em todos os tipos de perfil, menos **VIA BOLETIM**.

![Aba Ocorrências](04_form_ocorrencias.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **VALIDAR SE / BLOQUEAR SE** | Tipo de validação da ocorrência: **VALIDAR SE** ou **BLOQUEAR SE**. Vem com **VALIDAR SE**. |
|  | **OCORRÊNCIA** | Ocorrência a ligar ao perfil. Lista as ocorrências cadastradas. |
| ❷ | **ADICIONAR** | Inclui a ocorrência escolhida na lista. |
| ❸ | **REMOVER** | Tira da lista a ocorrência selecionada. |
| ❹ | **TIPO DE VALIDAÇÃO**, **CÓDIGO** e **OCORRÊNCIA** | Colunas que mostram as ocorrências já ligadas ao perfil. |

### ▌EDITAR UM PERFIL DE FATURAMENTO

Para editar, dê um duplo clique na linha do perfil na listagem. A janela abre com o nome do perfil no título e todos os campos preenchidos, incluindo **CÓDIGO**, **CADASTRO** e **ATUALIZAÇÃO**. Os botões **SIMULAÇÃO** e **HISTÓRICO** já vêm liberados.

![Perfil aberto para edição](05_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>EXEMPLOS DE CADASTRO

Os três perfis abaixo foram cadastrados para mostrar combinações diferentes da tela. Todos usam o nome **EXEMPLO MANUAL**, valem para **TODAS** as empresas e foram testados com a **SIMULAÇÃO** *(**UF** SP, **CIDADE** São Paulo, faturamento em 08/10/2026)*.

| Código | Perfil | Tipo do perfil | Vencimento simulado |
| --- | --- | --- | --- |
| 256 | EXEMPLO MANUAL - 28 DIAS VIA DOCUMENTO | **VIA DOCUMENTO** | **04/11/2026** |
| 257 | EXEMPLO MANUAL - FATURA MENSAL EM 3 PARCELAS | **VIA FATURAMENTO** | **11/11/2026** |
| 258 | EXEMPLO MANUAL - 15 DIAS APÓS A ENTREGA | **VIA OCORRÊNCIA** | **23/10/2026** |

### ▌EXEMPLO 1 — 28 DIAS CORRIDOS NO DOCUMENTO

Cenário: o cliente paga 28 dias corridos depois da emissão do documento. Se a data cair num dia não útil, vai para o próximo dia útil. É o cadastro mínimo: só os campos obrigatórios e o ajuste de dia útil.

| Campo | Valor preenchido |
| --- | --- |
| **NOME** | EXEMPLO MANUAL - 28 DIAS VIA DOCUMENTO |
| **TIPO DO PERFIL** | **VIA DOCUMENTO** |
| **TIPO DE VENCIMENTO** | **DIÁRIO** |
| **CONTAR X DIAS CORRIDOS** | 28 |
| **A PARTIR DE** | **A PARTIR DA DATA ATUAL** |
| **SE A DATA CALCULADA NÃO FOR UM DIA ÚTIL, ENTÃO** | **JOGAR PARA O PRÓXIMO DIA ÚTIL** |

![Exemplo 1 salvo, com o código 256](06_exemplo_1.png){width=100%}

**SIMULAÇÃO:** para um documento emitido em 08/10/2026, o vencimento calculado foi **04/11/2026**, uma quarta-feira, já dia útil.

![Simulação do exemplo 1: vencimento em 04/11/2026](07_simulacao_1.png){width=100%}

### ▌EXEMPLO 2 — FATURA MENSAL EM 3 PARCELAS POR BOLETO

Cenário: o cliente recebe uma fatura por mês, paga em 3 parcelas mensais por boleto. A contagem parte do primeiro dia do mês seguinte, e a fatura e o CT-e levam observações automáticas. É o cadastro completo.

| Campo | Valor preenchido |
| --- | --- |
| **NOME** | EXEMPLO MANUAL - FATURA MENSAL EM 3 PARCELAS |
| **TIPO DO PERFIL** | **VIA FATURAMENTO** |
| **TIPO DE VENCIMENTO** | **MENSAL** |
| **CARTEIRA** | CARTEIRA INTERNA |
| **FORMA PAGAMENTO** | **BOLETO** |
| **PARCELAS** / **A CADA** / **PERÍODO** | 3 parcelas, a cada 1 **MES(ES)** |
| **CÓD. INTEGRAÇÃO** | FAT-MENSAL |
| **OBSERVAÇÕES DA FATURA** | Pagamento em 3 parcelas mensais por boleto. |
| **OBSERVAÇÕES DO CT-E** | Frete faturado mensalmente conforme contrato. |
| **CONTAR X DIAS CORRIDOS** | 10 |
| **A PARTIR DE** | **A PARTIR DO PRIMEIRO DIA DO MÊS SEGUINTE** |
| **SE A DATA CALCULADA NÃO FOR UM DIA ÚTIL, ENTÃO** | **JOGAR PARA O PRÓXIMO DIA ÚTIL** |

![Exemplo 2 salvo, com o código 257](08_exemplo_2.png){width=100%}

**SIMULAÇÃO:** para uma fatura emitida em 08/10/2026, o vencimento calculado foi **11/11/2026**. A contagem parte de 01/11, o primeiro dia do mês seguinte.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A forma de contar os dias depende da opção escolhida em **A PARTIR DE**. Por isso o resultado deste exemplo segue uma contagem diferente da dos exemplos 1 e 3.*</span>

![Simulação do exemplo 2: vencimento em 11/11/2026](09_simulacao_2.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A simulação mostra uma única data, mesmo com 3 parcelas.*</span>

### ▌EXEMPLO 3 — 15 DIAS APÓS A ENTREGA, VIA PIX

Cenário: o vencimento só é calculado quando a entrega é registrada. A partir do dia seguinte, contam-se 15 dias corridos, e o pagamento é por PIX.

| Campo | Valor preenchido |
| --- | --- |
| **NOME** | EXEMPLO MANUAL - 15 DIAS APÓS A ENTREGA |
| **TIPO DO PERFIL** | **VIA OCORRÊNCIA** |
| **TIPO DE VENCIMENTO** | **DIÁRIO** |
| **FORMA PAGAMENTO** | **PIX** |
| **CONTAR X DIAS CORRIDOS** | 15 |
| **A PARTIR DE** | **A PARTIR DO DIA SEGUINTE** |
| **NO FIM DO CÁLCULO, FAZER COM QUE O VENCIMENTO CAIA SEMPRE** | **NO PRÓXIMO DIA ÚTIL** |
| Aba **OCORRÊNCIAS** | **VALIDAR SE** + **ENTREGA REALIZADA NORMALMENTE**, incluída com **ADICIONAR** |

![Exemplo 3 salvo, com a aba Ocorrências](10_exemplo_3_ocorrencias.png){width=100%}

![Exemplo 3 salvo, com a aba Períodos de Vencimentos](11_exemplo_3.png){width=100%}

**SIMULAÇÃO:** para a data 08/10/2026, o vencimento calculado foi **23/10/2026**, uma sexta-feira.

![Simulação do exemplo 3: vencimento em 23/10/2026](12_simulacao_3.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Na simulação, a data informada faz o papel do lançamento da ocorrência.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
