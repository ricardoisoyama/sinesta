# MEGA

- ID: PO-A-55
- Caminho: 🔌 INTEGRAÇÕES > 🔢 OUTRAS > MEGA
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-55
- Anexos (não baixados): image-20221205-121453.png; image-20221205-121115.png; image-20221204-121721.png; image-20221204-123009.png; image.png

---

# 🗒️ INTRODUÇÃO

Este manual tem como intuito explicar as configurações de integração do TMS junto ao ERP **MEGA**.

![](image.png){width=428px}

---

# ❓ O QUE FAZ ESTA INTEGRAÇÃO

O **[MEGA](https://www.mega.com.br/home/)** é um ERP voltado para diversos segmentos de mercado, incluindo setores de indústria e logística.

Esta integração foi desenvolvida para realizar a integração de **PESSOAS** *(chamado de AGENTES no MEGA)* cadastrados diretamente no TMS Siimp que precisam constar dentro do **MEGA**. Dessa forma, processos internos do **MEGA** como faturamento, contas à pagar/receber, importação de notas fiscais e outros serviços podem ser executados sem a necessidade de recadastramento das pessoas envolvidas.

A ação de envio de pessoas poderá ser executada via **AUTOMAÇÃO** e/ou **ROTINA DE APOIO**, configurada e liberada posteriormente no sistema, conforme documentado na seção  PO-A-126 .

## 1️⃣ INTEGRANDO PESSOAS

Qualquer pessoa cadastrada dentro do TMS pode ser integrada junto ao **MEGA**. Para que o sistema consiga identificar se a pessoa sendo integrada é nova ou não, utiliza-se o campo **TAGS E MARCAÇÕES**. Quando ele estiver preenchido com um valor numérico maior do que zero, o sistema compreenderá que a pessoa já existe como um agente no **MEGA**. Com isso, em vez de mandar uma instrução de *cadastramento*, será enviado uma instrução de *atualização*.

![](image-20221205-121115.png)

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span>\* Se o campo **TAGS E MARCAÇÕES** estiver vazio, uma instrução de criação de agente será enviado ao sistema **MEGA**. Em casos de sucesso de comunicação e validação dos dados, o código do **MEGA** será inserido automaticamente neste campo. Qualquer tipo de problema durante a integração será reportado em histórico.\*

Com isso, basta acionar a **ROTINA DE APOIO** e/ou configurar uma **AUTOMAÇÃO** com a regra `Person__SendPeopleToMega`, mencionando os parâmetros necessários, e a integração irá funcionar corretamente.

---

# 🖼️ LOCALIZAÇÃO

![](image-20221205-121453.png)

---

# 🛠️ PARÂMETROS

* <span style="color:red;">**\[ OBRIGATÓRIO \]**</span> `url`: Neste campo, deverá ser informada a **URL** de integração. Normalmente, a integração do sistema funciona em sistemas locais, e a definição desta `url` é variável. Para identificá-la, um consultor da MEGA deve disponibilizá-la, juntamente com a camada de integração na plataforma.
* <span style="color:red;">**\[ OBRIGATÓRIO \]**</span> `branch_office`: Neste campo, deverá ser informado o **CÓDIGO DA FILIAL** da empresa no **MEGA**. Assim como em nosso sistema todas as empresas que o usuário tem acesso possuem um código, no **MEGA** é exatamente a mesma coisa. *Caso você possua várias filiais/empresas, você deve cadastrar uma integração para cada uma delas*, modificando apenas o conteúdo deste campo e a **EMPRESA** selecionada no primeiro campo do canto esquerdo superior.

> <span style="color:red;">***ATENÇÃO:***</span> *Caso haja necessidade de deixar uma integração como padrão quando não houver empresa selecionada na **PESSOA**, basta criar uma integração genérica, informando qual é o código da filial padrão, quando não houver empresa mencionada na pessoa.*

* <span style="color:red;">**\[ OBRIGATÓRIO \]**</span> `action`: Neste campo, deverá ser informado o **CÓDIGO DA AÇÃO** a ser executada como *workflow* definido no **MEGA**. Você pode conseguir esta informação juntamente à um consultor do sistema **MEGA**.
