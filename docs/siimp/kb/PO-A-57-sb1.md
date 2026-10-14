# SB1

- ID: PO-A-57
- Caminho: 🔌 INTEGRAÇÕES > 🔢 OUTRAS > SB1
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-57
- Anexos (não baixados): image.png; image1.png

---

# 🗒️ INTRODUÇÃO

Este manual tem como intuito explicar as configurações de integração do TMS junto ao ERP **SAP** da versão **SB1**.

![](image.png){width=316px}


---

# ❓ O QUE FAZ ESTA INTEGRAÇÃO

O **SAP Business One** é um sistema ERP desenvolvido para pequenas e médias empresas, que permite centralizar e gerenciar diferentes processos de negócio, como financeiro, compras, vendas, estoque, fiscal e contabilidade.

Esta integração foi desenvolvida para permitir a comunicação entre o TMS e o SAP Business One (SB1), possibilitando o compartilhamento de informações entre os sistemas de forma automatizada.

A integração contempla o envio e a sincronização de dados relacionados aos processos integrados, permitindo que as informações geradas no TMS sejam encaminhadas ao SAP Business One sem a necessidade de realizar o mesmo cadastro ou lançamento manualmente nos dois sistemas.

Dessa forma, a integração reduz a duplicidade de atividades, evita retrabalho e proporciona maior consistência das informações entre os sistemas TMS e SAP Business One.

# 1️⃣ INTEGRANDO COM MINUTAS E CT-ES

A integração permite realizar a sincronização de Minutas e CT-es entre o TMS e o SAP Business One (SB1), possibilitando que as informações geradas no TMS sejam enviadas ao SAP de forma automatizada.

O envio das Minutas e CT-es poderá ser executado por meio de AUTOMAÇÃO e/ou ROTINA DE APOIO, configuradas e liberadas posteriormente no sistema, conforme documentado na seção 🤖 REGRAS DE EXECUÇÃO / PIPELINES 

* (PO-A-164 🔗 Enviar CT-e para SB1) 
* (PO-A-165 🔗 Enviar Minuta Comum para SB1)
* (PO-A-166 🔗 Envia as Minutas Através do Romaneio (SB1))
* (PO-A-167 🔗 Envia as Minutas Através da Programação de Viagem (SB1))

Com isso, basta acionar a ROTINA DE APOIO e/ou configurar uma AUTOMAÇÃO com a regra correspondente ao processo de sincronização de Minutas e CT-es, informando os parâmetros necessários para que a integração seja executada corretamente.

---

# 🖼️ LOCALIZAÇÃO

![](image1.png)

---

# 🛠️ PARÂMETROS

* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `url`: Neste campo, deverá ser informada a **URL** de integração. Normalmente, a integração do sistema funciona em sistemas locais, e a definição desta `url` é variável. Para identificá-la, um consultor do **SB1** deve disponibilizá-la, juntamente com a camada de integração na plataforma.
* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `password`: Neste campo, ficará a senha para conseguir fazer a conexão com a integração, seria a mesma senha usada para entrar no sistema **SAP.**
* **<span style="color:red;">[ OBRIGATÓRIO ]</span>** `username`: Neste campo, ficará o nome de usuário para conseguir fazer a conexão com a integração, seria o mesmo nome de usuário usado para entrar no sistema **SAP.**
