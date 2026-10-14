# CT-es - Substituir Minuta por CT-e na Fatura

- ID: PO-A-410
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > CONFIGURAÇÕES > PARÂMETROS > CT-es - Substituir Minuta por CT-e na Fatura
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-410
- Anexos (não baixados): 01_invoice_trade_income_by_cte.png; 99_rodape.png; 00_banner.png; 99_rodape_v2.png

---

![Substituir Minuta por CT-e na Fatura](00_banner.png){width=100%}

> **MÓDULO:** CT-ES

> **LOCALIZAÇÃO:** EMPRESA -> CONFIGURAÇÕES -> DADOS & PARÂMETROS

Se esta opção estiver marcada como **SIM**, após a emissão do CT-e vinculado e/ou gerado à partir de uma Minuta Comum, caso a Minuta Comum esteja em uma Fatura ainda em aberto, o sistema fará a substituição automática do documento nesta fatura, removendo a Minuta e inserindo o CT-e. É interessante notar que:

- O CT-e somente será substituído após a autorização da emissão pela SEFAZ.
- Ao realizar a substituição, a Minuta Comum será **CANCELADA**.
- Se o CT-e for cancelado/inutilizado, a Minuta Comum não retornará para a Fatura.
- Se o valor do CT-e for diferente do valor da Minuta, as parcelas serão geradas novamente.
- Revise demais parâmetros de faturamento no cliente/empresa que, por ventura, impeçam a troca do documento.

![Substituir Minuta por CT-e na Fatura](01_invoice_trade_income_by_cte.png){width=60%}

### ▌OPÇÕES

| Opção | O que faz |
| --- | --- |
| **SIM** | Ativa a regra descrita acima. |
| **NÃO** *(padrão)* | Não aplica a regra. |

---

![Siimp Sistemas](99_rodape_v2.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
