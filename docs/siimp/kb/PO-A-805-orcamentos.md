# Orçamentos

- ID: PO-A-805
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > Orçamentos
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-805
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_validacao.png; 04_form_preenchido.png; 05_confirmacao.png; 06_exemplo_valor.png; 07_exemplo_porcentagem.png; 08_duplicar_confirma.png; 09_duplicar_form.png; 10_duplicar_erro.png; 11_form_edicao.png; 99_rodape.png

---

![Orçamentos](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

O módulo de **ORÇAMENTOS** existe para a empresa planejar quanto pretende gastar ou receber em cada área antes que o período comece. Sem um orçamento definido, fica difícil saber se as despesas de um setor estão dentro do esperado.

O objetivo é registrar, para cada **CENTRO DE CUSTO** e período de validade, o valor previsto em cada categoria do **PLANO DE CONTAS**. O valor pode ser informado diretamente ou como porcentagem da categoria superior, e o sistema soma os níveis automaticamente.

O módulo é usado principalmente pelas áreas financeira e administrativa, responsáveis pelo planejamento e pelo controle de gastos.

Ele se apoia em dois cadastros do sistema: os **CENTROS DE CUSTO** e o **PLANO DE CONTAS** *(**FINANCEIRO -> PLANO DE CONTAS**)*, cujas categorias formam a estrutura de cada orçamento.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **ORÇAMENTOS** lista os orçamentos cadastrados e permite criar, editar, duplicar e remover orçamentos. Cada orçamento une uma empresa *(ou todas)*, um centro de custo, um período de validade e os valores previstos por categoria do plano de contas.

Caminho: **FINANCEIRO -> ORÇAMENTO**.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todos os orçamentos cadastrados, do mais recente para o mais antigo, com a empresa, o centro de custo e o período de validade de cada um.

![Listagem de orçamentos](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar um novo orçamento. | Sempre. |
| ❷ | **REMOVER** | Remove os orçamentos marcados na listagem. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem com os dados mais recentes. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❺ | **DUPLICAR** | Cria uma cópia do orçamento selecionado para um novo período de validade *(ver **▌DUPLICAR UM ORÇAMENTO**)*. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❻ | **TODAS AS EMPRESAS** | Filtra os orçamentos de uma empresa. |
|  | **CENTRO DE CUSTO** | Filtra os orçamentos de um centro de custo. |
|  | **VÁLIDO DE** | Filtra pela data de início da validade. |
|  | **VÁLIDO ATÉ** | Filtra pela data de fim da validade. |
|  | **LUPA** | Aplica os filtros informados. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❼ | **EMPRESA** | Empresa do orçamento. Mostra **TODAS** quando o orçamento vale para todas as empresas. |
|  | **CENTRO DE CUSTO** | Centro de custo do orçamento. |
|  | **VÁLIDO DE** | Data de início da validade. |
|  | **VÁLIDO ATÉ** | Data de fim da validade. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para abrir um orçamento, dê um duplo clique na linha dele.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, na janela **NOVO ORÇAMENTO**.

![Formulário de novo orçamento](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Identificação | **EMPRESA** | Empresa à qual o orçamento pertence. Lista as empresas cadastradas. Se ficar vazio, o orçamento vale para todas e aparece como **TODAS** na listagem. |
|  |  | **CÓDIGO** | Número do orçamento, gerado pelo sistema ao salvar. |
|  |  | **CADASTRO** | Data e hora em que o orçamento foi salvo pela primeira vez. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. |
| ❷ | Período | **CENTRO DE CUSTOS** | Centro de custo que o orçamento controla. Digite parte do nome para buscar. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **VÁLIDO DE** | Primeiro dia de validade do orçamento. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **VÁLIDO ATÉ** | Último dia de validade do orçamento. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❸ | Planos de contas | **PLANOS DE CONTAS** | Árvore com todas as categorias do plano de contas, onde se informa o valor previsto de cada uma *(ver **▌PLANOS DE CONTAS**)*. |
| ❹ | Mensagens | **BARRA DE MENSAGENS** | Mostra o resultado de cada ação: erros, categoria atualizada e confirmação de gravação. |
| ❺ | Ações | **SALVAR** | Grava o orçamento. A janela continua aberta, passa a se chamar **ORÇAMENTO** seguido do código *(ex.: **ORÇAMENTO 26**)* e mostra a mensagem "Item cadastrado com sucesso!". |
| ❻ | Ações | **FECHAR** | Fecha a janela. O que não foi salvo é descartado. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Ao salvar sem preencher **CENTRO DE CUSTOS**, **VÁLIDO DE** e **VÁLIDO ATÉ**, os campos ficam em vermelho e a barra de mensagens mostra "Erro: Preencha todos os campos em vermelho!".*</span>

![Validação dos campos obrigatórios](03_validacao.png){width=100%}

### ▌PLANOS DE CONTAS

A árvore mostra as categorias do plano de contas em níveis: pastas são categorias que agrupam outras, e as folhas são as categorias finais. Clique no **+** para expandir uma pasta. Para informar um valor ou uma porcentagem, dê um duplo clique na célula da categoria, digite e pressione **ENTER**.

![Planos de contas preenchidos](04_form_preenchido.png){width=100%}

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❶ | **CÓDIGO** e **CATEGORIAS** | Código e nome de cada categoria do plano de contas. Não são editáveis. |
| ❷ | **PORCENTAGEM** | Parte do valor da categoria superior que fica para esta categoria, de 0 a 100, com até 2 casas decimais. Na categoria superior, mostra a soma das porcentagens das categorias abaixo dela. |
| ❸ | **VALOR** | Valor previsto para a categoria, em reais, com 2 casas decimais. Na categoria superior, mostra a soma dos valores das categorias abaixo dela. |
| ❹ | **BARRA DE MENSAGENS** | Confirma cada alteração, por exemplo: "Categoria (8839 - LUBRIFICANTES) atualizada com a porcentagem (20%)." |

Como os valores se relacionam:

- **POR VALOR:** ao informar o valor de uma categoria, ele é somado automaticamente nas categorias acima. No exemplo, **PNEUS** *(R$ 2.000,00)* e **PEÇAS E REPAROS** *(R$ 3.000,00)* somam R$ 5.000,00 em **MANUTENÇÃO DA FROTA PESADA** e em **MANUTENÇÃO DE VEÍCULOS**.
- **POR PORCENTAGEM:** ao informar a porcentagem de uma categoria, o sistema calcula o valor sobre o valor da categoria superior. No exemplo, **LUBRIFICANTES** com 20% de R$ 5.000,00 fica com R$ 1.000,00.
- **VALOR DIRETO NA CATEGORIA SUPERIOR:** também é possível informar o valor diretamente numa pasta. Nesse caso, o sistema pergunta se deve recalcular as categorias abaixo que usam porcentagem.

![Confirmação ao alterar uma categoria superior](05_confirmacao.png){width=100%}

Na janela **ALTERAÇÃO DE VALORES**, **SIM** aplica o novo valor, recalcula as categorias com porcentagem e atualiza os níveis acima. **NÃO** desfaz a alteração.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O sistema não impede que as porcentagens das categorias de um mesmo nível somem mais de 100%. Confira a soma mostrada na categoria superior antes de salvar.*</span>

### ▌EXEMPLOS

**ORÇAMENTO MONTADO POR VALOR:** no orçamento abaixo, cada categoria de **MATERIAIS DE CONSUMO** recebeu um valor, e a pasta mostra o total de R$ 3.000,00 *(R$ 800,00 + R$ 450,00 + R$ 250,00 + R$ 1.500,00)*.

![Exemplo de orçamento por valor](06_exemplo_valor.png){width=100%}

**ORÇAMENTO MONTADO POR PORCENTAGEM:** aqui a pasta **MATERIAIS DE CONSUMO** recebeu R$ 40.000,00, e cada uma das quatro categorias abaixo dela ficou com 25%, ou seja, R$ 10.000,00. A pasta mostra 100%, a soma das porcentagens. No mesmo orçamento, **DESPESAS FINANCEIRAS** foi preenchida por valor *(R$ 750,00 em **TARIFAS BANCÁRIAS**)*.

![Exemplo de orçamento por porcentagem](07_exemplo_porcentagem.png){width=100%}

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Use a porcentagem quando quiser dividir um valor total entre as categorias, e o valor quando já souber quanto cada categoria deve gastar.*</span>

### ▌DUPLICAR UM ORÇAMENTO

Para repetir um orçamento em outro período, marque-o na listagem e clique em **DUPLICAR** ❺. O sistema pede uma confirmação.

![Confirmação de duplicação](08_duplicar_confirma.png){width=100%}

Ao clicar em **SIM**, abre a janela **DUPLICAR ORÇAMENTO**, que pede o novo período.

![Janela de duplicação](09_duplicar_form.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **ATENÇÃO** | Explica a regra: só pode existir um orçamento por centro de custo em um mesmo período de validade. |
| ❷ | **VÁLIDO DE** | Primeiro dia de validade do novo orçamento. |
|  | **VÁLIDO ATÉ** | Último dia de validade do novo orçamento. |
| ❸ | **BARRA DE MENSAGENS** | Mostra erros, como período sobreposto. |
| ❹ | **DUPLICAR** | Cria o novo orçamento com a mesma empresa, o mesmo centro de custo e os mesmos valores e porcentagens do original. |
| ❺ | **CANCELAR** | Fecha a janela sem duplicar. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Se o novo período se sobrepuser a outro orçamento do mesmo centro de custo, o sistema não duplica e mostra uma mensagem como "Erro: O orçamento 26 termina em 30/11/2026! Este orçamento deve iniciar depois!".*</span>

![Erro de período sobreposto](10_duplicar_erro.png){width=100%}

### ▌EDITAR UM ORÇAMENTO

Para editar, dê um duplo clique na linha do orçamento na listagem. A janela abre com o título **ORÇAMENTO** seguido do código, com os campos, o código, as datas de cadastro e atualização e os valores da árvore já preenchidos.

![Orçamento aberto para edição](11_form_edicao.png){width=100%}

Ao salvar uma alteração, a barra de mensagens mostra "Item editado com sucesso!".

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos, a árvore de planos de contas e os botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Só pode existir um orçamento por centro de custo em um mesmo período de validade. Antes de criar um orçamento, confira na listagem se o centro de custo já tem um orçamento no período.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A estrutura da árvore de planos de contas vem do cadastro do plano de contas. Para incluir ou renomear categorias, use **FINANCEIRO -> PLANO DE CONTAS**.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
