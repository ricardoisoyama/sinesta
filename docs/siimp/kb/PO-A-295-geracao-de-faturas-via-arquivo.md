# 💵 Geração de Faturas via Arquivo

- ID: PO-A-295
- Caminho: 🤩 BLOG DE NOVIDADES > 💵 Geração de Faturas via Arquivo
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-295
- Anexos (não baixados): image-20220722-184014.png

---

<div style="background-color:#c0392b; text-align:center; color:white; padding:5px;"><b>ARTIGO ORIGINALMENTE PUBLICADO EM 25/07/2022, NO ANTIGO BLOG DA SIIMP</b></div>

Olá pessoal 👋

Recentemente, atualizamos o nosso módulo de **FATURAMENTO**, para permitir a <u>importação de faturas via upload de arquivo</u> 🥳.

Este processo é extremamente útil se você efetua algum procedimento de “pré-fechamento” junto ao seu cliente, enviando um rascunho para confirmação antes da efetivação do seu faturamento.

---

## 🤯 WOW, E COMO ISSO FUNCIONA?

Adicionamos um novo botão chamado **UPLOAD**. Dentro dele, é possível encontrar dois menus, chamados **PREFAT** e **PERSONALIZADO**.

![](image-20220722-184014.png)

O **PREFAT** é um arquivo TXT da mesma família dos EDIS *(NOTFIS, CONEMB, DOCCOB e OCOREN)*. Ele é padronizado por embarcador, contendo todos os documentos que o embarcador vai realizar o pagamento, juntamente com os valores adicionais e/ou de desconto relacionados à operação. Com base nesse arquivo, você pode importá-lo para dentro do sistema usando essa opção, e a fatura contendo todos os documentos solicitados pelo embarcador será gerada de forma automática, respeitando inclusive o perfil de faturamento configurado no cliente *(para casos de parcelamento e/ou vencimentos posteriores)*.

Já o menu **PERSONALIZADO** serve para a realização de upload de um arquivo padronizado específico para a sua operação. Vamos supor que você faça “pré-fechamentos de faturas” em uma planilha padronizada. Nosso sistema poderia ler essa planilha e gerar as faturas dentro do sistema de forma automática, respeitando as configurações que nela existam.

A sua empresa pode ter uma ou várias regras!

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span>* Todas as regras de arquivos **PREFAT** e/ou **PERSONALIZADO** precisam ser pré-programadas pela equipe de desenvolvimento da Siimp, visto que cada arquivo possui uma regra específica que deverá ser combinada com o time antes de ser implementada. Cada arquivo programado e liberado possui um pequeno custo de ativação, que pode ser solicitado junto à equipe comercial pelo e-mail [comercial@siimp.com.br](mailto:comercial@siimp.com.br "mailto:comercial@siimp.com.br").*
