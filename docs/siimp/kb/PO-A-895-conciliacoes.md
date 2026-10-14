# Conciliações

- ID: PO-A-895
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > OPÇÕES BANCÁRIAS > Conciliações
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-895
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_filtros.png; 03_selecao_rodape.png; 04_menu_conciliar.png; 05_conf_automaticas.png; 06_periodo_transferencia.png; 07_vincular_manual.png; 08_novo.png; 09_pesquisar.png; 10_avisos_vinculo.png; 11_duas_movimentacoes.png; 12_conciliado_ignorado.png; 13_listagem_status.png; 14_perfil_listagem.png; 15_perfil_form.png; 16_perfil_edicao.png; 17_perfil_excluir.png; 99_rodape.png

---

![Conciliações](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

A tela **CONCILIAÇÕES** confere o extrato do banco com as movimentações lançadas no sistema. Ela mostra o que já bate, o que falta lançar e o que não deve entrar no caixa.

O objetivo é importar o extrato em arquivo OFX e ligar cada lançamento do banco a uma ou mais movimentações. Os lançamentos que não têm par podem virar movimentações novas, transferências entre contas, ou ser marcados como ignorados ou duplicados. Com isso, o saldo do sistema fica igual ao do banco.

Quem usa é a tesouraria e o contas a pagar e a receber. A tela trabalha junto com **FINANCEIRO -> MOVIMENTAÇÕES** e com as carteiras bancárias. Os **PERFIS DE CONCILIAÇÃO** automatizam a criação de movimentações recorrentes, como tarifas.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela lista os lançamentos do extrato bancário importado e permite conciliar, ignorar ou marcar como duplicado cada um. Caminho de menu: **FINANCEIRO -> OPÇÕES BANCÁRIAS -> CONCILIAÇÕES**.

Cada lançamento tem um dos status **PENDENTE**, **CONCILIADO**, **DUPLICADO** ou **IGNORADO**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A tela abre filtrada pelo status **PENDENTE**. A tela de conciliação não tem botão **NOVO**: os lançamentos entram pelo **UPLOAD** do extrato.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra os lançamentos do extrato importado, dos mais recentes para os mais antigos.

![Listagem de Conciliações](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❷ | **EXPORTAR** | Exporta a listagem em CSV ou PDF, de todas as páginas ou só da página atual. | Sempre. |
| ❸ | **UPLOAD** | Importa o extrato bancário em arquivo OFX. Escolha o banco do extrato e clique em **ENVIAR**. Os lançamentos entram na listagem com status **PENDENTE**. | Sempre. |
| ❹ | **PERFIL** | Abre o cadastro de **PERFIS DE CONCILIAÇÃO**. | Sempre. |
| ❺ | **CONCILIAR** | Abre o menu com as formas de conciliar os lançamentos selecionados. | Com pelo menos um lançamento selecionado. |
| ❻ | **IGNORAR** | Marca os lançamentos selecionados como **IGNORADO**. | Com pelo menos um lançamento selecionado. |
| ❼ | **DUPLICADO** | Marca os lançamentos selecionados como **DUPLICADO**. | Com pelo menos um lançamento selecionado. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Alguns bancos incluem no extrato lançamentos de outros períodos, normalmente lançamentos futuros, mesmo quando você filtra as datas no internet banking. No **UPLOAD** ❸, informe a data inicial e a data final desejadas. O sistema extrai do arquivo só os lançamentos desse período e ignora os demais.*</span>

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❽ | **CARTEIRA** | Filtra pela carteira bancária do extrato. |
|  | **DESCRIÇÃO** | Filtra pelo texto do lançamento no extrato. |
|  | **MOVIMENTAÇÕES** | Filtra pelo número da movimentação vinculada. |
|  | Status | **TODOS OS STATUS**, **PENDENTE**, **CONCILIADO**, **DUPLICADO** ou **IGNORADO**. |
|  | Lupa | Aplica os filtros. |
| ❿ | **FILTROS** | Abre o painel lateral com filtros adicionais. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❾ | **CÓDIGO** | Código interno do lançamento. |
|  | **AÇÃO** | Ações rápidas da linha. |
|  | **CARTEIRA** | Carteira bancária do extrato. |
|  | **DESCRIÇÃO** | Histórico do lançamento como veio do banco. |
|  | **VALOR** | Valor do lançamento: positivo em verde *(entrada)* e negativo em vermelho *(saída)*. |
|  | **DATA** | Data do lançamento no extrato. |
|  | **STATUS** | Status da conciliação, com ícone e cor. |
|  | **MOVIMENTAÇÃO** | Número da movimentação vinculada, como link. |
|  | **USUÁRIO** | Quem fez a última ação no lançamento. |
|  | **CRIAÇÃO** | Data e hora da importação. |

### ▌COLUNAS OCULTAS

| Coluna | O que mostra |
| --- | --- |
| **ATUALIZAÇÃO** | Data e hora da última alteração. |
| **NOME DO ARQUIVO** | Nome do arquivo OFX de onde veio o lançamento. |

Para exibir uma coluna oculta, abra o menu de qualquer cabeçalho da grade e marque a coluna em **COLUNAS**.

### ▌FILTROS

O painel **FILTROS** ❿ traz mais opções. Preencha e clique em **FILTRAR**.

![Painel de filtros](02_filtros.png){width=100%}

| Nº | Campo | Para que serve |
| :---: | --- | --- |
| ❶ | **VALOR MAIOR QUE** / **VALOR MENOR QUE** | Faixa de valor dos lançamentos. |
|  | **DATA DE** / **ATÉ** | Período do lançamento no extrato. |
|  | **CRIADO DE** / **ATÉ** | Período da importação. |
|  | **USUÁRIO** | Usuário que fez a última ação. |
|  | **ARQUIVO** | Nome do arquivo OFX importado. |

### ▌TOTAIS DO RODAPÉ

Ao selecionar lançamentos, aparece uma linha de totais acima da paginação.

![Lançamentos selecionados com os totais](03_selecao_rodape.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | Caixa de seleção | Marca os lançamentos que vão receber a ação. |
| ❷ | **SALDO** | Soma de todos os lançamentos selecionados. |
|  | **RECEBER** | Soma só dos valores positivos selecionados. |
|  | **PAGAR** | Soma só dos valores negativos selecionados. |

---

## <font color="#FFAE00">▌</font>CONCILIAR

Selecione um ou mais lançamentos e abra o menu do botão **CONCILIAR**. Cada opção resolve os lançamentos de um jeito.

![Menu do botão Conciliar](04_menu_conciliar.png){width=100%}

| Opção | O que faz |
| --- | --- |
| **VINCULAR AUTOMATICAMENTE (DENTRO DO MÊS)** | Pede confirmação e procura, para cada lançamento, uma movimentação de mesmo valor no mês. Lançamentos já conciliados são ignorados. |
| **VINCULAR AUTOMATICAMENTE (POR PERÍODO)** | Faz a mesma busca, mas num período que você informa em **DATA INICIAL** e **DATA FINAL**. A comparação usa a **DATA DE VENCIMENTO** das movimentações. |
| **VINCULAR MANUALMENTE** | Abre a tela de vínculo, onde você escolhe a movimentação de cada lançamento. |
| **TRANSFERÊNCIA** | Registra o lançamento como transferência entre contas. |
| **CRIAR AUTOMATICAMENTE** | Pede confirmação e cria as movimentações com base nos **PERFIS DE CONCILIAÇÃO**. Lançamentos conciliados, ignorados ou duplicados são ignorados. |

![Confirmações do vínculo automático e da criação automática](05_conf_automaticas.png){width=100%}

![Janelas Vincular Automaticamente (Por período) e Transferência entre Contas](06_periodo_transferencia.png){width=100%}

Na **TRANSFERÊNCIA**, escolha a **CARTEIRA DE ORIGEM/DESTINO** <span style="color:red;">**OBRIGATÓRIO.**</span> e uma **OBSERVAÇÃO** opcional, e clique em **TRANSFERIR**. O sistema cria duas movimentações. Para um valor positivo, cria uma movimentação a pagar na carteira escolhida. Para um valor negativo, cria uma a receber.

### ▌VINCULAR MANUALMENTE

A tela mostra, para cada lançamento selecionado, um cartão do extrato à esquerda e as movimentações do sistema à direita. O título da janela informa quantos itens foram selecionados.

![Tela de vínculo manual com dois lançamentos](07_vincular_manual.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **LANÇAMENTOS DO EXTRATO BANCÁRIO** | **DATA**, **VALOR** e **DETALHAMENTO** do lançamento, como veio do banco. |
| ❷ | **CONCILIAR**, **IGNORAR**, **DUPLICADO** | Ações para aquele lançamento. |
| ❸ | **LANÇAMENTOS CADASTRADOS NO SISTEMA** | Movimentações vinculadas ao lançamento. Sem vínculo, mostra **SEM CONCILIAÇÃO**. |
| ❹ | **NOVO** | Cria uma movimentação nova para o lançamento. |
| ❺ | **PESQUISAR** | Abre a tela **MOVIMENTAÇÕES** para escolher uma movimentação existente. |

Um lançamento também abre sozinho nesta tela com dois cliques na listagem.

### ▌NOVO

O **NOVO** troca a área da direita por um formulário curto de movimentação.

![Formulário Novo no vínculo](08_novo.png){width=100%}

| Nº | Campo | Para que serve |
| :---: | --- | --- |
| ❶ | **CLIENTE/FORNECEDOR** | Favorecido da movimentação. A lupa busca ou cadastra *(tecla F2)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  | **PLANO DE CONTAS** | Classificação da movimentação. |
|  | **FORMA PGTO.** | **DINHEIRO**, **CHEQUE**, **TRANSFERÊNCIA**, **DEPÓSITO**, **CARTÃO**, **BOLETO**, **DÉBITO EM CONTA**, **PIX** ou **CRÉDITO EM CONTA**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  | **VENCIMENTO** | Vem com a data do lançamento. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  | **COMPETÊNCIA** | Mês de competência. |
|  | **C. CUSTO** | Centro de custo. |
|  | **OBSERVAÇÃO** | Texto livre. |
| ❷ | **SALVAR E CRIAR** | Cria a movimentação e a vincula ao lançamento. |
| ❸ | **VOLTAR** | Volta para a área de vínculo sem salvar. |

### ▌PESQUISAR

O **PESQUISAR** abre a tela **MOVIMENTAÇÕES** já com o vencimento na data do lançamento. Use a aba **PAGAR** ou **RECEBER** conforme o sinal do valor e ajuste o período, se precisar.

![Tela Movimentações aberta pelo Pesquisar](09_pesquisar.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **TOTAL**, **LÍQUIDO**, **PAGO**, **SALDO** | Soma das movimentações marcadas. |
| ❷ | **USAR X MOVIMENTAÇÃO SELECIONADA** | Leva as movimentações marcadas para o lançamento. |

Dois cliques numa movimentação também a levam para o lançamento.

![Avisos ao vincular: valores diferentes e parcela não aprovada](10_avisos_vinculo.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Se a soma das movimentações for diferente do valor do lançamento, o sistema pergunta se deseja continuar com o atrelamento. Movimentações sem aprovação são recusadas com "A movimentação precisa estar aprovada antes de ser conciliada!".*</span>

### ▌UM LANÇAMENTO COM VÁRIAS MOVIMENTAÇÕES

Um lançamento do extrato pode corresponder a duas ou mais movimentações, como um PIX que paga duas parcelas. Repita o **PESQUISAR** e inclua cada movimentação. Todas aparecem na área da direita, e o ícone vermelho ao lado de cada uma tira o vínculo.

![Duas movimentações no mesmo lançamento](11_duas_movimentacoes.png){width=100%}

Depois clique em **CONCILIAR** no cartão. O sistema confirma a conciliação de cada movimentação, e o lançamento passa a **CONCILIADO**.

### ▌IGNORAR E DUPLICADO

**IGNORAR** marca o lançamento como **IGNORADO**. Use quando ele não deve gerar movimentação, como uma aplicação automática. O cartão passa a mostrar **IGNORADO**.

![Primeiro lançamento conciliado e segundo ignorado](12_conciliado_ignorado.png){width=100%}

**DUPLICADO** marca o lançamento como **DUPLICADO**, quando ele já foi conciliado por outro lançamento do extrato. Pela listagem, os dois botões pedem confirmação e valem para todos os lançamentos selecionados.

![Listagem com os quatro status](13_listagem_status.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Marcar como **DUPLICADO** ou **IGNORADO** um lançamento que já tem movimentação vinculada desfaz o vínculo. O sistema avisa antes de prosseguir.*</span>

### ▌DESFAZER UMA CONCILIAÇÃO

Abra o lançamento conciliado com dois cliques e clique em **CONCILIAR**. O sistema pergunta se deseja desvincular as movimentações e voltar o status para **PENDENTE**.

---

## <font color="#FFAE00">▌</font>PERFIL DE CONCILIAÇÃO

O perfil ensina o sistema a reconhecer lançamentos recorrentes pela descrição, como tarifas, impostos e rendimentos. Com ele, o **CRIAR AUTOMATICAMENTE** gera a movimentação certa sem digitação. O botão **PERFIL** abre a janela **CONFIGURAÇÃO DE PERFIL DE CONCILIAÇÃO**.

### ▌LISTAGEM DE PERFIS

![Listagem de perfis de conciliação](14_perfil_listagem.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **NOVO** | Abre o formulário de um novo perfil. |
| ❷ | **REMOVER** | Exclui os perfis selecionados, depois de confirmação. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. |
| ❺ | **NOME DO PERFIL**, **DETALHAMENTO** e lupa | Filtram a listagem. |
| ❻ | Colunas | **CÓDIGO**, **NOME**, **DETALHAMENTO**, **FILTRO**, **CARTEIRA**, **CRIAÇÃO**, **ATUALIZAÇÃO** e **ATIVO**. Oculta: **FORMA DE PAGAMENTO**. |

### ▌FORMULÁRIO DO PERFIL

![Formulário de novo perfil](15_perfil_form.png){width=70%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Cabeçalho | **CÓDIGO**, **CADASTRO**, **ATUALIZAÇÃO** | Preenchidos pelo sistema ao salvar. |
| ❷ | **IDENTIFICAÇÃO** | **NOME DO PERFIL** | Nome para achar o perfil. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **DETALHAMENTO** | Texto procurado na descrição do lançamento do extrato. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **FILTRO** | Como o texto é comparado: **CONTÉM**, **COMEÇA COM**, **TERMINA COM** ou **IGUAL**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❸ | **DADOS DA MOVIMENTAÇÃO** | **CLIENTE/ FORNECEDOR** | Favorecido da movimentação criada. A lupa busca ou cadastra *(tecla F2)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **PLANO DE CONTAS** | Classificação da movimentação. |
|  |  | **CARTEIRA** | Limita o perfil a uma carteira. Vazio, vale para todas. |
|  |  | **FORMA DE PAGAMENTO** | **DINHEIRO**, **CHEQUE**, **TRANSFERÊNCIA**, **DEPÓSITO**, **CARTÃO**, **BOLETO**, **DÉBITO EM CONTA**, **PIX** ou **CRÉDITO EM CONTA**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CENTRO DE CUSTO** | Centro de custo da movimentação. |
|  |  | **DESCRIÇÃO PREFERENCIAL** | Descrição usada na movimentação criada. |
| ❹ | Rodapé | **SALVAR**, **SALVAR & NOVO**, **ATIVO** | Grava o perfil; grava e abre outro em branco; liga ou desliga o perfil. |
| ❺ | Rodapé | **FECHAR** | Fecha sem salvar. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Use **CONTÉM** com um trecho fixo da descrição (ex.: "TARIFA BANCARIA") para pegar todas as variações que o banco envia.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O **FILTRO** não diferencia letras maiúsculas de minúsculas nem considera acentos. Um **DETALHAMENTO** escrito "tarifa bancaria" encontra lançamentos com "TARIFA BANCARIA", "Tarifa Bancária" ou "tarifa BANCÁRIA".*</span>

### ▌EDITAR UM PERFIL

Dê dois cliques no perfil na listagem. A janela abre com o título **PERFIL DE CONCILIAÇÃO - NOME DO PERFIL** e todos os campos preenchidos.

![Perfil aberto para edição](16_perfil_edicao.png){width=70%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro. Ao salvar, aparece "Item editado com sucesso!".*</span>

### ▌EXCLUIR UM PERFIL

Selecione o perfil na listagem e clique em **REMOVER**. Confirme com **SIM**.

![Confirmação da exclusão](17_perfil_excluir.png){width=40%}

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Com o parâmetro **GERENCIAR APROVAÇÃO DE MOVIMENTAÇÕES** ligado, só movimentações a pagar **APROVADAS** podem ser conciliadas. A aprovação é feita em **MOVIMENTAÇÕES -> APROVAR PARCELAS**.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O **RELATÓRIO DE CONCILIAÇÃO BANCÁRIA** acompanha os lançamentos por status e fica no menu **RELATÓRIOS** da própria tela.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

