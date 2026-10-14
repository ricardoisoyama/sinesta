# Pagamentos

- ID: PO-A-607
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > CONFIGURAÇÕES > Pagamentos
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-607
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_edicao.png; 99_rodape.png

---

![Classificação de Pagamentos](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

No pagamento de um terceiro ou motorista, nem todo valor é igual. Há adiantamentos, parcelas intermediárias, o saldo final, vales de abastecimento, pedágio, diárias e descontos. Cada um precisa ser identificado para o acerto e para o financeiro.

A tela **PAGAMENTOS** existe para cadastrar essas classificações. Cada classificação diz se o valor é um débito ou um crédito, a que categoria pertence e, se for o caso, qual perfil de terceiro, conta do plano de contas e taxa usar. O objetivo é que os lançamentos de pagamento sejam feitos de forma padronizada e cheguem ao financeiro já classificados.

Quem usa: a área financeira e os responsáveis pela configuração da empresa no sistema. As classificações cadastradas aqui são usadas nos pagamentos a terceiros e se relacionam com os **PERFIS DE TERCEIRO**, o **PLANO DE CONTAS** e as **TAXAS** cadastradas no sistema.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **CONFIGURAÇÃO DE CLASSIFICAÇÃO DE PAGAMENTOS** lista, cadastra, edita e remove as classificações usadas nos pagamentos.

Caminho: **EMPRESA -> CONFIGURAÇÕES -> PAGAMENTOS** *(menu do usuário, no canto superior direito)*.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todas as classificações de pagamento cadastradas, com código, nome e tipo.

![Listagem de classificações de pagamento](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar uma nova classificação. | Sempre. |
| ❷ | **REMOVER** | Remove a classificação selecionada na listagem. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **NOME** | Filtra a listagem pelo nome da classificação. |
|  | **BUSCAR** *(lupa)* | Aplica o filtro digitado. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **#** | Código da classificação, gerado pelo sistema. |
|  | **NOME** | Nome da classificação. |
|  | **TIPO** | Se a classificação é **DÉBITO** ou **CRÉDITO**. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Clique no título de uma coluna para ordenar a listagem por ela. Por padrão, a listagem abre ordenada por **TIPO**.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, na janela **CLASSIFICAÇÃO DE PAGAMENTO**. Ele não tem abas: todos os campos ficam em uma única tela.

![Formulário de nova classificação de pagamento](02_form_novo.png){width=60%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **IDENTIFICAÇÃO** | **CÓDIGO** | Código da classificação, gerado pelo sistema ao salvar. Somente leitura. |
|  |  | **CADASTRO** | Data e hora em que a classificação foi criada. Somente leitura. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. Somente leitura. |
| ❷ | **DADOS DA CLASSIFICAÇÃO DE PAGAMENTO** | **NOME** | Nome da classificação *(ex.: ABASTECIMENTO, PEDÁGIO, DIÁRIA)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **TIPO** | Se o valor é **DÉBITO** ou **CRÉDITO**. Vem preenchido com **DÉBITO**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CATEGORIA** | Categoria do pagamento: **ADIANTAMENTO**, **INTERMEDIÁRIA**, **SALDO FINAL (QUITAÇÃO)**, **VALE ABASTECIMENTO**, **COMBUSTÍVEL**, **DIÁRIA**, **DESPESA**, **OUTROS** ou **PEDÁGIO**. Vem preenchido com **INTERMEDIÁRIA**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **PERFIL DE TERCEIRO** | Perfil de terceiro vinculado à classificação. Lista os perfis cadastrados na empresa. |
|  |  | **PLANO DE CONTAS** | Código da conta do plano de contas usada nos lançamentos dessa classificação. Ao lado, o sistema mostra o nome da conta *("Vazio." quando não há conta)*. |
| ❸ |  | **PROCURAR CATEGORIA** *(lupa)* | Abre a busca de contas do plano de contas, para escolher a conta sem digitar o código. |
|  |  | **TAXA** | Taxa vinculada à classificação. Lista as taxas cadastradas na empresa. |
| ❹ | **BARRA INFERIOR** | **SALVAR & NOVO** | Salva a classificação e abre um formulário em branco para cadastrar outra. |
|  |  | **SALVAR** | Salva a classificação. |
|  |  | **DESCONTAR IMPOSTOS** | Indica se os impostos são descontados nos pagamentos dessa classificação. Vem marcado. |
|  |  | **FECHAR** | Fecha o formulário. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os campos **NOME**, **TIPO** e **CATEGORIA** são obrigatórios. Confira **TIPO** e **CATEGORIA** antes de salvar, porque eles já vêm preenchidos e podem passar despercebidos.*</span>

### ▌EDITAR UMA CLASSIFICAÇÃO

Para editar, dê um duplo clique na linha da classificação na listagem. O formulário abre na mesma janela **CLASSIFICAÇÃO DE PAGAMENTO**, com todos os campos preenchidos e com **CÓDIGO**, **CADASTRO** e **ATUALIZAÇÃO** informados.

![Classificação de pagamento aberta para edição](03_form_edicao.png){width=60%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
