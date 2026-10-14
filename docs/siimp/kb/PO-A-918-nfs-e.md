# NFS-e

- ID: PO-A-918
- Caminho: 🛟 BASE DE CONHECIMENTO > FISCAL > NFS-e
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-918
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_fluxo_emissor_nacional.png; 03_form_novo.png; 04_form_fora_municipio.png; 05_form_cbsibs.png; 06_form_cbsibs_ibs.png; 07_form_cbsibs_regular.png; 08_form_opcoes.png; 09_form_edicao.png; 99_rodape.png

---

![NFS-e](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

A **NFS-E** *(Nota Fiscal de Serviço Eletrônica)* documenta as prestações de serviço da empresa junto à prefeitura. Em uma transportadora, ela é usada no transporte **MUNICIPAL** *(origem e destino da carga na mesma cidade)* e nos serviços adicionais, como paletização, carregamento e *stretch*.

O módulo existe para que a nota seja cadastrada, emitida, impressa e cancelada dentro do próprio sistema, integrado à prefeitura ou ao **EMISSOR NACIONAL**. Os dados fiscais vêm do **SERVIÇO** cadastrado, o que padroniza alíquotas e retenções e reduz rejeições.

O módulo é usado pelas áreas fiscal e de faturamento. Ele depende do cadastro de **SERVIÇOS - NFS-E** e da integração com a prefeitura da empresa emitente. As notas também podem nascer de Minutas e Fechamentos, que aparecem vinculados na discriminação.

### ▌COMUNICAÇÃO COM O EMISSOR NACIONAL

Quando a prefeitura usa o **EMISSOR NACIONAL**, o sistema não envia mais o RPS no layout da prefeitura. Ele envia uma **DPS** *(Declaração de Prestação de Serviço)* ao Ambiente de Dados Nacional *(ADN)*, que valida, gera a nota e a distribui ao município.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Para emitir pelo Emissor Nacional, o parâmetro [TIPO DE EMISSOR DE NFS-E](https://siimp.youtrack.cloud/articles/PO-A-477) da empresa precisa estar como **NACIONAL**.*</span>

![Comunicação do TMS com o Emissor Nacional](02_fluxo_emissor_nacional.png){width=100%}

Se a alíquota de ISS do serviço for diferente da que a prefeitura cadastrou no Emissor Nacional, vale a da prefeitura *(ex.: 5% no TMS e 3% no Emissor: a nota sai com 3%)*. O TMS atualiza a NFS-e com os valores retornados.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Se o Emissor Nacional não responder na hora, a nota fica em **PROCESSANDO**. Envie de novo mais tarde para consultar o resultado. Na emissão, o número e a chave da NFS-e vêm no retorno do Emissor.*</span>

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **NOTA FISCAL DE SERVIÇO** lista as NFS-e da empresa e permite cadastrar, emitir, imprimir, enviar por e-mail e cancelar cada nota.

Caminho: **FISCAL -> NFS-E**.

Toda NFS-e passa pelos status abaixo.

| Status | O que significa |
| --- | --- |
| **CADASTRADA** | Nota salva no sistema e ainda não enviada. Todos os campos podem ser alterados. |
| **PROCESSANDO** | A prefeitura recebeu o pedido, mas ainda não respondeu se a nota foi autorizada. Os dados não podem ser alterados; envie a nota de novo mais tarde para saber o resultado. |
| **EMITIDA** | Nota autorizada pela prefeitura, que gera o **Nº NFS-E**. Não pode mais ser alterada, apenas cancelada. |
| **CANCELADA** | Cancelamento aceito pela prefeitura. A nota fica no sistema como histórico. |

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra as NFS-e cadastradas, com a empresa emitente, o status, o valor total e o tomador de cada uma.

![Listagem de NFS-e](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVA** | Abre o formulário para cadastrar uma nova NFS-e. | Sempre. |
| ❷ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❸ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❹ | **DUPLICAR** | Cria uma nova NFS-e com os dados da nota selecionada. | Sempre. |
| ❺ | **ENVIAR** | Envia as NFS-e selecionadas à prefeitura para emissão. | Com NFS-e selecionadas. |
| ❻ | **CANCELAR** | Pede à prefeitura o cancelamento das NFS-e selecionadas. | Com NFS-e selecionadas. |
| ❼ | **IMPRIMIR** | Gera o PDF das NFS-e selecionadas, no layout da prefeitura. | Com NFS-e selecionadas. |
| ❽ | **EMAIL** | Envia as NFS-e selecionadas por e-mail. | Com NFS-e selecionadas. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❾ | **DT CRIAÇÃO** | Busca as notas criadas na data informada. |
| | **TODAS AS EMPRESAS** | Filtra pela empresa emitente. |
| | **CÓDIGOS** | Busca pelo código interno da NFS-e no sistema. |
| | **Nº NFS-ES** | Busca pelo número gerado pela prefeitura. |
| | **CLIENTE** | Busca pelo nome do tomador do serviço. |
| | **TODOS OS STATUS** | Filtra pelo status: **CADASTRADA**, **EMITIDA**, **PROCESSANDO** ou **CANCELADA**. |
| | Lupa | Aplica a busca. |
| ⓫ | **FILTROS** | Painel lateral recolhido com filtros adicionais. Clique na barra para expandir. |
| | **EMITIDO DE / ATÉ** | Período de emissão das notas. |
| | **CRIADO DE / ATÉ** | Período de cadastro das notas. |
| | **NATUREZA FISCAL** | Filtra pela natureza de operação. |
| | **SERVIÇO** | Filtra pelo serviço de NFS-e usado na nota. |
| | **OBSERVAÇÃO** | Busca por um texto da discriminação do serviço. |
| | **FILTRAR** | Aplica os filtros do painel. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❿ | **CÓDIGO** | Código interno da NFS-e no sistema. |
| | **EMITENTE** | Empresa que emite a nota. |
| | **AÇÃO** | Ação em andamento na nota. |
| | **Nº NFS-E** | Número gerado pela prefeitura após a emissão. |
| | **STATUS** | Situação atual da nota. |
| | **TOTAL** | Valor total do serviço. |
| | **TOMADOR** | Pessoa ou empresa que contratou o serviço. |
| | **EMITIDO EM** | Data e hora da emissão. |
| | **CRIADO EM** | Data e hora do cadastro. |
| | **CRIADO POR** | Usuário que cadastrou a nota. |
| | **ATUALIZADO EM** | Data e hora da última alteração. |

### ▌COLUNAS OCULTAS

| Coluna | O que mostra |
| --- | --- |
| **MODIFICADO POR** | Usuário que fez a última alteração. |
| **Nº RPS/DPS** | Número do RPS ou da DPS enviado à prefeitura ou ao Emissor Nacional. |

Para exibi-las, clique na seta de qualquer cabeçalho da grade e marque a coluna em **COLUNAS**.

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para achar as notas que ainda aguardam resposta da prefeitura, selecione **PROCESSANDO** em **TODOS OS STATUS** ❾ e clique na lupa.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVA** da listagem, na janela **NOVA NFS-E**, sempre com o status **CADASTRADA**.

![Formulário de nova NFS-e](03_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Cabeçalho | **EMPRESA** | Empresa emitente da nota. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **CÓDIGO** | Código interno da NFS-e, gerado ao salvar. |
| | | **Nº NFS-E** | Número gerado pela prefeitura após a emissão. |
| | | **Nº RPS/DPS** | Número do RPS ou da DPS enviado à prefeitura ou ao Emissor Nacional. |
| | | **CADASTRO** | Data e hora do cadastro da nota. |
| | | **ATUALIZAÇÃO** | Data e hora da última alteração. |
| | | **STATUS** | Situação da nota. Preenchido pelo sistema. |
| ❷ | Tomador do Serviço | Código e lupa | Pessoa ou empresa que paga pelo serviço. Digite o código ou pesquise pela lupa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| ❸ | Endereço do Tomador | Botão de endereço | Mostra o endereço do tomador usado na nota. Pelo botão, é possível escolher outro endereço do cadastro. |
| ❹ | Intermediário do Serviço | Código e lupa | Pessoa ou empresa que intermediou a contratação, quando houver. |
| ❺ | Dados do Serviço | **SERVIÇO** | Serviço de NFS-e cadastrado para a empresa. Traz para a nota as alíquotas de ISS e das retenções. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **NATUREZA DE OPERAÇÃO** | Natureza da tributação. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **UF** | Estado onde o serviço foi prestado. Habilitado nas naturezas fora do município. |
| | | **CIDADE DA PRESTAÇÃO** | Cidade onde o serviço foi prestado. Habilitada nas naturezas fora do município. |
| ❻ | Valores do Serviço | **TOTAL DO SERVIÇO** | Valor bruto do serviço. A partir dele o sistema calcula os demais valores. |
| | | **DEDUÇÕES** | Valor deduzido da base de cálculo do ISS. |
| | | **DESCONTO INCOND.** | Desconto incondicional concedido ao tomador. |
| | | **DESCONTO COND.** | Desconto condicionado concedido ao tomador. |
| | | **BASE DE CÁLCULO** | Base de cálculo do ISS. Calculada pelo sistema. |
| | | **ALÍQ. ISS** | Alíquota de ISS da nota, trazida do serviço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **VALOR DO ISS** | Valor do ISS calculado. |
| ❼ | Retenções | **ISS RETIDO** | Indica se o ISS é retido pelo tomador. Opções: **NÃO** e **SIM**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **PIS/COF RETIDO** | Indica se PIS e COFINS são retidos pelo tomador. Opções: **NÃO** e **SIM**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **PIS** | Percentual e valor retido de PIS. |
| | | **COFINS** | Percentual e valor retido de COFINS. |
| | | **CSLL** | Percentual e valor retido de CSLL. |
| | | **IR** | Percentual e valor retido de IR. |
| | | **INSS** | Percentual e valor retido de INSS. |
| | | **OUTRAS** | Valor de outras retenções. |
| ❽ | Abas | **DETALHES**, **CBS/IBS** e **OPÇÕES** | Informações complementares da nota, descritas nas subseções abaixo. |
| ❾ | Rodapé | **CHAVE** | Chave de acesso da nota, quando a prefeitura ou o Emissor Nacional fornece uma. |
| | | **EMITIDO EM** | Data e hora da emissão. |
| | | **TOTAL LÍQUIDO** | Valor do serviço menos descontos e retenções. |
| ❿ | Botões de ação | **SALVAR E EMITIR** | Salva a nota e envia para emissão. |
| | | **SALVAR** | Salva a nota com o status **CADASTRADA**, sem emitir. |
| | | **CANCELAR** | Pede à prefeitura o cancelamento de uma nota emitida. É preciso informar o motivo. |
| | | **XML** | Abre o XML de emissão ou de cancelamento. |
| | | **IMPRIMIR** | Gera o PDF da nota no layout da prefeitura. |
| | | **HISTÓRICO** | Mostra as mensagens de sucesso e de erro da emissão e do cancelamento. |
| | | **FECHAR** | Fecha a janela. |

<details><summary><b>OPÇÕES DA NATUREZA DE OPERAÇÃO</b></summary>

- **NENHUMA**
- **TRIBUTAÇÃO NO MUNICÍPIO**
- **TRIBUTAÇÃO FORA DO MUNICÍPIO**
- **EXPORTAÇÃO DE SERVIÇOS**
- **ISENÇÃO**
- **IMUNE**
- **EXIGIBILIDADE SUSPENSA POR DECISÃO JUDICIAL**
- **EXIGIBILIDADE SUSPENSA POR PROCEDIMENTO ADMINISTRATIVO**
- **TRIBUTAÇÃO FORA DO MUNICÍPIO, PORÉM ISENTO**
- **TRIBUTAÇÃO FORA DO MUNICÍPIO, PORÉM IMUNE**
- **TRIBUTAÇÃO FORA DO MUNICÍPIO, PORÉM SUSPENSA**
- **TRIBUTAÇÃO FORA DO MUNICÍPIO SUSPENSA POR PROCEDIMENTO ADMINISTRATIVO**

</details>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Nem toda natureza de operação existe em todas as prefeituras. Confirme com o contador qual natureza usar antes da primeira emissão.*</span>

### ▌NATUREZA FORA DO MUNICÍPIO

Ao escolher **TRIBUTAÇÃO FORA DO MUNICÍPIO** em **NATUREZA DE OPERAÇÃO**, os campos **UF** e **CIDADE DA PRESTAÇÃO** são habilitados ❶.

![UF e Cidade da Prestação habilitadas](04_form_fora_municipio.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Dados do Serviço | **UF** | Estado onde o serviço foi prestado. |
| | | **CIDADE DA PRESTAÇÃO** | Cidade onde o serviço foi prestado, dentro da UF escolhida. |

### ▌DETALHES

A aba **DETALHES** aparece aberta no print do formulário ❽.

| Campo | Para que serve |
| --- | --- |
| Discriminação | Texto que descreve o serviço prestado e sai impresso na nota. Até 2.000 caracteres. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **DESCRIÇÃO** | Descrição do item de serviço. |
| **QTD.** | Quantidade do item. |
| **VALOR UN.** | Valor unitário do item. |
| **TRIBUTÁVEL?** | Indica se o item é tributável. Opções: **NÃO** e **SIM**. |
| Botão **+** | Adiciona o item à grade. |
| Botão lixeira | Remove o item selecionado da grade. |

| Coluna | O que mostra |
| --- | --- |
| **DESCRIÇÃO** | Descrição do item. |
| **QTD.** | Quantidade. |
| **VALOR UN.** | Valor unitário. |
| **TOTAL** | Quantidade vezes valor unitário. |
| **TRIBUTÁVEL?** | Se o item é tributável. |

### ▌CBS/IBS

A aba **CBS/IBS** reúne as informações da Reforma Tributária. A aba rola, por isso aparece em três prints.

![Aba CBS/IBS: informações gerais, estorno de crédito e CBS](05_form_cbsibs.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Reforma Tributária - Informações Gerais | **INDICADOR DE OPERAÇÃO** | Código que indica o local da operação para o IBS e a CBS *(ex.: 070102 - Serviço de transporte de carga - Local da retirada)*. |
| | | **CST / CLASSIFICAÇÃO TRIBUTÁRIA** | Situação tributária e classificação da operação no IBS e na CBS. |
| | | **BC IBS/CBS (R$)** | Base de cálculo do IBS e da CBS. Calculada pelo sistema. |
| ❷ | Estorno de Crédito | **OPERAÇÃO DE CRÉDITO** | Tipo de crédito presumido a estornar, quando houver. |
| | | **VALOR CBS (R$)** | Valor de CBS estornado. Calculado pelo sistema. |
| | | **VALOR IBS (R$)** | Valor de IBS estornado. Calculado pelo sistema. |
| ❸ | CBS - Geral | **ALÍQUOTA (%)** | Alíquota da CBS. Preenchida pelo sistema. |
| | | **VALOR (R$)** | Valor da CBS. Preenchido pelo sistema. |
| ❹ | CBS - Diferimento | **ALÍQUOTA (%)** | Alíquota de diferimento da CBS. |
| | | **VALOR (R$)** | Valor do diferimento da CBS. |
| ❺ | CBS - Redução | **ALÍQ. REDUÇÃO (%)** | Alíquota de redução da CBS. Preenchida pelo sistema. |
| | | **RED. EFETIVA (%)** | Alíquota de redução efetiva da CBS. Preenchida pelo sistema. |

![Aba CBS/IBS: IBS estadual e municipal](06_form_cbsibs_ibs.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | IBS UF - Geral | **ALÍQUOTA (%)** | Alíquota do IBS estadual. Preenchida pelo sistema. |
| | | **VALOR (R$)** | Valor do IBS estadual. Preenchido pelo sistema. |
| ❷ | IBS UF - Diferimento | **ALÍQUOTA (%)** | Alíquota de diferimento do IBS estadual. |
| | | **VALOR (R$)** | Valor do diferimento do IBS estadual. |
| ❸ | IBS UF - Redução | **ALÍQ. REDUÇÃO (%)** | Alíquota de redução do IBS estadual. Preenchida pelo sistema. |
| | | **RED. EFETIVA (%)** | Alíquota de redução efetiva do IBS estadual. Preenchida pelo sistema. |
| ❹ | IBS Mun - Geral | **ALÍQUOTA (%)** | Alíquota do IBS municipal. Preenchida pelo sistema. |
| | | **VALOR (R$)** | Valor do IBS municipal. Preenchido pelo sistema. |
| ❺ | IBS Mun - Diferimento | **ALÍQUOTA (%)** | Alíquota de diferimento do IBS municipal. |
| | | **VALOR (R$)** | Valor do diferimento do IBS municipal. |
| ❻ | IBS Mun - Redução | **ALÍQ. REDUÇÃO (%)** | Alíquota de redução do IBS municipal. Preenchida pelo sistema. |
| | | **RED. EFETIVA (%)** | Alíquota de redução efetiva do IBS municipal. Preenchida pelo sistema. |

![Aba CBS/IBS: tributação regular e compra governamental](07_form_cbsibs_regular.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Tributação Regular | **CST / CLASSIFICAÇÃO TRIBUTÁRIA** | Situação tributária da tributação regular. |
| | | **ALÍQ. CBS** | Alíquota da CBS na tributação regular. Preenchida pelo sistema. |
| | | **VALOR CBS** | Valor da CBS na tributação regular. Preenchido pelo sistema. |
| | | **ALÍQ. IBS UF** | Alíquota do IBS estadual na tributação regular. Preenchida pelo sistema. |
| | | **VALOR IBS UF** | Valor do IBS estadual na tributação regular. Preenchido pelo sistema. |
| | | **ALÍQ. IBS MUN** | Alíquota do IBS municipal na tributação regular. Preenchida pelo sistema. |
| | | **VALOR IBS MUN** | Valor do IBS municipal na tributação regular. Preenchido pelo sistema. |
| ❷ | Compra Governamental | **ALÍQ. CBS** | Alíquota da CBS em compra governamental. Preenchida pelo sistema. |
| | | **VALOR CBS** | Valor da CBS em compra governamental. Preenchido pelo sistema. |
| | | **ALÍQ. IBS UF** | Alíquota do IBS estadual em compra governamental. Preenchida pelo sistema. |
| | | **VALOR IBS UF** | Valor do IBS estadual em compra governamental. Preenchido pelo sistema. |
| | | **ALÍQ. IBS MUN** | Alíquota do IBS municipal em compra governamental. Preenchida pelo sistema. |
| | | **VALOR IBS MUN** | Valor do IBS municipal em compra governamental. Preenchido pelo sistema. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*No **EMISSOR NACIONAL** e em algumas prefeituras, IBS e CBS são calculados pelo próprio emissor. O sistema atualiza a nota com os valores retornados.*</span>

### ▌OPÇÕES

![Aba Opções](08_form_opcoes.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Construção Civil | Código e lupa | Obra vinculada à nota, quando o serviço é de construção civil. |
| | | **CEP** | CEP da obra. |
| | | **LOGRADOURO** | Logradouro da obra. |
| | | **NÚMERO** | Número do endereço da obra. |
| | | **BAIRRO** | Bairro da obra. |
| | | **COMPLEMENTO** | Complemento do endereço da obra. |
| | | **CÓDIGO DA CONSTRUÇÃO** | Código da obra na prefeitura. |
| | | **CÓDIGO ART** | Número da Anotação de Responsabilidade Técnica da obra. |
| ❷ | Cultura | **INCENTIVADOR?** | Indica se a empresa é incentivadora cultural. Opções: **NÃO** e **SIM**. |

### ▌EDITAR UMA NFS-E

Para abrir uma nota, dê duplo clique na linha da listagem. A janela abre com o título **NFS-E \| CÓDIGO #&lt;CÓDIGO&gt;**, com todos os campos preenchidos.

![NFS-e emitida aberta para edição](09_form_edicao.png){width=100%}

Numa nota **EMITIDA**, o cabeçalho fica verde e o botão **SALVAR** fica bloqueado. Os botões **CANCELAR**, **XML** e **IMPRIMIR** ficam ativos. Quando a nota nasce de Minutas, os números delas aparecem na discriminação.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e as abas são os mesmos do cadastro. Só a nota **CADASTRADA** pode ser alterada.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Antes da primeira emissão, cadastre o serviço da nota em **EMPRESA -> CONFIGURAÇÕES -> SERVIÇOS - NFS-E**. É dele que vêm o código do item, a alíquota de ISS e as retenções. Veja o manual [SERVIÇOS - NFS-E](https://siimp.youtrack.cloud/articles/PO-A-715).*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Cada prefeitura tem regras próprias de emissão, como token de acesso, códigos municipais e naturezas de operação. Confira as particularidades da cidade da empresa emitente e a lista de prefeituras e plataformas integradas em [NOTAS DE SERVIÇO](https://siimp.youtrack.cloud/articles/PO-A-14).*</span>

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para saber qual plataforma a sua prefeitura usa, veja o rodapé ou a tela de login do portal de NFS-e da prefeitura. Os artigos de cada plataforma explicam como identificar.*</span>

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Em plataformas lentas, como a **GINFES/GISS**, é comum a nota ficar em **PROCESSANDO**. Envie a nota novamente mais tarde para consultar o resultado.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).

