# Gatilhos

- ID: PO-A-189
- Caminho: 🛟 BASE DE CONHECIMENTO > OPÇÕES > AUTOMAÇÕES > Gatilhos
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-189
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_avancada.png; 04_form_edicao.png; 99_rodape.png; 00_banner_v2.png

---

![Gatilhos](00_banner_v2.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Na operação, muitas tarefas precisam acontecer logo depois de uma ação no sistema: gerar a fatura quando um CT-e é faturado, avisar alguém quando um documento é emitido, impedir uma ação quando um dado obrigatório está faltando. Fazer isso à mão depende de alguém lembrar, e abre espaço para atrasos e esquecimentos.

Os **GATILHOS** existem para ligar uma automação a um acontecimento do sistema. Cada gatilho diz em qual módulo prestar atenção *(ex.: **CT-E**, **FATURA**, **PESSOAS**)*, em qual ação *(ex.: **CRIAR**, **EMITIR**, **FATURAR**)*, se a automação roda antes ou depois dessa ação e, opcionalmente, em quais condições ela deve rodar ou bloquear a ação.

O objetivo é que as rotinas repetitivas aconteçam sozinhas, no momento certo, sem depender da memória de quem opera. Quem configura os gatilhos normalmente é o administrador do sistema ou a equipe de implantação, junto com o suporte da Siimp nos casos de edição avançada.

A tela se apoia nas automações cadastradas em **OPÇÕES -> AUTOMAÇÕES -> AUTOMAÇÕES**: o gatilho só define quando a automação dispara; o que ela faz fica na própria automação.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **GATILHOS** lista os gatilhos cadastrados e permite criar, editar e remover gatilhos. Cada gatilho liga uma automação a uma ação de um módulo do sistema.

Caminho: **OPÇÕES -> AUTOMAÇÕES -> GATILHOS**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A tela abre numa janela própria, separada da tela **AUTOMAÇÕES**, que fica no mesmo submenu.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todos os gatilhos cadastrados, com o momento em que disparam e se estão ativos.

![Listagem de gatilhos](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar um novo gatilho. | Sempre. |
| ❷ | **REMOVER** | Remove os gatilhos marcados na listagem. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **NOME** | Filtra pelo nome do gatilho. |
|  | **AUTOMAÇÃO** | Filtra pelos gatilhos ligados à automação escolhida. A lista traz as automações cadastradas em **OPÇÕES -> AUTOMAÇÕES -> AUTOMAÇÕES**. |
|  | **ATIVO?** | Filtra por gatilhos ativos *(**SIM**)* ou inativos *(**NÃO**)*. |
|  | **LUPA** | Aplica os filtros preenchidos. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **CÓDIGO** | Número de identificação do gatilho, gerado pelo sistema. |
|  | **NOME** | Nome dado ao gatilho. |
|  | **QUANDO?** | Se a automação roda antes ou depois da ação *(campo **POSIÇÃO** do formulário)*. |
|  | **STATUS** | Se o gatilho está ativo *(**SIM**)* ou inativo *(**NÃO**)*. |
|  | **CRIADO EM** | Data e hora do cadastro. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para remover vários gatilhos de uma vez, marque as caixas de seleção das linhas e clique em **REMOVER** ❷.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** da listagem, na janela **NOVO GATILHO**.

![Formulário de um novo gatilho](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Código e datas | **CÓDIGO** | Número do gatilho, gerado pelo sistema ao salvar. |
|  |  | **CADASTRO** | Data e hora em que o gatilho foi criado. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. |
| ❷ | **DADOS PRINCIPAIS** | **NOME DO GATILHO** | Nome que identifica o gatilho na listagem. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **AUTOMAÇÃO** | Automação que será executada quando o gatilho disparar. A lista traz as automações cadastradas em **OPÇÕES -> AUTOMAÇÕES -> AUTOMAÇÕES**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **POSIÇÃO** | Se a automação roda antes ou depois da ação escolhida em **QUANDO**. Opções: Antes, Depois. Vem preenchido com Depois. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **MÓDULO** | Módulo do sistema em que o gatilho fica de olho. Opções: Atracações e Aterrissagens, CIOT, CT-e, Central de CT-es, Central de Notas, Cotação, Fatura, MDF-e, Minuta, NFS-e, Ocorrências, Ordem de Coleta, Pessoas, Programação de Carga, Programação de Viagem, Romaneio, Vale Pedágio, Veículos. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **QUANDO** | Ação do módulo que dispara o gatilho. As opções mudam conforme o **MÓDULO**; no CT-e: Atualizar, Calcular Frete, Cancelar, Criar, Duplicar, Emitir, Faturar. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❸ | **CONDIÇÕES** *(inclusão)* | **AÇÃO** | Define o que a condição faz. Opções: Bloquear se, Validar se. Vem preenchido com Validar se. |
|  |  | **CAMPO (NOTAÇÃO AVANÇADA)** | Campo do registro a ser verificado, escrito em notação avançada. |
|  |  | **CONDIÇÃO** | Comparação aplicada ao campo. Opções: está vazio, não está vazio, contém, não contém, começa com, não começa com, termina com, não termina com, maior que, maior ou igual a, menor que, menor ou igual a, igual a, diferente de, contém chave, não contém chave. |
|  |  | **VALOR (NOTAÇÃO AVANÇADA)** | Valor usado na comparação, em notação avançada. |
|  |  | **ADICIONAR** e **REMOVER** | Incluem a condição preenchida na grade ou removem as condições marcadas. |
| ❹ | **CONDIÇÕES** *(grade)* | **AÇÃO**, **CAMPO**, **CONDIÇÃO**, **VALORES SELECIONADOS** | Lista as condições já incluídas no gatilho. |
| ❺ | Barra de ações | **SALVAR** | Grava o gatilho. |
|  |  | **ATIVO?** | Liga ou desliga o gatilho. Vem marcado no cadastro. |
|  |  | **EDIÇÃO AVANÇADA** | Troca **MÓDULO** e **QUANDO** pelo campo **AO EXECUTAR** *(ver abaixo)*. |
|  |  | **FECHAR** | Fecha o formulário sem salvar. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Um gatilho só dispara se estiver com **ATIVO?** marcado. Gatilhos inativos aparecem com **NÃO** na coluna **STATUS** da listagem.*</span>

### ▌EDIÇÃO AVANÇADA

Ao marcar **EDIÇÃO AVANÇADA** ❷, os campos **MÓDULO** e **QUANDO** somem e aparece o campo **AO EXECUTAR** ❶.

![Formulário com a Edição Avançada marcada](03_form_avancada.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **DADOS PRINCIPAIS** | **AO EXECUTAR** | Define em notação de programação quando o gatilho dispara, no lugar de **MÓDULO** e **QUANDO**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❷ | Barra de ações | **EDIÇÃO AVANÇADA** | Liga ou desliga o modo avançado. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O próprio campo orienta a configurar **AO EXECUTAR** com o suporte da Siimp. Não preencha sem essa orientação.*</span>

### ▌EDITAR UM GATILHO

Para editar, dê um duplo clique na linha do gatilho na listagem. A janela abre com o nome do gatilho no título e com todos os campos preenchidos, incluindo **CÓDIGO**, **CADASTRO** e **ATUALIZAÇÃO**.

![Gatilho aberto para edição](04_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os gatilhos disparam a automação escolhida mesmo quando ela está inativa. Isso é útil quando uma automação não pode rodar automaticamente e deve ser executada somente por meio de um gatilho.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
