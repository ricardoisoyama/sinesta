# Faturas - Configuração da Data de Competência ao Emitir

- ID: PO-A-420
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > CONFIGURAÇÕES > PARÂMETROS > Faturas - Configuração da Data de Competência ao Emitir
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-420
- Anexos (não baixados): 01_preference_origin_competency_date_from_invoice.png; 99_rodape.png; 00_banner.png; 99_rodape_v2.png

---

![Configuração da Data de Competência ao Emitir](00_banner.png){width=100%}

> **MÓDULO:** FATURAS

> **LOCALIZAÇÃO:** EMPRESA -> CONFIGURAÇÕES -> DADOS & PARÂMETROS

Se esta opção estiver marcada como **DATA DE EMISSÃO**, a **DATA DE COMPETÊNCIA** das **MOVIMENTAÇÕES** será automaticamente definida como a **DATA DE EMISSÃO AO EMITIR A FATURA**.

A opção **PADRÃO** do sistema é a **DATA DE VENCIMENTO DO DOCUMENTO RELACIONADO**, que irá considerar a **DATA DE VENCIMENTO AO EMITIR A FATURA** como a **DATA DE COMPETÊNCIA**.

Normalmente será a **DATA DE VENCIMENTO** da própria **FATURA**, mas há casos que pode ser a **DATA DE VENCIMENTO** do CT-e ou outro documento.

**POR EXEMPLO:** se a fatura for gerada através da tela **FISCAL->CT-E->FATURAR**, a **DATA DE VENCIMENTO DO CT-E** será usada como a **DATA DE COMPETÊNCIA**.

![Configuração da Data de Competência ao Emitir](01_preference_origin_competency_date_from_invoice.png){width=60%}

### ▌OPÇÕES

| Opção | O que faz |
| --- | --- |
| **DATA DE VENCIMENTO DO DOCUMENTO RELACIONADO** *(padrão)* | Competência = data de vencimento do documento *(fatura, CT-e etc.)*. |
| **DATA DE EMISSÃO** | Competência = data de emissão da fatura. |

---

![Siimp Sistemas](99_rodape_v2.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
