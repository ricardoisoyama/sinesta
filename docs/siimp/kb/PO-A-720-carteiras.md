# Carteiras

- ID: PO-A-720
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > Carteiras
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-720
- Filhos: PO-A-721 Carteiras - Nosso Número; PO-A-722 Carteiras - Número do Documento; PO-A-723 Carteiras - Taxa; PO-A-724 Carteiras - Multa; PO-A-725 Carteiras - Juros/dia; PO-A-726 Carteiras - Número da Carteira; PO-A-727 Carteiras - DV da Carteira; PO-A-728 Carteiras - Aceite do Boleto; PO-A-729 Carteiras - DOC; PO-A-730 Carteiras - Número Sequencial; PO-A-731 Carteiras - Gerar Boleto; PO-A-732 Carteiras - Valor para Boleto; PO-A-733 Carteiras - Débito Automático; PO-A-734 Carteiras - Taxa de Adiantamento; PO-A-735 Carteiras - Validar os Valores da Remessa; PO-A-736 Carteiras - CNAB RECEBER; PO-A-737 Carteiras - Convênio; PO-A-738 Carteiras - Modalidade; PO-A-739 Carteiras - Demonstrativo 1; PO-A-740 Carteiras - Instruções 1; PO-A-741 Carteiras - Demonstrativo 2; PO-A-742 Carteiras - Instruções 2; PO-A-743 Carteiras - Demonstrativo 3; PO-A-744 Carteiras - Instruções 3; PO-A-745 Carteiras - Código de Movimento Remessa; PO-A-746 Carteiras - Forma de Cadastramento do Título no Banco; PO-A-747 Carteiras - Tipo de Documento; PO-A-748 Carteiras - Identificação da Emissão do Boleto de Pagamento; PO-A-749 Carteiras - Identificação da Distribuição; PO-A-750 Carteiras - Espécie do Título; PO-A-751 Carteiras - Identificação de Título Aceito / Não Aceito; PO-A-752 Carteiras - Código do Juros de Mora; PO-A-753 Carteiras - Código do Desconto 1; PO-A-754 Carteiras - Código do Desconto 2; PO-A-755 Carteiras - Código do Desconto 3; PO-A-756 Carteiras - Código para Protesto; PO-A-757 Carteiras - Código para Baixa / Devolução; PO-A-758 Carteiras - CNAB PAGAMENTO; PO-A-759 Carteiras - Espécie CNAB; PO-A-760 Carteiras - Número da Carteira (CNAB); PO-A-761 Carteiras - DV da Carteira (CNAB); PO-A-762 Carteiras - Data de Liquidação; PO-A-763 Carteiras - Considerar Desconto no Retorno; PO-A-764 Carteiras - Voltar numeração; PO-A-765 Carteiras - Utilizar proprietário da carteira na exportação; PO-A-766 Carteiras - Código da Receita DARF PIS; PO-A-767 Carteiras - Código da Receita DARF COFINS; PO-A-768 Carteiras - Código da Receita DARF Desoneração; PO-A-769 Carteiras - Código da Receita GARE SP ICMS; PO-A-770 Carteiras - Correntista; PO-A-771 Carteiras - CPF do Correntista; PO-A-772 Carteiras - Gerente da Conta Bancária; PO-A-773 Carteiras - Contato Conta Bancária; PO-A-774 Carteiras - Limite Conta Bancária; PO-A-775 Carteiras - Limite Bancário (LIS); PO-A-776 Carteiras - Não receber após (dias); PO-A-777 Carteiras - Não receber após (dias) - LIMITE; PO-A-778 Carteiras - Carteira disponível para pagamento de motorista; PO-A-779 Carteiras - Impressora LPT; PO-A-780 Carteiras - Devolver após (dias); PO-A-781 Carteiras - Devolver após (dias) - LIMITE; PO-A-782 Carteiras - Carteira disponível para custos operacionais; PO-A-783 Carteiras - Complemento Santander; PO-A-784 Carteiras - Protestar após (dias); PO-A-785 Carteiras - Protestar após (dias) - LIMITE; PO-A-786 Carteiras - Carteira disponível para substituição na conciliação; PO-A-787 Carteiras - Apresentar status da fatura; PO-A-788 Carteiras - Carteira disponível para ordem de pagamento; PO-A-789 Carteiras - Instrução de registro de movimento; PO-A-790 Carteiras - Convênio de Pagamento; PO-A-791 Carteiras - Conta Contábil da Carteira; PO-A-792 Carteiras - Conta Contábil dos Juros da Parcela a pagar; PO-A-793 Carteiras - Conta Contábil dos Juros da Parcela a receber; PO-A-794 Carteiras - Conta Contábil da Multa da Parcela a pagar; PO-A-795 Carteiras - Conta Contábil da Multa da Parcela a receber; PO-A-796 Carteiras - Conta Contábil do Desconto da Parcela a pagar; PO-A-797 Carteiras - Conta Contábil do Desconto da Parcela a receber; PO-A-798 Carteiras - Tipo de Serviço; PO-A-799 Carteiras - Tipo de Lançamento
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_carteira_ativa.png; 04_carteira_inativa.png; 05_desativar.png; 06_historico.png; 07_form_edicao.png; 99_rodape.png

---

![Carteiras](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Toda movimentação financeira da empresa passa por uma conta: uma conta bancária, o caixa interno ou um cartão. No sistema, cada uma dessas contas é uma **CARTEIRA**. É nela que ficam os dados do banco, da agência e da conta, além das regras de cobrança e de pagamento daquela conta.

O objetivo da tela é concentrar essas informações num só lugar. Com a carteira configurada, o sistema sabe como gerar boletos, montar os arquivos de remessa e ler os arquivos de retorno do banco *(CNAB)*, e para quais pagamentos a conta pode ser usada *(pagamento de motorista, custos operacionais, ordem de pagamento e conciliação)*.

A tela é usada principalmente pela área financeira, na implantação de uma nova conta bancária ou quando o banco muda alguma regra de cobrança. As carteiras alimentam as movimentações financeiras, as faturas, os boletos, as remessas e retornos bancários e a contabilização dos juros, multas e descontos das parcelas.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **CONFIGURAÇÃO DAS CARTEIRAS** lista todas as carteiras cadastradas, ativas e inativas, e permite criar, alterar, ativar e desativar cada uma. Cada carteira tem os dados da conta e um conjunto de **PARÂMETROS** que definem as regras de boleto, CNAB, pagamento e contabilização.

O caminho é **USUÁRIO -> EMPRESA -> CARTEIRAS** *(menu do ícone de usuário, no canto superior direito)*.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A tela abre com todas as empresas e as carteiras ordenadas pela empresa. O botão **REMOVER** apaga a carteira; para uma conta que não será mais usada, prefira **DESATIVAR**, que mantém o histórico.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra as carteiras de todas as empresas, com os dados da conta e a situação de cada uma.

![Listagem de carteiras](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar uma nova carteira. | Sempre. |
| ❷ | **REMOVER** | Exclui as carteiras marcadas na listagem. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem com os dados mais recentes. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **EMPRESA** | Filtra as carteiras de uma empresa. Vazio *(Todas as Empresas)* mostra todas. |
|  | **DESCRIÇÃO** | Filtra pela descrição da carteira. |
|  | **LUPA** | Aplica os filtros. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **EMPRESA** | Empresa dona da carteira, com código e CNPJ. |
|  | **DESCRIÇÃO** | Nome que identifica a carteira. |
|  | **Nº CARTEIRA** | Número da carteira de cobrança no banco. |
|  | **AGÊNCIA** | Agência da conta. |
|  | **CONTA CORRENTE** | Número da conta. |
|  | **CÓDIGO DE INTEGRAÇÃO** | Código usado para integrar a carteira com outros sistemas. |
|  | **ATIVO** | Situação da carteira: **SIM** *(em azul)* ou **NÃO** *(em vermelho)*. |

### ▌COLUNAS OCULTAS

| Coluna | O que mostra |
| --- | --- |
| **#** | Código da carteira. |
| **PIX** | Chave Pix da conta. |
| **TIPO DE CHAVE** | Tipo da chave Pix *(Celular, E-mail, CPF, CNPJ, Chave Aleatória ou Conta Bancária)*. |

Para exibir, clique na seta de qualquer título de coluna, abra **COLUNAS** e marque a coluna desejada.

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário **CARTEIRA** abre pelo botão **NOVO** ❶ da listagem. Ele tem o cabeçalho, o grupo **CONTA**, o painel **PARÂMETROS** e a barra de botões.

![Formulário de nova carteira](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Cabeçalho | **EMPRESA** | Empresa dona da carteira. Opções: as empresas cadastradas. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CÓDIGO** | Número da carteira no sistema, gerado ao salvar. |
|  |  | **CADASTRO** | Data e hora em que a carteira foi cadastrada. |
|  |  | **ATUALIZAÇÃO** | Data e hora da última alteração. |
|  |  | **ATIVO?** | Situação da carteira. Opções: **SIM** e **NÃO**. |
| ❷ | Conta | **DESCRIÇÃO** | Nome que identifica a carteira nas telas do sistema *(ex.: BANCO DO BRASIL - COBRANÇA)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **BANCO** | Banco da conta. Opções: os bancos cadastrados *(ex.: 000 - CAIXA INTERNO, 001 - BANCO DO BRASIL S.A., 341 - ITAÚ UNIBANCO S.A.)*. |
|  |  | **AGÊNCIA** | Número da agência, com até 4 dígitos, e o dígito verificador no campo ao lado. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CONTA** | Número da conta e o dígito verificador no campo ao lado. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CÓDIGO DE INTEGRAÇÃO** | Código usado para integrar a carteira com outros sistemas. |
|  |  | **TIPO DE CHAVE** | Tipo da chave Pix da conta. Opções: **CELULAR**, **E-MAIL**, **CPF**, **CNPJ**, **CHAVE ALEATÓRIA** e **CONTA BANCÁRIA**. |
|  |  | **PIX** | Chave Pix da conta, com até 200 caracteres. |
| ❸ | Parâmetros | **PESQUISE UM PARÂMETRO AQUI...** | Filtra a lista de parâmetros pelo texto digitado. |
| ❹ | Parâmetros | **CLASSIFICAÇÃO** | Grupo do parâmetro *(ex.: Boleto, CNAB, Pagamento)*. |
|  |  | **NOME** | Nome do parâmetro. |
|  |  | **VALOR** | Valor configurado. O duplo clique na linha abre o parâmetro para configuração *(ver **PARÂMETROS**)*. |
| ❺ | Botões | **SALVAR & NOVO** | Salva a carteira e abre um formulário em branco. |
|  |  | **SALVAR** | Salva a carteira. |
| ❻ | Botões | **EXIBIR SALDO MOVIMENTAÇÕES** | Quando marcado, mostra o saldo da carteira nas movimentações financeiras. |
| ❼ | Botões | **HISTÓRICO** | Abre o histórico da carteira. Fica desabilitado no cadastro novo. |
|  |  | **FECHAR** | Fecha o formulário sem salvar. |

### ▌CARTEIRA ATIVA X INATIVA

Ao abrir uma carteira já cadastrada, a cor do cabeçalho ❶ mostra a situação dela. Na carteira ativa o cabeçalho é escuro e a barra mostra o botão **DESATIVAR** ❷.

![Carteira ativa](03_carteira_ativa.png){width=100%}

| Nº | Elemento | O que mostra |
| :---: | --- | --- |
| ❶ | **CABEÇALHO** | Fundo escuro e **ATIVO?** igual a **SIM**: a carteira está ativa. |
| ❷ | **DESATIVAR** | Desativa a carteira *(ver **DESATIVAR**)*. |
| ❸ | **HISTÓRICO** | Abre o histórico da carteira *(ver **HISTÓRICO**)*. |

Na carteira inativa o cabeçalho ❶ fica vermelho e, no lugar de **DESATIVAR**, aparece o botão **ATIVAR** ❷.

![Carteira inativa](04_carteira_inativa.png){width=100%}

| Nº | Elemento | O que mostra |
| :---: | --- | --- |
| ❶ | **CABEÇALHO** | Fundo vermelho e **ATIVO?** igual a **NÃO**: a carteira está inativa. |
| ❷ | **ATIVAR** | Volta a carteira para a situação ativa. |

### ▌DESATIVAR

O botão **DESATIVAR** tira a carteira de uso sem apagar o cadastro. Ao clicar, o sistema abre a janela **DESATIVAR CARTEIRA <NOME DA CARTEIRA>**, que pede o motivo.

![Janela de desativação](05_desativar.png){width=60%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **INFORME O MOTIVO PARA A DESATIVAÇÃO DA CARTEIRA** | Texto livre com o motivo da desativação. |
| ❷ | **SIM** | Confirma a desativação. |
|  | **NÃO** | Cancela e fecha a janela, sem alterar a carteira. |

Depois de desativada, a carteira passa a mostrar **NÃO** na coluna **ATIVO** da listagem e pode ser reativada pelo botão **ATIVAR**.

### ▌HISTÓRICO

O botão **HISTÓRICO** abre a lista de eventos da carteira, como ativações e desativações.

![Histórico da carteira](06_historico.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **DIGITE O TERMO PARA PESQUISA...** | Filtra os eventos pelo texto digitado. |
| ❷ | **DATA** | Data e hora do evento. |
|  | **MENSAGEM** | Descrição do evento *(ex.: Carteira ativada com sucesso!)*. |
|  | **USUÁRIO** | Usuário que fez a ação. |

### ▌PARÂMETROS

Os parâmetros definem como a carteira funciona no boleto, no CNAB, nos pagamentos e na contabilização. Para configurar um parâmetro, dê um duplo clique na linha dele. Abre a janela **EDITAR PARÂMETRO**, com a classificação, o nome, a explicação **O QUE É / COMO FUNCIONA?** e o campo **VALOR DO PARÂMETRO**. Cada parâmetro tem uma documentação própria.

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Use o campo **PESQUISE UM PARÂMETRO AQUI...** para achar um parâmetro pelo nome em vez de rolar a lista.*</span>

### ▌EDITAR UMA CARTEIRA

Para editar, dê um duplo clique na carteira na listagem. O formulário **CARTEIRA** abre com todos os dados preenchidos, o **CÓDIGO**, as datas de **CADASTRO** e **ATUALIZAÇÃO** e os valores atuais dos parâmetros.

![Carteira aberta para edição](07_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos são os mesmos do cadastro. Na edição, o botão **HISTÓRICO** fica habilitado e aparece **DESATIVAR** ou **ATIVAR**, conforme a situação da carteira.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os códigos dos parâmetros de boleto e CNAB (movimento, espécie, juros, desconto, protesto, baixa) variam de banco para banco. Configure-os sempre conforme o manual de cobrança do seu banco, ou os boletos e remessas podem ser recusados.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
