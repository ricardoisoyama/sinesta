# Cliente

- ID: PO-A-616
- Caminho: 🛟 BASE DE CONHECIMENTO > PESSOAS > Cliente
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-616
- Anexos (não baixados): 00_banner_cliente.png; c01_cliente_habilitada.png; c02_empresas_incluir.png; c03_empresas_grid.png; c04_pesos_incluir.png; c05_pesos_grid.png; c06_tabelas_frete.png; c07_vendedores_incluir.png; c08_vendedores_grid.png; c09_vendedores_confirmar.png; c10_palavras_incluir.png; c11_palavras_grid.png; c12_cte_incluir.png; c13_cte_grid.png; 99_rodape.png

---

![Manual - Pessoas - Cliente](00_banner_cliente.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Cada cliente tem regras próprias: qual empresa do grupo deve emitir os documentos dele, como os pesos aparecem no CT-e, quem é o vendedor responsável, que informações vêm escondidas na observação das notas fiscais. A aba **CLIENTE** guarda essas regras no cadastro, para que o sistema as aplique sozinho.

A aba tem seis subabas: **EMPRESAS PADRÕES**, **PESOS/MEDIDAS FISCAIS**, **TABELAS DE FRETE**, **VENDEDORES**, **PALAVRAS-CHAVE** e **CENTRAL DE CT-ES**. Ela é usada principalmente pelas áreas comercial, de cadastro e de emissão.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A aba **CLIENTE** fica no formulário da pessoa e começa desabilitada. Ela é liberada por completo ao marcar **CLIENTE** na barra **CLASSIFICAÇÕES**, na base da janela.

![Aba Cliente desabilitada no cadastro novo; checkbox Cliente; aba liberada](c01_cliente_habilitada.png){width=100%}

Nas subabas com lista, a inclusão segue sempre o mesmo padrão: preencha os campos da barra ❶, clique em **ADICIONAR** ❷ e, para retirar, selecione a linha e clique em **REMOVER** ❸.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Ao marcar **CLIENTE**, o campo **NATUREZA FISCAL** do cabeçalho passa a ser obrigatório. Sem ele, o cadastro não é salvo e aparece a mensagem **É NECESSÁRIO INFORMAR A NATUREZA FISCAL QUANDO A PESSOA FOR CLIENTE!**.*</span>

---

## <font color="#FFAE00">▌</font>SUBABAS

### ▌EMPRESAS PADRÕES

Define qual empresa do grupo é sugerida *(ou bloqueada)* quando esse cliente participa de um documento com determinado papel. Por exemplo: sempre que o cliente for **TOMADOR** de um CT-e, sugerir a empresa X.

![Empresa padrão preenchida para inclusão](c02_empresas_incluir.png){width=100%}

| Nº | Campo | Para que serve |
| --- | --- | --- |
| ❶ | **TIPO** | Documento a que a regra se aplica: CT-e, Coleta ou Minuta. |
|  | **QUANDO FOR** | Papel do cliente no documento: Remetente, Expedidor, Recebedor, Destinatário ou Tomador. |
|  | **EMPRESA** | Empresa do grupo que a regra indica. |
|  | **BLOQUEAR?** | **NÃO** *(padrão)* sugere a empresa; **SIM** bloqueia o uso dessa empresa nesse documento e papel. |
| ❷ | **ADICIONAR** | Inclui a regra na lista. |
| ❸ | **REMOVER** | Retira as regras marcadas na lista, sem pedir confirmação. |

![Lista de empresas padrões com uma regra](c03_empresas_grid.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **EMPRESA** | Empresa da regra. |
| **QUANDO FOR** | Papel do cliente. |
| **TIPO** | Documento da regra. |
| **BLOQUEAR?** | **NÃO** ou **SIM**. |

### ▌PESOS/MEDIDAS FISCAIS

Personaliza o nome e as medidas de peso que saem nas tags infQ do CT-e desse cliente *(as informações de quantidade da carga impressas no documento)*.

Alguns embarcadores, para integrar o XML do CT-e aos seus sistemas, exigem que as nomenclaturas de pesos e medidas sigam um padrão próprio. É para isso que a subaba existe: ela adapta o nome e o valor de cada medida ao que o embarcador espera receber.

![Medida fiscal preenchida para inclusão](c04_pesos_incluir.png){width=100%}

| Nº | Campo | Para que serve |
| --- | --- | --- |
| ❶ | **TIPO** | Unidade de medida: M3, KG, TON, UNIDADE, LITROS ou MMBTU. |
|  | **CAMPO** | De onde vem o valor: Peso Bruto, Peso Líquido, Peso Aferido, Peso Calculado, Qtd. Produtos, Cubagem, Paletes ou Volumes. |
|  | **DESCRIÇÃO** | Nome que aparece no CT-e *(até 20 caracteres)*. |
|  | **FATOR DE CONVERSÃO** | Multiplica o valor do campo escolhido. Deixe 1 *(padrão)* para manter o mesmo valor. |
| ❷ | **ADICIONAR** | Inclui a medida na lista. |
| ❸ | **REMOVER** | Retira a medida selecionada. |

![Lista de medidas fiscais com uma linha](c05_pesos_grid.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **POSIÇÃO** | Ordem da medida no CT-e. |
| **TIPO** | Unidade de medida. |
| **CAMPO** | Origem do valor. |
| **DESCRIÇÃO** | Nome que sai no CT-e. |
| **FATOR DE CONVERSÃO** | Multiplicador aplicado. |

#### ▌EXEMPLOS DE USO

| Situação | TIPO | CAMPO | DESCRIÇÃO | FATOR DE CONVERSÃO | Resultado no CT-e |
| --- | --- | --- | --- | --- | --- |
| Embarcador pede o peso em toneladas | **TON** | **PESO BRUTO** | PESO BRUTO TON | 0,001 | Uma carga de 2.500 kg sai como 2,5 TON. |
| Embarcador pede um nome próprio para a cubagem | **M3** | **CUBAGEM** | M3 CUBADO | 1 | A cubagem sai com o mesmo valor, com a descrição M3 CUBADO. |

### ▌TABELAS DE FRETE

Somente consulta: mostra as tabelas de frete de que o cliente participa. Para alterar, é preciso ter acesso ao menu **COMERCIAL -> TABELA DE FRETE -> TABELAS**.

![Tabelas de frete de um cliente](c06_tabelas_frete.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código do vínculo do cliente com a tabela. |
| **NOME** | Nome da tabela de frete. |
| **VIGÊNCIA DE** | Início da vigência *(vazio = sem data inicial)*. |
| **ATÉ** | Fim da vigência *(vazio = sem data final)*. |

### ▌VENDEDORES

Gerencia os vendedores responsáveis pelo cliente, com o status e a data de aprovação. Os mesmos dados aparecem em **COMERCIAL -> PARCEIROS -> CLIENTES**.

Essas liberações também podem ser feitas no módulo **COMERCIAL -> VENDEDORES -> CLIENTES**.

![Vendedor escolhido para inclusão](c07_vendedores_incluir.png){width=100%}

| Nº | Campo | Para que serve |
| --- | --- | --- |
| ❶ | **VENDEDOR** | Pessoa classificada como vendedor. Digite parte do nome para buscar. |
| ❷ | **ADICIONAR** | Vincula o vendedor ao cliente. O vínculo é gravado e aprovado na hora, com a mensagem **VENDEDOR ADICIONADO E APROVADO COM SUCESSO!**. |
| ❸ | **REMOVER** | Desvincula o vendedor selecionado, após confirmação. |

![Lista com um vendedor aprovado](c08_vendedores_grid.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **CÓDIGO** | Código do vendedor. |
| **NOME** | Nome do vendedor. |
| **APROVADO?** | **SIM** ou **NÃO**. |
| **DATA DE APROVAÇÃO** | Data e hora da aprovação. |

![Confirmação ao remover um vendedor](c09_vendedores_confirmar.png){width=42%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Em **VENDEDORES**, incluir e remover gravam na hora, sem precisar salvar o cadastro da pessoa.*</span>

### ▌PALAVRAS-CHAVE

Cria palavras-chave para coletar informações *(tags)* dentro da observação das notas fiscais importadas desse cliente. Exemplo: com a palavra-chave **PEDIDO:**, o sistema lê o que vem depois dela na observação e grava no campo de destino escolhido.

![Palavra-chave preenchida para inclusão](c10_palavras_incluir.png){width=100%}

| Nº | Campo | Para que serve |
| --- | --- | --- |
| ❶ | **PALAVRA-CHAVE** | Texto procurado na observação da nota fiscal. |
|  | **CAMPO DE DESTINO** | Onde o valor encontrado é gravado: Número do Pedido, Descrição, Espécie ou Dados Adicionais. |
|  | **QTD. CARACTERES** | Quantos caracteres ler depois da palavra-chave. |
|  | **IR ATÉ O PRÓXIMO ESPAÇO** | Marcado, lê da palavra-chave até o próximo espaço em branco. |
|  | **SOMENTE NÚMEROS** | Marcado, considera só os números e descarta as letras. |
|  | **LIMPAR ZEROS À ESQUERDA** | Marcado, desconsidera os zeros à esquerda. |
| ❷ | **ADICIONAR** | Grava a palavra-chave na hora, com a mensagem **PALAVRA-CHAVE INSERIDA COM SUCESSO!**. |
| ❸ | **REMOVER** | Exclui a palavra-chave selecionada na hora. |

![Lista com uma palavra-chave](c11_palavras_grid.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **PALAVRA-CHAVE** | Texto procurado. |
| **CAMPO DE DESTINO** | Onde o valor é gravado. |
| **QTD. CARACTERES** | Quantidade de caracteres lidos. |
| **PRÓXIMO ESPAÇO** | **SIM** ou **NÃO**. |
| **SOMENTE NÚMEROS** | **SIM** ou **NÃO**. |
| **LIMPAR ZEROS À ESQUERDA** | **SIM** ou **NÃO**. |

### ▌CENTRAL DE CT-ES

Lista os componentes de frete que devem ser ignorados no total quando o CT-e desse cliente é importado pela **CENTRAL DE CT-ES**. O valor deles é subtraído do total do CT-e e o resultado vai para o campo **TOTAL PARA CÁLCULO**.

![Componente preenchido para inclusão](c12_cte_incluir.png){width=100%}

| Nº | Campo | Para que serve |
| --- | --- | --- |
| ❶ | **NOME DO COMPONENTE** | Nome do componente de frete, igual ao que vem no CT-e importado *(até 50 caracteres)*. |
| ❷ | **ADICIONAR** | Inclui o componente na lista. |
| ❸ | **REMOVER** | Retira o componente selecionado. |

![Lista com um componente ignorado](c13_cte_grid.png){width=100%}

| Coluna | O que mostra |
| --- | --- |
| **NOME DO COMPONENTE** | Componente ignorado na importação. |

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*As subabas **VENDEDORES** e **PALAVRAS-CHAVE** gravam na hora. **EMPRESAS PADRÕES**, **PESOS/MEDIDAS FISCAIS** e **CENTRAL DE CT-ES** só são gravadas ao clicar em **SALVAR** ou **SALVAR & FECHAR** no cadastro da pessoa.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
