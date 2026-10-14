# Integrações

- ID: PO-A-810
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > Integrações
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-810
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form.png; 03_lista_criar.png; 04_lista_edicao.png; 05_lista_alterar.png; 06_lista_remover.png; 07_form_edicao.png; 99_rodape.png

---

![Integrações](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

O Siimp TMS conversa com dezenas de plataformas externas: gerenciadoras de risco, emissores de vale-pedágio, rastreadores, fornecedores de abastecimento, portais de clientes e ERPs. Cada uma exige credenciais e parâmetros próprios para funcionar.

A tela **MARKETPLACE DE INTEGRAÇÕES** é o ponto único, a nível global do sistema, para cadastrar, ativar e ajustar essas conexões. Nela a empresa informa qual integração usar, para qual empresa do grupo ela vale e quais configurações a plataforma externa exige.

Este manual explica o funcionamento da tela. O que cada integração faz e quais configurações ela aceita está documentado individualmente na nossa base de conhecimento, numa seção própria de integrações. O próprio formulário traz o link para a documentação da integração selecionada.

A tela é usada normalmente por administradores do sistema e pelo time de implantação, em conjunto com os dados fornecidos por cada plataforma parceira.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela lista todas as integrações cadastradas e permite incluir, editar e remover cada uma. Cada cadastro liga o sistema a uma plataforma externa, com as configurações que ela exige.

Caminho: menu do usuário *(ícone de pessoa, no canto superior direito)* **-> EMPRESA -> INTEGRAÇÕES**.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todas as integrações cadastradas, das mais novas para as mais antigas, com a empresa, a plataforma e a situação de cada uma.

![Listagem do Marketplace de Integrações](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário **NOVA INTEGRAÇÃO** para cadastrar uma integração. | Sempre. |
| ❷ | **REMOVER** | Remove as integrações marcadas na caixa de seleção da linha. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **NOME** | Filtra pelo nome/descrição da integração. |
|  | **INTEGRAÇÃO** | Filtra pela plataforma *(ex.: J&C, TruckPad)*, escolhida na lista agrupada por tipo. |
|  | Lupa | Aplica a busca. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **CÓDIGO** | Número da integração no sistema. |
|  | **EMPRESA** | Empresa para a qual a integração vale, ou **TODAS**. |
|  | **NOME** | Nome/descrição dado ao cadastro. |
|  | **INTEGRAÇÃO** | Plataforma externa conectada. |
|  | **ATIVO?** | **SIM** quando a integração está em uso; **NÃO** quando está desligada. |
|  | **PADRÃO?** | **SIM** quando o cadastro é o padrão para aquela integração. |
|  | **CRIADO EM** | Data e hora do cadastro. |

### ▌COLUNAS OCULTAS

| Coluna | O que mostra |
| --- | --- |
| **ATUALIZADO EM** | Data e hora da última alteração do cadastro. |

Para exibir, abra o menu do cabeçalho de qualquer coluna e marque a coluna em **COLUNAS**.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O **REMOVER** apaga o cadastro da integração. Enquanto não houver outro cadastro ativo para a mesma plataforma, os processos que dependem dela deixam de funcionar. Para só pausar, prefira desmarcar **ATIVO?** no formulário.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, com o título **NOVA INTEGRAÇÃO**. Ao escolher a **INTEGRAÇÃO**, o sistema mostra a explicação da plataforma e já inclui na grade **CONFIGURAÇÕES** os campos que ela exige.

![Formulário Nova Integração preenchido com a integração J&C](02_form.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Identificação | **EMPRESA** | Empresa do grupo para a qual a integração vale. Em branco, vale para **TODAS**. |
|  |  | **NOME/DESCRIÇÃO** | Nome que identifica o cadastro na listagem *(ex.: GERENCIADORA J&C - MATRIZ)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **INTEGRAÇÃO** | Plataforma externa a conectar. As opções vêm agrupadas por tipo: Abastecimentos, GRIS, Ocorrências, OCR, Outros, Score, Vale Pedágio, Multas, Rastreadores e Balança. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❷ | Registro | **CÓDIGO** | Número do cadastro, gerado ao salvar. |
|  |  | **CADASTRO** | Data e hora do cadastro, preenchida ao salvar. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. |
| ❸ | **O QUE É / COMO FUNCIONA?** | Texto e link | Explica o que a integração escolhida faz. O link *em nossa base de conhecimento* abre a documentação da integração no YouTrack. |
| ❹ | Inclusão de configurações | **CAMPO** | Nome da configuração a incluir, exatamente como pede a documentação da integração. |
|  |  | **VALOR** | Valor da configuração. Fica bloqueado quando **LISTA** está marcado. |
|  |  | **LISTA** | Marque para criar a configuração como uma lista de valores *(ver **CAMPOS DO TIPO LISTA**)*. |
|  |  | **ADICIONAR** | Inclui a configuração na grade. |
|  |  | **REMOVER** | Remove da grade a configuração selecionada. |
| ❺ | **CONFIGURAÇÕES** | **CAMPO** e **VALOR** | Configurações da integração. As obrigatórias já vêm listadas, com o valor em branco. Para preencher ou corrigir, dê duplo clique na célula. |
| ❻ | Ícone de lista | Ícone vermelho na coluna **VALOR** | Aparece nas configurações do tipo lista e abre a janela de edição dos itens. |
| ❼ | Ações | **SALVAR** | Grava o cadastro. |
|  |  | **ATIVO?** | Marcado, a integração está em uso. Vem marcado no cadastro novo. |
|  |  | **PADRÃO?** | Marcado, este cadastro é o padrão para a integração. |
| ❽ |  | **FECHAR** | Fecha o formulário sem salvar o que não foi gravado. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O sistema só salva quando todas as configurações exigidas pela integração estão na grade e todas as linhas têm valor. Caso contrário, aparece no rodapé uma mensagem com o nome da configuração em falta.*</span>

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Além das configurações obrigatórias, a integração pode aceitar outras opcionais. Consulte a documentação pelo link do grupo **O QUE É / COMO FUNCIONA?** e inclua cada uma pelo grupo de inclusão ❹.*</span>

### ▌CAMPOS DO TIPO LISTA

Algumas configurações recebem vários valores em vez de um só, como **COMMODITIES** nas gerenciadoras de risco. Elas são criadas com a opção **LISTA** e editadas numa janela própria.

Para criar uma configuração do tipo lista:

1. Se a configuração já estiver na grade como texto, selecione a linha e clique em **REMOVER**.
2. Digite o nome em **CAMPO** ❶.
3. Marque **LISTA** ❷. O campo **VALOR** fica bloqueado.
4. Clique em **ADICIONAR** ❸. A linha entra na grade com o ícone de lista na coluna **VALOR**.

![Criação da configuração commodities como lista](03_lista_criar.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **CAMPO** | Nome da configuração do tipo lista. |
| ❷ | **LISTA** | Define que a configuração terá vários valores. |
| ❸ | **ADICIONAR** | Inclui a configuração, ainda sem itens, na grade. |

Clique no ícone de lista para abrir a janela **EDITANDO: "&lt;NOME DA CONFIGURAÇÃO&gt;"**.

![Janela de edição da lista commodities](04_lista_edicao.png){width=60%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **CHAVE (OPCIONAL)** | Código do item, quando a plataforma pede código e descrição *(ex.: código da mercadoria)*. |
|  | **VALOR** | Valor ou descrição do item. |
| ❷ | **ADICIONAR** | Inclui o item na lista. A tecla Enter no **VALOR** faz o mesmo. |
| ❸ | **REMOVER** | Remove o item selecionado. |
| ❹ | Grade **CHAVE** e **VALOR** | Itens da lista. |
| ❺ | **SALVAR** | Aplica os itens na configuração e fecha a janela. |
| ❻ | **FECHAR** | Fecha a janela sem aplicar as alterações. |

Para alterar um item, dê duplo clique na célula **VALOR** ❶, digite o novo texto e tecle Enter.

![Alteração do valor de um item da lista](05_lista_alterar.png){width=60%}

Para remover um item, selecione a linha ❶ e clique em **REMOVER** ❷.

![Remoção de um item da lista](06_lista_remover.png){width=60%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*As alterações da lista só valem depois de dois cliques: **SALVAR** na janela da lista e depois **SALVAR** no formulário. A tecla Esc ou o **FECHAR** descartam o que foi feito na janela.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Uma lista sem itens impede o salvamento da integração.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Sem **CHAVE**, o item é gravado só com o valor. Com **CHAVE**, é gravado com código e valor. Use o formato que a documentação da integração indicar.*</span>

### ▌EDITAR UMA INTEGRAÇÃO

Para editar, dê duplo clique na linha da listagem. O formulário abre com o título **INTEGRAÇÃO &lt;CÓDIGO&gt;** *(ex.: **INTEGRAÇÃO 149**)*, com todos os campos, configurações e listas já preenchidos, além de **CÓDIGO**, **CADASTRO** e **ATUALIZAÇÃO**.

![Integração aberta para edição](07_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Este manual cobre só o funcionamento da tela. As configurações de cada integração (quais campos existem, o que cada um significa e quais são opcionais) estão documentadas na seção de integrações da nossa base de conhecimento no YouTrack.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*As integrações são cadastros globais do sistema. Uma alteração aqui afeta todos os processos que usam aquela plataforma, como espelhamento de viagens, emissão de vale-pedágio ou importação de abastecimentos.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
