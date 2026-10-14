# 🗳️ Perfil de Faturamento na Minuta

- ID: PO-A-296
- Caminho: 🤩 BLOG DE NOVIDADES > 🗳️ Perfil de Faturamento na Minuta
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-296
- Anexos (não baixados): image-20220721-152128.png

---

<div style="background-color:#c0392b; text-align:center; color:white; padding:5px;"><b>ARTIGO ORIGINALMENTE PUBLICADO EM 22/07/2022, NO ANTIGO BLOG DA SIIMP</b></div>

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *Esta é uma mudança prevista! Isso significa que ela está em ambiente de homologação, sendo testada e validada pela nossa equipe de desenvolvimento/testes. Você pode acessar o seu ambiente de homologação da Siimp e também fazer os seus testes baseado na sua operação, caso esta modificação afete diretamente o seu dia-a-dia.*

---

## 📑 INTRODUÇÃO

Olá pessoal 👋

Analisando a forma de faturamento do módulo de **MINUTA COMUM** e **MINUTA DE AET**, notamos algumas pequenas diferenças no processo de uso do **PERFIL DE FATURAMENTO** quando comparamos o mesmo procedimento efetuado pelo módulo de CT-es.

Basicamente, modificamos um pouco a funcionalidade destes dois botões abaixo *(somente dentro dos módulos citados em negrito logo acima)*\:

![](image-20220721-152128.png)

Agora, o faturamento destes dois botões <span style="color:dodgerblue;"></span><span style="color:red;">**respeitam a data de vencimento que foi calculada e marcada dentro da minuta**</span><span style="color:dodgerblue;"></span>, no campo **VENCIMENTO**, da mesma forma que o faturamento do CT-e funciona. Sendo assim, ambas as funcionalidades ficaram idênticas, sem diferenças no processo.

---

## ❓COMO FUNCIONA NO CT-E?

No processo de **FATURAR → INDIVIDUAL/AGRUPADO** no módulo de CT-es, caso o usuário não preencha os campos solicitados no formulário de faturamento, o sistema então verifica o perfil de faturamento marcado pelo tomador dentro do próprio CT-e no momento em que ele foi calculado.

Sim, é isso mesmo! Quando você calcula um CT-e, o sistema verifica o perfil de faturamento do tomador e copia a referência desse perfil para dentro do CT-e. Fazemos isso por padrão pois o cliente pode mudar de perfil de faturamento por motivos comerciais e/ou de regra de faturamento. Exemplo:

* O cliente **GUSTAVO**, do dia 01/07 ao dia 15/07 estava com um perfil de faturamento que possuía uma regra de vencimento da fatura para 28 dias após a emissão do CT-e.
* No dia 16/07, o time de faturamento da transportadora modificou o perfil do cliente **GUSTAVO**. Agora, a regra do vencimento da fatura será para 45 dias após a emissão do CT-e.
* Sendo assim, quando o time de faturamento realizar um fechamento de faturas:
  * Todos os CT-es emitidos entre os dias 01/07 e 15/07 cairão na regra dos 28 dias.
  * Os demais CT-es emitidos a partir do dia 16/07 cairão na regra dos 45 dias.

Com isso, o campo **VENCIMENTO** já é preenchido no CT-e automaticamente, respeitando o perfil de faturamento daquele cliente no momento em que ele foi utilizado. Dessa forma, ao gerar-se faturas destes CT-es, o sistema já sabe qual é o vencimento de cada uma delas.

---

## ❓TÁ, E COMO FUNCIONAVA NA MINUTA?

No processo de **FATURAR → INDIVIDUAL/AGRUPADO** no módulo de Minutas, caso o usuário não preencha os campos solicitados no formulário de faturamento, o sistema então verifica o perfil de faturamento **DIRETAMENTE** no tomador da Minuta, contando que não seja outros.

Essa é a principal diferença que causava problemas nos clientes que tentavam aplicar a mesma regra de faturamento em CT-es e Minutas. Por conta disso, o campo **VENCIMENTO** não era preenchido automaticamente na Minuta, causando duas possíveis inconsistências:

* Não existência da data de vencimento correta na Minuta.
* Possíveis modificações de perfil de faturamento no tomador durante um determinado período *(como mostrado no exemplo acima de CT-es)* não seriam acatadas.

---

## ❓E AGORA, COMO FICA?

Após a atualização, as regras de faturamento **INDIVIDUAL** e **AGRUPADO** dos dois módulos *(CT-es e Minutas)* ficarão idênticas. Nesse caso, o usuário precisará clicar na Minuta em **CALCULAR → VALORES DO FRETE** ou **CALCULAR → SOMENTE DADOS** para que essas informações sejam preenchidas automaticamente, e que tanto o perfil de faturamento como vencimento sejam acatados corretamente na Minuta.

---

## ❓O QUE DEVO FAZER?

Se você já havia se acostumado com a forma antiga de utilizar as funcionalidades **FATURAR → INDIVIDUAL/AGRUPADO** da **MINUTA COMUM** e/ou **MINUTA DE AET**, utilize o ambiente de homologação para testar o seu faturamento novamente, e ter certeza de que nenhuma rotina específica do seu processo terá problemas.

Dentro de nossos testes iniciais, não houve modificações significativas na forma de execução do processo.

---

## 📆 QUANDO ENTRA PARA PRODUÇÃO?

A previsão para entrada em produção desta modificação é **28/07/2022**, podendo ser prorrogada sem aviso prévio. Ainda possui dúvidas? Entre em contato com a nossa equipe através de [sac@siimp.com.br](mailto:sac@siimp.com.br "mailto:sac@siimp.com.br").
