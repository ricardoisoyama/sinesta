# 🥳 Automações e Integrações para Todos

- ID: PO-A-274
- Caminho: 🤩 BLOG DE NOVIDADES > 🥳 Automações e Integrações para Todos
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-274

---

<div style="background-color:#c0392b; text-align:center; color:white; padding:5px;"><b>ARTIGO ORIGINALMENTE PUBLICADO EM 15/12/2022, NO ANTIGO BLOG DA SIIMP</b></div>

Olá a todos 👋

Hoje temos um anúncio interessante neste final de ano. A partir de hoje, todos os clientes atuais e futuros, independente do plano contratado, terão liberados os módulos de **AUTOMAÇÕES** e **MARKETPLACE DE INTEGRAÇÕES**.

Caso você ainda não possua acesso, basta solicitá-lo via chat do sistema ou através do e-mail [sac@siimp.com.br](mailto:sac@siimp.com.br "mailto:sac@siimp.com.br") para que estes dois módulos sejam liberados para os seus usuários. Pedimos que o e-mail seja enviado pelo gestor, equipe de TI e/ou usuário decisor. Assim, somente aqueles usuários que realmente querem aprender a lidar com estes módulos terão o acesso necessário.

Abaixo, explicarei brevemente sobre estes dois módulos liberados a todos, além de mencionar algumas regras e limites de utilização 😉

---

## 🗒️ MÓDULOS LIBERADOS

### 1️⃣ O QUE CONTEMPLA O MÓDULO DE AUTOMAÇÕES

Este módulo permite que vários processos dentro da empresa sejam automatizados conforme regras de execução disponibilizadas na Base Técnica de Conhecimento, disponibilizada no seguinte link: [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica)

Lá, várias automações poderão ser configuradas, como importação de notas fiscais, envio de arquivos EDI para E-mail e/ou FTP, extração de relatórios personalizados, geração de faturas, geração de CT-es, envio de CT-es, e diversas outras automações que ficarão disponíveis.

### 2️⃣ O QUE CONTEMPLA O MÓDULO DE MARKETPLACE DE INTEGRAÇÕES

Este módulo permite que você cadastre e configure diversas integrações que estão disponíveis nos módulos do TMS. Há integrações com rastreadores, abastecimentos, GRIS, Vale Pedágios, entre outros. Todas as configurações podem ser localizadas em nossa Base Técnica de Conhecimento, disponibilizada no seguinte link: [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica)

---

## ❓ FAQ

### ➡️ QUANTAS INTEGRAÇÕES EU POSSO TER?

Atualmente, não há um limite na quantidade de integrações que poderão ser cadastradas. Caso a integração esteja disponível na [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica) você pode utilizá-la da forma que ela foi programada para funcionar.

### ➡️ QUANTAS AUTOMAÇÕES EU POSSO TER?

Também não há um limite de automações que poderão ser cadastradas. Desde que a forma de funcionamento de cada automação seja respeitada conforme a documentação na [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica), você poderá utilizar quaisquer automações.

No entanto, no caso específico de integrações, há algumas regrinhas de uso e limites de execuções que podem variar de acordo com a regra a ser executada. Estes detalhes podem ser verificados em [REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES), dentro da documentação mencionada acima.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *A documentação de regras de execução é um pouco extensa, e pode mencionar termos técnicos. É necessária a sua compreensão por completo para que haja um entendimento na configuração das regras de automação.*

As automações são executadas <u>em sistema de fila compartilhada</u>. O funcionamento desta fila está registrado na documentação acima. Em alguns casos, dependendo da quantidade de clientes utilizando as automações no mesmo instante, <u>a fila pode ficar extensa</u>, causando um gargalo na execução dos seus processos. Para prevenir-se destes gargalos, há a possibilidade de contratação de <u>filas e/ou robôs dedicados</u>.

### ➡️ PRECISO CONTRATAR UMA FILA/ROBÔ DEDICADO?

<u>Não precisa!</u> Todas as automações dos nossos clientes são executadas por uma quantidade razoável de robôs. <u>No entanto, gargalos podem acontecer, principalmente em horários de pico, mesmo sendo raros atualmente</u>. Caso você sinta que está fazendo uma carga de trabalho automática muito grande, você pode solicitar uma reunião junto ao time técnico através de [sac@siimp.com.br](mailto:sac@siimp.com.br "mailto:sac@siimp.com.br") para entendermos a real necessidade de contratação de uma fila/robô dedicado.

Além disso, monitoramos a fila compartilhada para entender a carga de trabalho de cada cliente. Se for detectado algum consumo de recurso muito maior, entraremos em contato para alinhamento de processos.

### ➡️ EU NÃO CONSEGUI ENTENDER COMO ISSO FUNCIONA, POSSO TER UM TREINAMENTO?

Sim, basta solicitá-lo à nossa equipe de suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br "mailto:sac@siimp.com.br"). No entanto, alguns pontos devem ser observados:

* As automações e integrações são **DOCUMENTAÇÕES TÉCNICAS**. Quem irá dar o treinamento é uma pessoa da área técnica da Siimp. Isso significa que a pessoa recebendo o treinamento já precisa ter um conhecimento prévio sobre os seguintes termos: `pipeline` e `json`. <u>Estes treinamentos não são voltados para usuários sem estes conhecimentos</u>.
* Solicitações de treinamentos passarão por validação e aprovação comercial antes de serem executados.

### ➡️ POSSO PEDIR PARA O SUPORTE CONFIGURAR UMA AUTOMÇÃO/INTEGRAÇÃO?

Sim. Caso você, mesmo seguindo a nossa documentação em [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica) não tenha entendido como configurar o item desejado, você pode abrir um ticket em nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br "mailto:sac@siimp.com.br").

A configuração da automação e/ou integração desejada tem um prazo de disponibilização pelo nosso suporte de **72 HORAS ÚTEIS**, uma vez que em algumas ocasiões, o time técnico da Siimp precisará ser acionado para validar se a solicitação requisitada pode ser concluída por completo pela automação/integração desejada.

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Lembrando que este prazo de 72 horas só existe caso você solicite a configuração ao nosso suporte. Caso você mesmo tenha compreendido o que deseja fazer usando nossa* [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica)*, então você pode realizar a configuração no mesmo instante desejado 😉*.

### ➡️ A INTEGRAÇÃO/AUTOMAÇÃO NÃO FAZ EXATAMENTE O QUE EU QUERO, E AGORA?

Todas as integrações e automações disponíveis estão documentadas em [Base de Conhecimento Técnica \| Knowledge Base (youtrack.cloud)](https://siimp.youtrack.cloud/articles/SUP-A-380/Base-de-Conhecimento-Tecnica). Cada uma delas tem um intuito, executando exatamente aquilo que estiver documentado.

Caso você precise de um ajuste e/ou acréscimo de funcionalidade em uma integração e/ou automação já existente, você deve pontuá-las junto ao nosso time de suporte, que irá abrir um ticket em nosso time de desenvolvimento para avaliar a viabilidade da alteração desejada. Em alguns casos, dependendo da dificuldade técnica envolvida para realizar as alterações necessárias, propostas comerciais deverão ser aceitas pela transportadora.

### ➡️ POSSO SOLICITAR UMA AUTOMAÇÃO/INTEGRAÇÃO?

Pode sim, porém, alguns pontos devem ser observados:

* Integrações são bem complexas de serem executadas. Por isso, sempre precisamos de alguns itens antes de analisar aprofundadamente. Estes itens são:
  * Manuais
  * Ambientes de homologação e testes
  * Usuário, senha e/ou token de acesso destes ambientes
* Automações são mais simples de serem implementadas, porém é necessário alinhamento junto ao time técnico para que elas sejam executadas. Nestes casos, reuniões prévias junto ao cliente poderão ser marcadas antes de dar andamento ao desenvolvimento.
* Tanto integrações como automações podem passar por validação comercial antes de serem executadas.
