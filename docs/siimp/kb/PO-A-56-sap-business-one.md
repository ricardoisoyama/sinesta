# SAP Business One

- ID: PO-A-56
- Caminho: 🔌 INTEGRAÇÕES > 🔢 OUTRAS > SAP Business One
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-56
- Anexos (não baixados): image-20230105-152347.png; image-20230105-152340.png; image-20221204-123009.png; image-20221204-121721.png; image-20221205-121115.png; image-20221205-121453.png; image.png

---

# 🗒️ INTRODUÇÃO

Este manual tem como intuito explicar as configurações de integração do TMS junto ao ERP **SAP** da versão **BUSINESS ONE**.

![](image.png){width=316px}

---

# ❓ O QUE FAZ ESTA INTEGRAÇÃO

O ***[SAP](https://www.sap.com/brazil/index.html)*** é um ERP voltado para gerenciamento de processos de negócios que facilita o fluxo de informações entre as organizações.

Esta integração foi desenvolvida para realizar algumas integrações com o o sistema ERP **SAP**, os módulos integrados são pessoas, veículos, pneus, ordem de serviço e terceiro e agregados. A integração permite um fluxo de dados entre os sistemas **TMS** e **SAP,** assim podendo compartilhar dados sem precisar ficar recadastrando em ambos os sistemas.

## 1️⃣ INTEGRANDO PESSOAS

Apenas pessoa com classificações de **CLIENTE** e/ou **FORNECEDOR** poderão ser integradas junto ao **SAP**. A ação de envio de pessoas *(Clientes e/ou Fornecedores)* poderá ser executada via **AUTOMAÇÃO** e/ou **ROTINA DE APOIO**, configurada e liberada posteriormente no sistema, conforme documentado na seção 🤖 **REGRAS DE EXECUÇÃO / PIPELINES** (PO-A-126).

Com isso, basta acionar a **ROTINA DE APOIO** e/ou configurar uma **AUTOMAÇÃO** com a regra `Person__SendBusinessPartnerToSAP`, mencionando os parâmetros necessário e a integração irá funcionar corretamente.

---

# 🖼️ LOCALIZAÇÃO

![](image-20230105-152347.png)

---

# 🛠️ PARÂMETROS

* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `url`: Neste campo, deverá ser informada a **URL** de integração. Normalmente, a integração do sistema funciona em sistemas locais, e a definição desta `url` é variável. Para identificá-la, um consultor do **SAP** deve disponibilizá-la, juntamente com a camada de integração na plataforma.
* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `company_bd`: Neste campo, deve ser informado em qual base do **SAP** que integração deverá acontecer, novamente, consulte um responsável do **SAP** onde ele irá entregar toda essa parte de informações necessárias.
* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `key_1`: Neste campo, ficará a senha para conseguir fazer a conexão com a integração, seria a mesma senha usada para entrar no sistema **SAP.**
* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `key_2`: Neste campo, ficará o nome de usuário para conseguir fazer a conexão com a integração, seria o mesmo nome de usuário usado para entrar no sistema **SAP.**
