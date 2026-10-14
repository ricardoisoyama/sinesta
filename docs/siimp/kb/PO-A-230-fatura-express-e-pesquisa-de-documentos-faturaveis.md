# 💵 Fatura Express e Pesquisa de Documentos Faturáveis

- ID: PO-A-230
- Caminho: 🤩 BLOG DE NOVIDADES > 💵 Fatura Express e Pesquisa de Documentos Faturáveis
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-230
- Anexos (não baixados): image.png; image1.png; image2.png; image3.png; image4.png; image5.png; image6.png; image7.png

---

Olá a todos 👋

Recentemente, havíamos limitado a quantidade de documentos retornados pela consulta da Fatura Express e da pesquisa de documentos do formulário de faturas para <u>200</u>, devido a problemas de desempenho na entrega dos dados pesquisados. Este desempenho estava correlacionado a uma série de regras que tiveram de ser redefinidas para que não houvesse um impacto no banco de dados no momento em que vários clientes fizessem o processo de faturamento em conjunto.

Com isso, esta postagem tem como objetivo explicar quais foram os processos modificados na próxima atualização sistêmica, detalhando os cenários atuais e posteriores destes assuntos.

A atualização está prevista para acontecer no dia **19/08/2024**, e já está disponível para testes no ambiente de homologação. Aqueles que ainda não possuírem acesso a este ambiente, solicitá-lo junto ao suporte através de sac@siimp.com.br.

---

# 1️⃣ PESQUISA DE DOCUMENTOS

O limite da pesquisa de documentos, tanto no formulário de faturas como no módulo **FATURA EXPRESS** aumentou para **2 mil documentos**. A grande maioria das melhorias efetuadas foram em *queries* de banco de dados, <u>mas uma única modificação efetuada aumentou consideravelmente o tempo de retorno dos documentos na tela</u>. Essa modificação refere-se ao **PERFIL DE FATURAMENTO**.

No módulo atual, para cada documento pesquisado, caso o documento não tenha sido marcado com um perfil de faturamento no momento da emissão, <u>o sistema tenta calcular automaticamente qual deve ser o perfil de faturamento naquele momento</u>. Esse processo, em uma quantidade de 300 documentos ou mais, é custosa e lenta para ser processada. Por conta disso, esse comportamento foi **completamente removido**.

Com isso, na nova versão, caso o CT-e ou a Minuta não possua um perfil de faturamento, <u>deve-se marcar no documento manualmente</u>, antes de fazer o processo de pesquisa de documentos na fatura.

---

# 2️⃣ REFATORAÇÃO DO MÓDULO FATURA EXPRESS

A **FATURA EXPRESS** foi o primeiro módulo de faturamento rápido de documentos, e por isso mantinha regras e comportamentos que, em partes, não refletiam as atualizações mais recentes de regra de negócio. Por conta disso, a atualização reescreveu <u>100% do módulo</u>, mantendo os objetivos principais, mas acrescentando regras de negócio, liberações e travas, garantindo a integridade dos dados sendo faturados.

---

## ➡️ LISTAGEM

A tela de listagem sofreu pequenas melhorias visuais e de funcionalidade. Abaixo, segue uma imagem dos módulos atual *(à esquerda)* e após a refatoração *(à direita)*.

![](image.png)

1. Possibilidade de seleção múltipla direta em tela.
2. Pesquisa de várias faturas de forma consistente.
3. Filtro renomeado pela data específica ao qual ele executa a pesquisa.

---

## ➡️ FORMULÁRIO

Já no formulário, uma mudança maior ocorreu, tanto em termos de disposição de campos como em funcionalidade.

1. Inserção do cabeçalho da Fatura Express, permitindo a visualização rápida de informações que já são padronizadas em outros formulários do sistema. Após a inserção/geração das faturas, os campos ficam completamente desabilitados, impedindo alterações futuras.
2. Dados de geração de fatura agrupados em uma única linha.
3. Pesquisa de documentos melhor disposta na listagem, permitindo a identificação rápida de campos específicos para pesquisa de documentos.

![](image1.png)

Quando o usuário passar o mouse em cima do campo tipo, uma pequena instrução de uso sobre as diferenças na geração de documentos será exibida.

![](image2.png)

A coluna **FATURA** foi modificada, para que ela possa ser clicada. Além disso, o *status* da fatura é exibido logo na frente, caso a fatura já esteja emitida, liquidada ou cancelada. Por conta disso, as colunas **GERADO** e **STATUS** foram removidas da listagem.

![](image3.png)

Os filtros de CT-es e Minutas também tiveram suas descrições modificadas para facilitar o entendimento no momento da pesquisa. Na imagem abaixo, à esquerda, estão os filtros atuais, e à direita, como ficarão.

![](image4.png)

> *PS.: O filtro **CARTEIRA**, existente no formulário atual, foi <u>removido</u> devido a sua inutilização de funcionalidade. Antigamente, quando não existia o perfil de faturamento, o vínculo da carteira era efetuado diretamente no cliente. Há alguns anos, a possibilidade de cadastramento da carteira foi removida do cadastro, fazendo com que todo o uso desta funcionalidade fosse migrado para perfil de faturamento.*

---

## ➡️ EDIÇÃO DE DOCUMENTOS PESQUISADOS

Este tópico talvez seja a principal diferença entre a funcionalidade atualmente em produção e a funcionalidade que estará por vir na próxima atualização.

Na funcionalidade atual, caso eu já tenha efetuado uma pesquisa de documentos na Fatura Express, e queira efetivar uma nova pesquisa, <u>o sistema "junta" os documentos pesquisados no momento anterior com os novos resultados</u>. Este comportamento **era um dos principais problemas de faturamento, uma vez que corria-se o risco de duplicar o faturamento, caso o usuário não se atentasse à data de pesquisa**. Por exemplo:

* Vamos supor que eu precise pesquisar documentos entre os dias **01/01/2024** e **02/08/2024**. Ao pesquisar, o sistema retornaria todos os documentos pendentes de faturamento nestas respectivas datas, respeitando o tipo da Fatura Express selecionada.

![](image5.png)

* Agora, <u>em vez de gerar os documentos</u>, eu quero pesquisar novamente documentos que estão em outras datas, como por exemplo entre os dias **02/02/2024** e **13/06/2024**. <u>Ele permite a busca novamente</u>, podendo retornar:
  * Os mesmos dados anteriores, onde o sistema teria que fazer uma diferenciação entre os documentos novos e atuais.
  * Dados novos, onde o sistema teria que juntar os novos agrupamentos aos antigos.
  * Os mesmos agrupamentos, mas com documentos novos, como nos casos de emissões retroativas.
  * Os mesmos agrupamentos, porém já faturados por outro usuário, através de outra tela, mas ainda não detectados pelo usuário atual.
  * Caso o usuário tenha editado os documentos antes de pesquisar novamente, os dados eram perdidos.

Por conta da complexidade em manter o *tracking* de modificações, a partir da nova atualização o sistema <u>não permitirá multiplas pesquisas de agrupamentos de documentos</u>. Isso significa que, ao pesquisar mais de uma vez dentro da **FATURA EXPRESS**, o sistema irá questionar ao usuário se ele deseja remover os agrupamentos pesquisados anteriormente antes de adicionar os novos.

![](image6.png)

Além disso, a tela de edição de documentos do agrupamento que irá gerar uma fatura também foi reformulada. Abaixo, seguem as telas atuais e novas. Para remover documentos, basta selecioná-los e apertar **DELETE** do teclado. Já a funcionalidade de adição de novos documentos também foi removida pelos mesmos motivos citados no tópico anterior.

![](image7.png)

---

## ➡️ MUDANÇAS DE REGRAS DE NEGÓCIO

* No módulo de **FATURA EXPRESS** atualmente em produção, ao tentar excluir um gerador, caso este estiver vinculado à uma ou mais faturas cadastradas, <u>todas as faturas são canceladas automaticamente</u>. Isso pode causar um **erro em escala**, onde o usuário *"sem querer"*, poderia cancelar todo o lote de faturas recém-gerado. Após a atualização, <u>um erro será reportado ao usuário, somente permitindo a exclusão se todas as faturas já tiverem sido canceladas pelo usuário anteriormente</u>, ou se o gerador ainda não tiver faturas vinculadas.
* No módulo atual, para descobrir o tomador de uma Minuta e agrupá-las em tela, caso a Minuta esteja marcada com um determinado tomador, mas o campo deste tomador <u>estivesse vazio</u> *(por exemplo, na Minuta marquei que o tomador é o destinatário, mas não coloquei ninguém na destinatário)*, o sistema acata que o tomador da Minuta será sempre a **RETIRADA**. A partir da refatoração, se este caso acontecer, será considerado o **SOLICITANTE** da Minuta como tomador, e na sua ausência, a Minuta <u>não será retornada e agrupada no Fatura Express</u>.
* No módulo atual, a busca e o agrupamento por <u>perfis de faturamento em Minutas considera o perfil atrelado no cadastro do tomador da Minuta</u>. No novo módulo, a pesquisa e agrupamento será feito pelo perfil de faturamento que <u>está marcado na Minuta, anotado automaticamente no momento de criação e/ou cálculo da Minuta, exatamente da mesma forma que é feito para CT-es</u>.
* No módulo atual, Minutas que estão atreladas a perfis de faturamento do tipo **BOLETIM**, ou Minutas que, por ventura, estão em boletins de caixa faturados, ou então tomadores que possuem o parâmetro para impedir que estes documentos sejam faturados via gerador de faturas, <u>não são consideradas da pesquisa</u>. Isso significa que o sistema não está preparado para compreender essas nuâncias de parâmetros no caso da Minuta. Após a refatoração, este comportamento foi corrigido.
