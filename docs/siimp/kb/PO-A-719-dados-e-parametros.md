# Dados e Parâmetros

- ID: PO-A-719
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > CONFIGURAÇÕES > Dados e Parâmetros
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-719
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_informacoes.png; 03_form_obs_geral.png; 04_form_obs_cte.png; 05_form_obs_nfse.png; 06_form_carteira.png; 07_form_carteira_busca.png; 08_form_carteira_incluido.png; 09_form_edicao.png; 99_rodape.png

---

![Dados e Parâmetros](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Cada empresa *(CNPJ)* que a transportadora contrata no Siimp TMS precisa ter seus dados de emissão configurados. É com esses dados que o sistema emite os documentos fiscais e operacionais em nome de cada empresa.

A tela **DADOS E PARÂMETROS** reúne essas configurações por empresa: dados cadastrais e endereço, logotipo, certificado digital A1, versão do CT-e, acesso à NFS-e, observações padrão dos documentos e carteira de clientes.

As configurações feitas aqui são usadas na emissão de **CT-E**, **MDF-E**, **NFS-E** e **NF-E 4.0**, e nos documentos de **MINUTA**, **ROMANEIO**, **FATURA**, **COTAÇÃO**, **ORDEM DE COLETA** e **PEDIDO DE COMPRA**, que recebem as observações padrão definidas por empresa.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela lista as empresas contratadas pela transportadora no sistema e permite editar os dados e as configurações de cada uma.

Caminho: **EMPRESA -> CONFIGURAÇÕES -> DADOS E PARÂMETROS**. A janela abre com o título **CONFIGURAÇÃO DE EMPRESAS**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Não existe botão para cadastrar nem para excluir empresas nesta tela. As empresas já vêm cadastradas e aqui só é possível editá-las.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todas as empresas contratadas pela transportadora, uma por linha.

![Listagem de Configuração de Empresas](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **ATUALIZAR** | Recarrega a listagem de empresas. | Sempre. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❷ | **CÓDIGO** | Código da empresa no sistema. |
|  | **NOME** | Razão social da empresa. |
|  | **SIGLA** | Sigla da empresa. |
|  | **FANTASIA** | Nome fantasia da empresa. |
|  | **CNPJ** | CNPJ da empresa. |
|  | **CIDADE** | Cidade do endereço da empresa. |
|  | **UF** | Estado do endereço da empresa. |
|  | **DT. CERTIFICADO** | Data de vencimento do certificado digital A1 da empresa. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Acompanhe a coluna **DT. CERTIFICADO** para renovar o certificado digital antes do vencimento.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre com **DUPLO CLIQUE** na linha da empresa, na listagem. A janela leva a razão social da empresa no título e tem quatro abas: **INFORMAÇÕES**, **PARÂMETROS**, **OBSERVAÇÕES** e **CARTEIRA DE CLIENTES**.

### ▌INFORMAÇÕES

Primeira aba do formulário, com os dados cadastrais e fiscais da empresa.

![Aba Informações](02_form_informacoes.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **INFORMAÇÕES DA EMPRESA** | **CÓDIGO** | Código da empresa no sistema. Só para consulta. |
|  |  | **RAZÃO SOCIAL** | Razão social da empresa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CNPJ** | CNPJ da empresa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **SIGLA** | Sigla que identifica a empresa. |
|  |  | **NOME FANTASIA** | Nome fantasia da empresa. |
|  |  | **IE** | Inscrição Estadual. |
|  |  | **TAF** | Número do TAF da empresa, com até 12 caracteres. |
|  |  | **Nº REGISTRO** | Número de registro da empresa, com até 25 caracteres. |
|  |  | **INSC. MUN.** | Inscrição Municipal. |
|  |  | **RNTRC** | Registro Nacional de Transportadores Rodoviários de Cargas da empresa. |
|  |  | **CEP** | CEP do endereço. |
|  |  | **LOGRADOURO** | Rua, avenida ou estrada do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **NUM.** | Número do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **COMPLEMENTO** | Complemento do endereço. |
|  |  | **BAIRRO** | Bairro do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **ESTADO** | Estado do endereço, escolhido entre os 27 estados brasileiros. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **CIDADE** | Cidade do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **E-MAIL** | E-mail da empresa. |
|  |  | **TELEFONE** | Telefone fixo da empresa. |
|  |  | **FAX** | Número de fax da empresa. |
|  |  | **CELULAR** | Celular da empresa. |
|  |  | **CRT** | Código de Regime Tributário: *Simples Nacional*, *Simples Nacional, excesso sublimite de receita bruta*, *Regime Normal* ou *Simples Nacional - Microempreendedor Individual – MEI*. |
|  |  | **COTM** | Número do Certificado do Operador de Transporte Multimodal. |
|  |  | **CÓD. REDEX** | Código do Recinto *(Redex)*, com até 7 caracteres. |
|  |  | **REG. ESP. DE TRIBUTAÇÃO** | Regime Especial de Tributação: *Microempresa Individual*, *Estimativa*, *Sociedade de Profissionais*, *Cooperativa*, *MEI* ou *ME EPP*. |
|  |  | **SIMPLES NACIONAL?** | Indica se a empresa é optante pelo Simples Nacional: *NÃO* ou *SIM*. |
|  |  | **REG. DE APURA. TRIB. SN** | Regime de apuração dos tributos do Simples Nacional: *Tributos Federais e Municipal pelo SN*, *Tributos Federais pelo SN e o ISSQN pela NFS-e conforme legislação municipal* ou *Tributos Federais e Municipal pela NFS-e conforme respectivas legislações*. |
| ❷ | **LOGOTIPO** | **LOGOTIPO** | Imagem do logotipo da empresa. O botão **SELECIONAR** escolhe o arquivo da imagem. |
| ❸ | **DESTAQUE DE ICMS \| LEI DA TRANSPARÊNCIA** | **TRIBUTOS APROX.** | Percentual aproximado de tributos, exigido pela Lei da Transparência. |
|  |  | **ALÍQ. DESTAQUE** | Alíquota de ICMS a destacar. |
|  |  | **DESTAQUE ICMS** | Valor de ICMS a destacar. |
|  |  | **OBS. ICMS** | Observação sobre o ICMS, com até 255 caracteres. |
| ❹ | **VERSÕES** | **CT-E** | Versão de emissão de todos os CT-es da empresa: *3.00* ou *4.00*. Desde a atualização da SEFAZ, o parâmetro está obsoleto, e será removido em versões futuras. |
| ❺ | **CERTIFICADO DIGITAL A1** | **ARQUIVO PFX** | Arquivo do certificado digital A1 *(.pfx)*. O botão **SELECIONAR** escolhe o arquivo. |
|  |  | **SENHA** | Senha do certificado digital. |
|  |  | **VENCIMENTO** | Data e hora de vencimento do certificado. Só para consulta. |
|  |  | **ATUALIZAR** | Atualiza os dados do certificado. |
| ❻ | **NOTA FISCAL DE SERVIÇO ELETRÔNICA** | **LOGIN DA NFS-E** | Usuário de acesso para emissão da NFS-e. |
|  |  | **SENHA DA NFS-E** | Senha de acesso para emissão da NFS-e. |
| ❼ | **BOTÕES DE AÇÃO** | **SALVAR** | Grava as alterações feitas em todas as abas. |
|  |  | **HISTÓRICO** | Mostra o histórico de alterações da empresa. |
|  |  | **FECHAR** | Fecha o formulário. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A versão do CT-e escolhida em **VERSÕES** vale para todos os CT-es emitidos pela empresa.*</span>

### ▌PARÂMETROS

A aba **PARÂMETROS** reúne os parâmetros de funcionamento do sistema para a empresa. Ela está documentada à parte, no artigo **[PO-A-326](https://siimp.youtrack.cloud/articles/PO-A-326)**.

### ▌OBSERVAÇÕES

A aba **OBSERVAÇÕES** define os textos e campos que a empresa leva para as observações dos seus documentos. Ela tem três subabas: **GERAL**, **CAMPOS ADICIONAIS DO CT-E** e **CAMPOS ADICIONAIS DA NFS-E**.

#### ▌GERAL

Textos padrão de observação de cada documento emitido pela empresa.

![Aba Observações, subaba Geral](03_form_obs_geral.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **SUBABAS** | **GERAL** | Abre os textos padrão de observação. |
|  |  | **CAMPOS ADICIONAIS DO CT-E** | Abre a escolha dos campos adicionais do CT-e. |
|  |  | **CAMPOS ADICIONAIS DA NFS-E** | Abre a escolha dos campos adicionais da NFS-e. |
| ❷ | **OBSERVAÇÕES** | **CT-E** | Texto padrão de observação do CT-e. |
|  |  | **MDF-E** | Texto padrão de observação do MDF-e. |
|  |  | **NFS-E** | Texto padrão de observação da NFS-e. |
|  |  | **PEDIDO DE COMPRA** | Texto padrão de observação do Pedido de Compra. |
|  |  | **ORDEM DE COLETA** | Texto padrão de observação da Ordem de Coleta. |
|  |  | **MINUTA** | Texto padrão de observação da Minuta. |
|  |  | **ROMANEIO** | Texto padrão de observação do Romaneio. |
|  |  | **FATURA** | Texto padrão de observação da Fatura. |
|  |  | **NF-E 4.0** | Texto padrão de observação da NF-e 4.0. |
|  |  | **COTAÇÃO** | Texto padrão de observação da Cotação. |
| ❸ | **OBSERVAÇÕES ADICIONAIS** | **VENDEDOR** | Define se o nome do vendedor vai para as observações do CT-e: *NÃO* ou *SIM*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
|  |  | **FRETE CIF/FOB** | Define se o tipo de frete *(CIF ou FOB)* vai para as observações do CT-e: *NÃO* ou *SIM*. <span style="color:red;">**OBRIGATÓRIO.**</span> |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Os textos podem ter várias linhas. Use-os como modelo, por exemplo com os itens que a equipe deve preencher na **ORDEM DE COLETA** (material disponível, responsável no local, contato).*</span>

#### ▌CAMPOS ADICIONAIS DO CT-E

Escolha das informações do sistema que entram no CT-e da empresa como campos adicionais.

![Aba Observações, subaba Campos Adicionais do CT-e](04_form_obs_cte.png){width=100%}

| Nº | Grupo | Para que serve |
| :---: | --- | --- |
| ❶ | **CAMPOS DISPONÍVEIS** | Lista as informações que podem ser incluídas no CT-e. |
| ❷ | **CAMPOS SELECIONADOS** | Lista as informações que a empresa leva para o CT-e. |

Para incluir um campo, **ARRASTE** a linha da grade de campos disponíveis ❶ para a grade de campos selecionados ❷. Para retirar, arraste de volta.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos selecionados não aparecem no campo de observação da tela do CT-e. Eles entram no momento em que o CT-e é transmitido e podem ser vistos no XML ou no DACTE.*</span>

Colunas da grade de campos disponíveis:

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código interno do campo. |
| **NOME** | Nome do campo. |

Colunas da grade de campos selecionados:

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código interno do campo. |
| **NOME** | Nome com que o campo aparece no CT-e. Pode ser alterado clicando na célula. |
| **ONDE?** | Onde o campo aparece no CT-e: *Uso Exclusivo* ou *Observação*. Para mudar, dê duplo clique na célula e escolha Uso Exclusivo *(tags obsCont do XML)* ou Observação do CT-e. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Você pode dar dois cliques em cima do nome de um parâmetro e modificá-lo para a sua necessidade. Lembre-se que, para o Uso Exclusivo, o limite de caracteres para o nome é **15**, enquanto que na observação não existe essa limitação. Se o nome configurado em um campo de uso exclusivo ultrapassar esse limite, ele será cortado no XML e, consequentemente, no DACT-e.*</span>

<b>LISTA COMPLETA DOS CAMPOS ADICIONAIS DO CT-E</b>

Em ordem alfabética de nome:

| Código | Nome | De onde vem a informação |
| --- | --- | --- |
| `process_agency_name` | Agência Prog. Carga | Nome da Agência/Armador da programação de carga. |
| `p_icms` | Alíquota ICMS | Alíquota de ICMS do CT-e. |
| `vehicle_trailer1_release_year` | Ano Fab Reboque 1 | Ano de fabricação do reboque 1. |
| `vehicle_trailer2_release_year` | Ano Fab Reboque 2 | Ano de fabricação do reboque 2. |
| `vehicle_trailer3_release_year` | Ano Fab Reboque 3 | Ano de fabricação do reboque 3. |
| `vehicle_traction_release_year` | Ano Fab Tração | Ano de fabricação do veículo de tração. |
| `bc_icms` | BC ICMS | Base de cálculo do ICMS. |
| `nfs_sizes` | C x L x A | Dimensões *(comprimento x largura x altura)* informadas nas notas fiscais *(soma todas as notas para exibição única)*. |
| `category1_id` | Categoria 1 | Nome da categoria 1 do CT-e. |
| `category2_id` | Categoria 2 | Nome da categoria 2 do CT-e. |
| `category3_id` | Categoria 3 | Nome da categoria 3 do CT-e. |
| `danger_class` | Classe | Classe de risco do produto perigoso *(só exibe se o primeiro produto da primeira nota fiscal for perigoso)*. |
| `reference_code` | Cod. Identificação | Código de identificação da programação de carga. |
| `quotation_id` | Cotação | Número da cotação que deu origem ao CT-e. |
| `icms_credit` | Crédito ICMS | Valor do crédito de ICMS. |
| `container_di_dta_reserve` | DI/DTA/RESERVA | DI, DTA ou reserva do container vinculado às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. |
| `user_issuer` | Emissor | Usuário que emitiu o CT-e. |
| `destination_office_id` | Filial Destino | Sigla da filial de destino do CT-e. |
| `origin_office_id` | Filial Origem | Sigla da filial de origem do CT-e. |
| `icms_discount` | ICMS com Desconto | Valor do desconto de ICMS. |
| `suspended_taxes` | Impostos Suspensos | Somatória de todo o valor suspenso de impostos mencionados nas notas do CT-e. |
| `container_temporary_seals` | Lac. Prov. Container | Lacres provisórios do container vinculado às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. |
| `container_seals` | Lacres do Container | Lacres do container vinculado às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. |
| `trip_programming_order_number` | LOAD | Número do pedido da programação de viagem mais recente vinculada ao CT-e. |
| `vehicle_trailer1_manufacturer` | Marca Reboque 1 | Nome do fabricante do reboque 1. |
| `vehicle_trailer2_manufacturer` | Marca Reboque 2 | Nome do fabricante do reboque 2. |
| `vehicle_trailer3_manufacturer` | Marca Reboque 3 | Nome do fabricante do reboque 3. |
| `vehicle_traction_manufacturer` | Marca Tração | Nome do fabricante do veículo de tração. |
| `vehicle_trailer1_model` | Modelo Reboque 1 | Nome do modelo do reboque 1. |
| `vehicle_trailer2_model` | Modelo Reboque 2 | Nome do modelo do reboque 2. |
| `vehicle_trailer3_model` | Modelo Reboque 3 | Nome do modelo do reboque 3. |
| `vehicle_traction_model` | Modelo Tração | Nome do modelo do veículo de tração. |
| `driver2_id` | Moto 2. | Nome do segundo motorista do CT-e. |
| `driver_id` | Moto. | Nome do motorista principal do CT-e. |
| `driver2_cnh` | Motor 2. CNH | Número da CNH do segundo motorista do CT-e. |
| `driver2_cnh_record` | Motor 2. CNH Reg. | Número de registro da CNH do segundo motorista do CT-e. |
| `driver2_cpf` | Motor 2. CPF | CPF do segundo motorista do CT-e. |
| `driver_cnh` | Motor. CNH | Número da CNH do motorista principal do CT-e. |
| `driver_cnh_record` | Motor. CNH Reg. | Número de registro da CNH do motorista principal do CT-e. |
| `driver_cpf` | Motor. CPF | CPF do motorista principal do CT-e. |
| `driver_rg` | Motor. RG | RG do motorista principal do CT-e. |
| `driver_rntrc` | Motor. RNTRC | RNTRC do motorista principal do CT-e. |
| `appropriate_name` | Nome Apropriado | Nome apropriado para embarque do produto perigoso *(só exibe se o primeiro produto da primeira nota fiscal for perigoso)*. |
| `insurer_name` | Nome da Seguradora | Nome da seguradora da carga. |
| `vehicle_traction_owner_name` | Nome Prop. Tração | Nome do proprietário do veículo de tração do CT-e. |
| `container_number` | Num. Container | Número do container vinculado às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. |
| `bl_number` | N° BL | Número do BL *(conhecimento de embarque marítimo)*. |
| `process_order_number` | Nº Pedido Prog. Carga | Número do pedido da programação de carga. |
| `process_number` | Nº Prog. Carga | Número da programação de carga vinculada ao CT-e. |
| `trip_programming_number` | Nº Prog. Viagem | Número da programação de viagem vinculada ao CT-e. |
| `driver_register_number` | Nº Reg. Motorista | Número de registro da CNH do motorista principal do CT-e. |
| `policy_number` | Número da Apólice | Número da apólice de seguro. |
| `order_number` | Número do Pedido | Número do pedido do cliente vinculado às notas fiscais do CT-e *(junta todos de forma única, separados por vírgula)*. |
| `reserve_number` | Número Reserva | Número da reserva da programação de carga vinculada ao CT-e *(só exibe se for uma exportação ou cabotagem)*. |
| `onu_dangerous_product` | ONU | Número ONU do produto perigoso *(só exibe se o primeiro produto da primeira nota fiscal for perigoso)*. |
| `operation_id` | Operação | Nome da operação do CT-e. |
| `pallets` | Paletes | Quantidade de paletes da carga. |
| `partner_name` | Parc. Nome | Nome do parceiro do CT-e. |
| `billing_profile_id` | Perfil Fat | Nome do perfil de faturamento do CT-e. |
| `nf_total_net_weight` | Peso Líquido | Peso líquido total das notas fiscais. |
| `port_ship` | PORTO/NAVIO | Porto e navio do transporte da programação de carga vinculada ao CT-e. |
| `delivery_at` | Prev Entr | Data de previsão de entrega do CT-e. |
| `vehicle_traction_owner_rntrc` | Prop. ANTT Tração | RNTRC do proprietário do veículo de tração. |
| `vehicle_traction_owner_document` | Prop. Doc. Tração | CPF ou CNPJ do proprietário do veículo de tração. |
| `vehicle_trailer1_license_plate` | Reboque 1 | Placa do reboque 1. |
| `vehicle_trailer2_license_plate` | Reboque 2 | Placa do reboque 2. |
| `vehicle_trailer3_license_plate` | Reboque 3 | Placa do reboque 3. |
| `icms_reduction` | Redução ICMS | Percentual de redução da base do ICMS. |
| `ref_customer` | Ref Cliente | Referência do cliente da programação de carga vinculada ao CT-e. |
| `reference_number` | Ref Despachante | Referência do despachante programação de carga vinculada ao CT-e. |
| `container_batches` | Remessa Container | Remessa dos containers vinculados às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. Separados por vírgula. |
| `vehicle_trailer1_renavam` | RENAVAM Reboque 1 | RENAVAM do reboque 1. |
| `vehicle_trailer2_renavam` | RENAVAM Reboque 2 | RENAVAM do reboque 2. |
| `vehicle_trailer3_renavam` | RENAVAM Reboque 3 | RENAVAM do reboque 3. |
| `vehicle_traction_renavam` | RENAVAM Tração | RENAVAM do veículo de tração. |
| `insurance_payer` | Responsab. do Seguro | Responsável pelo seguro da carga. |
| `service_type` | Serviço | Tipo de serviço do CT-e. |
| `destination_abbreviation` | Sigla Destino | Sigla da filial de destino. |
| `owner_abbreviation` | Sigla Emissor | Sigla da empresa emissora do CT-e. |
| `danger_subclass` | Subclasse | Subclasse de risco do produto perigoso *(só exibe se o primeiro produto da primeira nota fiscal for perigoso)*. |
| `container_weight` | Tara Container | Tara dos containers vinculados às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. Separados por vírgula. |
| `process_terminal` | Terminal Prog. Carga | Terminal da programação de carga vinculada ao CT-e. |
| `container_type` | Tipo do Container | Tipo dos containers vinculados às notas do CT-e *(que devem estar vinculadas à uma programação de carga)*. Separados por vírgula. |
| `vehicle_traction_license_plate` | Tração | Placa do veículo de tração. |
| `vehicle_trailer1_uf` | UF Reboque 1 | UF da placa do reboque 1. |
| `vehicle_trailer2_uf` | UF Reboque 2 | UF da placa do reboque 2. |
| `vehicle_trailer3_uf` | UF Reboque 3 | UF da placa do reboque 3. |
| `vehicle_traction_uf` | UF Tração | UF da placa do veículo de tração. |
| `expiration` | Venc. | Data de vencimento do CT-e. |
| `seller_name` | Vend. Nome | Nome do vendedor do CT-e. |
| `insurance_value` | Vlr. Tot. Assegurado | Valor total assegurado da carga, somatizando todas as notas fiscais vinculadas ao CT-e. |

#### ▌CAMPOS ADICIONAIS DA NFS-E

Escolha das informações do sistema que entram na NFS-e da empresa como campos adicionais.

![Aba Observações, subaba Campos Adicionais da NFS-e](05_form_obs_nfse.png){width=100%}

| Nº | Grupo | Para que serve |
| :---: | --- | --- |
| ❶ | **CAMPOS DISPONÍVEIS** | Lista as informações que podem ser incluídas na NFS-e. |
| ❷ | **CAMPOS SELECIONADOS** | Lista as informações que a empresa leva para a NFS-e. |

A inclusão e a retirada funcionam como no CT-e: **ARRASTE** a linha entre as duas grades.

Colunas da grade de campos disponíveis:

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código interno do campo. |
| **NOME** | Nome do campo. |

Colunas da grade de campos selecionados:

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código interno do campo. |
| **NOME** | Nome com que o campo aparece na NFS-e. Pode ser alterado clicando na célula. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Em todos os locais onde a Minuta é mencionada, caso a nota fiscal tenha sido gerada a partir de várias Minutas, somente a primeira delas é levada em consideração.*</span>

<b>LISTA COMPLETA DOS CAMPOS ADICIONAIS DA NFS-E</b>

Em ordem alfabética de nome. Todas as informações vêm da **MINUTA** que originou a NFS-e:

| Código | Nome | De onde vem a informação |
| --- | --- | --- |
| `created_at_income` | Data Cadastro da Minuta | Data de cadastro da minuta. |
| `requestor_doc_income` | Documento do Solicitante da Minuta | CPF ou CNPJ do solicitante da minuta. |
| `receiver_doc_income` | Documento do Destinatário da Minuta | CPF ou CNPJ do destinatário da minuta. |
| `withdrawal_doc_income` | Documento do Remetente da Minuta | CPF ou CNPJ do remetente da minuta. |
| `taker_doc_income` | Documento do Tomador da Minuta | CPF ou CNPJ do tomador da minuta. |
| `receiver_address_income` | Endereço do Destinatário da Minuta | Endereço do destinatário da minuta. |
| `withdrawal_address_income` | Endereço do Remetente da Minuta | Endereço do remetente da minuta. |
| `requestor_address_income` | Endereço do Solicitante da Minuta | Endereço do solicitante da minuta. |
| `taker_address_income` | Endereço do Tomador da Minuta | Endereço do tomador da minuta. |
| `freight_weight` | Frete-peso da Minuta | Valor do frete-peso da minuta. |
| `gris` | GRIS da Minuta | Valor do GRIS da minuta. |
| `container_number` | Nº Container da Minuta | Número do container da minuta. |
| `reference` | Nº Referência da Minuta | Número de referência da minuta. |
| `receiver_name_income` | Nome do Destinatário da Minuta | Nome do destinatário da minuta. |
| `driver_name_income` | Nome do Motorista da Minuta | Nome do motorista da minuta. |
| `withdrawal_name_income` | Nome do Remetente da Minuta | Nome do remetente da minuta. |
| `requestor_name_income` | Nome do Solicitante da Minuta | Nome do solicitante da minuta. |
| `taker_name_income` | Nome do Tomador da Minuta | Nome do tomador da minuta. |
| `nfs_number_income` | Números das Notas Fiscais da Minuta | Números das notas fiscais da minuta. |
| `nf_total_weight` | Peso Bruto da Minuta | Peso bruto total das notas fiscais da minuta. |
| `nf_total_weight_calculated` | Peso Calculado da Minuta | Peso calculado da minuta. |
| `nf_total_net_weight` | Peso Líquido da Minuta | Peso líquido total das notas fiscais da minuta. |
| `product` | Prod. Predominante da Minuta | Produto predominante da minuta. |
| `nfs_quantity_income` | Quantidade de Notas Fiscais da Minuta | Quantidade de notas fiscais da minuta. |
| `vehicle_trailer1_license_plate_income` | Reboque 1 da Minuta | Placa do reboque 1 da minuta. |
| `vehicle_trailer2_license_plate_income` | Reboque 2 da Minuta | Placa do reboque 2 da minuta. |
| `vehicle_trailer3_license_plate_income` | Reboque 3 da Minuta | Placa do reboque 3 da minuta. |
| `insurance` | Seguro da Minuta | Valor do seguro da minuta. |
| `shipment` | Shipment da Minuta | Número do shipment da programação de carga vinculada à minuta. |
| `vehicle_traction_license_plate_income` | Tração da Minuta | Placa do veículo de tração da minuta. |
| `nf_total_amount_income` | Valor NF-e da Minuta | Valor total das NF-e da minuta. |
| `expiration_income` | Vencimento da Minuta | Data de vencimento da minuta. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*As mudanças nas subabas só valem depois de clicar em **SALVAR**.*</span>

### ▌CARTEIRA DE CLIENTES

A aba **CARTEIRA DE CLIENTES** reúne os clientes vinculados à empresa.

![Aba Carteira de clientes](06_form_carteira.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | **CLIENTE** | **CLIENTE** | Código do cliente a incluir. Ao informar o código, o nome e a cidade do cliente aparecem ao lado. |
|  |  | **LUPA** | Abre a tela de **PESSOAS** para buscar o cliente *(atalho F2)*. |
| ❷ | **ADICIONAR** | **ADICIONAR** | Inclui na grade o cliente informado no campo **CLIENTE**. |
| ❸ | **REMOVER** | **REMOVER** | Retira da grade o cliente selecionado. |
| ❹ | **GRADE** | **CABEÇALHO DA GRADE** | Colunas dos clientes da carteira *(ver tabela abaixo)*. |

Colunas da grade:

| Coluna | O que mostra |
| --- | --- |
| **DOCUMENTO** | CNPJ ou CPF do cliente. |
| **NOME** | Nome ou razão social do cliente. |

#### ▌INCLUIR UM CLIENTE NA CARTEIRA

1. Na aba **CARTEIRA DE CLIENTES**, digite o código do cliente no campo **CLIENTE** ou clique na lupa.
2. Pela lupa, a tela de **PESSOAS** abre. Use a busca ❶ para encontrar o cliente e dê **DUPLO CLIQUE** na linha dele ❷.

![Busca de cliente aberta pela lupa](07_form_carteira_busca.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **BUSCA** | Procura o cliente por nome, CPF ou CNPJ, código, tipo ou cidade. |
| ❷ | **LINHA DO CLIENTE** | O duplo clique leva o cliente para o campo **CLIENTE** e fecha a busca. |

3. Com o cliente no campo, clique em **ADICIONAR**. O cliente aparece na grade.
4. Clique em **SALVAR** para gravar a carteira.

![Cliente incluído na carteira, antes de salvar](08_form_carteira_incluido.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O cliente só fica na carteira depois do **SALVAR**. Se o formulário for fechado pelo **FECHAR**, o sistema não pede confirmação e a inclusão é perdida.*</span>

### ▌EDITAR UMA EMPRESA

Na listagem, dê **DUPLO CLIQUE** na linha da empresa. O formulário abre na aba **INFORMAÇÕES**, com a razão social da empresa no título da janela e todos os dados já preenchidos.

![Empresa aberta para edição](09_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A edição é a única forma de abrir o formulário nesta tela. Os campos e botões são os descritos nas seções acima.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*As alterações feitas em qualquer aba só são gravadas pelo botão **SALVAR**.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
