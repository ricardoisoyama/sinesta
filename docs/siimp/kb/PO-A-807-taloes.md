# Talões

- ID: PO-A-807
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > CHEQUES > Talões
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-807
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_edicao.png; 99_rodape.png

---

![Talões de Cheque](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Quem paga fornecedores e despesas com cheque precisa saber quais folhas cada talão tem, qual é o próximo número livre e quais talões ainda podem ser usados. O módulo **TALÕES** existe para registrar esses talões no sistema, cada um ligado à carteira *(conta bancária)* de onde os cheques saem.

O objetivo é controlar a numeração e a situação de cada talão. Com o talão cadastrado, o sistema sugere o número do próximo cheque na tela **CHEQUES** e mostra todos os cheques já lançados nele. O talão pode ser ativado, inativado, finalizado, reaberto ou inutilizado conforme o uso.

O módulo é usado pela área financeira, em especial por quem cuida de contas a pagar. Ele se liga às **CARTEIRAS** *(cadastro das contas)*, à tela **CHEQUES** *(emissão, impressão e liquidação)* e às **MOVIMENTAÇÕES** financeiras pagas com esses cheques.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **TALÕES DE CHEQUE** lista os talões cadastrados, permite criar e editar talões e muda a situação de um ou vários talões de uma vez. Fica em **FINANCEIRO -> CHEQUES -> TALÕES**.

Um talão passa por quatro situações *(status)*:

| Status | O que significa |
| --- | --- |
| **ATIVO** | Talão disponível para uso. É o status de todo talão novo. |
| **FINALIZADO** | Talão encerrado *(por exemplo, quando as folhas acabaram)*. Pode ser reaberto. |
| **INATIVO** | Talão fora de uso temporariamente. Pode ser ativado de novo. |
| **INUTILIZADO** | Talão que não deve mais ser usado *(por perda, roubo ou dano)*. Exige um motivo. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O status não é escolhido no formulário. Ele muda pelos botões **ATIVAR**, **INATIVAR**, **FINALIZAR**, **REABRIR** e **INUTILIZAR** da listagem.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todos os talões cadastrados, com a carteira, a numeração e o status de cada um.

![Listagem de Talões de Cheque](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário **NOVO TALÃO**. | Sempre. |
| ❷ | **REMOVER** | Exclui os talões selecionados. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❺ | **ATIVAR** | Muda os talões selecionados para **ATIVO**, após confirmação. | Sempre. |
| ❻ | **INATIVAR** | Muda os talões selecionados para **INATIVO**, após confirmação. | Sempre. |
| ❼ | **FINALIZAR** | Muda os talões selecionados para **FINALIZADO**, após confirmação. | Sempre. |
| ❽ | **REABRIR** | Volta os talões selecionados para **ATIVO**, após confirmação. | Sempre. |
| ❾ | **INUTILIZAR** | Muda o talão para **INUTILIZADO**. Abre uma janela para descrever o motivo da inutilização. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❿ | **DT CRIAÇÃO** | Filtra pela data de cadastro do talão. |
| | **TODAS AS CARTEIRAS** | Filtra pela carteira do talão. |
| | **DESCRIÇÃO** | Filtra pela descrição do talão. |
| | **Nº SÉRIES** | Filtra pela série do talão. |
| | **Nº CHEQUES** | Filtra pelo número de um cheque do talão. |
| | **STATUS** | Filtra pelo status: Ativo, Finalizado, Inativo ou Inutilizado. |
| | **LUPA** *(BUSCAR)* | Aplica os filtros preenchidos. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ⓫ | **CARTEIRA** | Carteira *(conta bancária)* do talão. |
| | **AÇÃO** | Resultado da última ação feita no talão pela barra de botões: **SUCESSO!** ou **ERRO!**. No erro, o motivo aparece ao passar o mouse. |
| | **SERIE** | Série do talão. |
| | **DESCRIÇÃO** | Descrição do talão. |
| | **Nº INICIAL** | Número da primeira folha. |
| | **Nº FOLHAS** | Quantidade de folhas do talão. |
| | **PRÓXIMO** | Próximo número de cheque que será usado. |
| | **STATUS** | Situação do talão: Ativo, Finalizado, Inativo ou Inutilizado. |
| | **CRIADO EM** | Data e hora do cadastro. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Selecione vários talões pelas caixas de marcação da primeira coluna para mudar o status de todos de uma vez.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os botões de status confirmam a ação com a pergunta "Você deseja ... todos os talões de cheques selecionados na tela?". Confira a seleção antes de responder **SIM**.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, com o título **NOVO TALÃO**.

![Formulário de Novo Talão](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Identificação | **CARTEIRA** | Carteira *(conta bancária)* de onde saem os cheques do talão. Lista as carteiras cadastradas. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **CÓDIGO** | Código do talão, gerado ao salvar. Só leitura. |
| | | **CADASTRO** | Data e hora do cadastro. Só leitura. |
| | | **ATUALIZAÇÃO** | Data e hora da última alteração. Só leitura. |
| | | **STATUS** | Situação do talão. Todo talão novo nasce **ATIVO**. Só leitura: muda pelos botões da listagem. |
| ❷ | Informações do Talão | **SÉRIE** | Série impressa no talão. |
| | | **DESCRIÇÃO** | Nome que identifica o talão nas listas e no campo **TALÃO** da tela **CHEQUES**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **Nº INICIAL** | Número da primeira folha do talão. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **Nº FOLHAS** | Quantidade de folhas do talão. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **PRÓXIMO Nº** | Número que o próximo cheque lançado no talão vai receber. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❸ | Cheques do Talão | **GRADE** | Lista os cheques lançados no talão *(ver abaixo)*. Fica vazia no talão novo. |
| ❹ | Totais | **QUANTIDADE DE CHEQUES** | Total de cheques lançados no talão. |
| ❺ | Botões | **SALVAR & NOVO** | Salva o talão e abre um formulário em branco. |
| | | **SALVAR** | Salva o talão e mantém o formulário aberto. |
| | | **FECHAR** | Fecha o formulário. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O resultado de cada gravação aparece na faixa logo acima dos botões, por exemplo "Item cadastrado com sucesso!".*</span>

### ▌CHEQUES DO TALÃO

A grade mostra os cheques já lançados no talão, na tela **FINANCEIRO -> CHEQUES -> CHEQUES**. Os cheques não são criados aqui.

| Coluna | O que mostra |
| --- | --- |
| **Nº CHEQUE** | Número do cheque, em forma de link. |
| **PAGAMENTO** | Data de pagamento do cheque. |
| **COMPENSAÇÃO** | Data de compensação, quando houver. |
| **TOTAL** | Valor do cheque. |
| **QTD. ITENS** | Quantidade de movimentações pagas pelo cheque. |
| **STATUS** | Situação do cheque: Cadastrado, Emitido, Liquidado ou Cancelado. |
| **DESCRIÇÃO** | Descrição do cheque. |
| **INSERIDO EM** | Data e hora em que o cheque foi lançado. |

### ▌EDITAR UM TALÃO

Para editar, dê um duplo clique no talão na listagem. A janela abre com a descrição do talão no título e todos os campos preenchidos, além da grade com os cheques já lançados e o total em **QUANTIDADE DE CHEQUES**.

![Talão aberto para edição](03_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O campo **PRÓXIMO Nº** define o número do próximo cheque lançado no talão. Ao cadastrar um talão, preencha esse campo com o mesmo valor de **Nº INICIAL**, a menos que algumas folhas já tenham sido usadas fora do sistema.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*A inutilização exige que o motivo seja descrito na janela que abre ao clicar em **INUTILIZAR**.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Na tela **CHEQUES**, o talão é escolhido pelo campo **TALÃO**, que busca pela descrição a partir de 4 caracteres digitados. Por isso, use descrições fáceis de lembrar.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

