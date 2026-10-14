# ⏲️ Aviso de Vencimento

- ID: PO-A-146
- Caminho: 🤖 PIPELINES E AUTOMAÇÕES > ⏲️ Aviso de Vencimento
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-146

---

# 📚 DETALHES PRINCIPAIS

* **IDENTIFICADOR:** `General__NotifyExpiration`
* **EXPORTÁVEL:** <font color="Red">**NÃO**</font>
* **ROTINA DE APOIO:** <font color="Red">**NÃO**</font>
* **SUPORTA FILTROS EM TELA:** <font color="Green">**SIM**</font>
* **MÉTODO DE ENVIO:** Email, FTP ou Mensageiro
* **LIMITE PADRÃO:** 5 execuções por hora
* **VERSÃO:** Usar o nome técnico do módulo, no singular. Exemplo:
  * *Pessoas:* `Person`
  * *Veículos:* `Vehicle`
  * *Seguros:* `Insurance`
  * *Tabela de Frete:* `CostTable__Table`
  * *CT-es:* `Cte`

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *Caso não saiba o nome técnico de um determinado módulo, você pode entrar em contato com o suporte através de* *[sac@siimp.com.br](mailto:sac@siimp.com.br)* *para solicitá-lo.*

---

# ❓ O QUE FAZ ESTA REGRA?

Esta regra providencia uma forma de avisar sobre a expiração/vencimento de qualquer campo de data, existente em qualquer módulo do sistema. Por exemplo:

* Avisar sobre o vencimento da CNH de uma pessoa que é motorista.
* Avisar sobre o vencimento do Licenciamento de um Veículo.
* Avisar sobre a expiração de uma tabela de frete.

---

# 🛠️ CONFIGURAÇÕES NA AUTOMAÇÃO

Esta automação exige 2 configurações primordiais:

* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span></font> `date_field`: Nome técnico do campo de data existente para verificação dos vencimentos. Utilizar uma das opções da lista abaixo.
* <font color="Red"><span style="color:red;">**\[ OBRIGATÓRIA \]**</span><span style="color:red;"></span> </font><font color="Purple">**\[ LISTA \]**</font> `warning_in`: Lista numérica contendo os dias em que devem ser enviados os avisos.
* <span style="color:dodgerblue;">**\[ OPCIONAL \]**</span> <font color="Purple">**\[ LISTA \]**</font> `license_category`: Filtragem de categoria do tipo do Curso/Licença, sendo 0 para Pessoa e 1 para Veículo.

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Você pode juntar os filtros disponíveis em tela (vide* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#usando-filtros-disponiveis-na-tela-de-pesquisa)*) *com os parâmetros obrigatórios. Assim, os avisos podem ficar mais personalizados de acordo com a sua necessidade. Você também pode usar o parâmetro de nomenclatura disponível em* *[🤖 REGRAS DE EXECUÇÃO / PIPELINES \| Knowledge Base](https://siimp.youtrack.cloud/articles/SUP-A-382/REGRAS-DE-EXECUCAO-PIPELINES#configuracao-padrao-de-nomenclatura).*

---

# 🚥 LISTA DE `date_field` E VERSÕES

Abaixo, estão descritas todas as colunas e possibilidades de configuração do parâmetro `date_field`, mencionado no tópico anterior. Utilize o valor que estiver marcado em **COLUNA**, além de ajustar o campo **VERSÃO** da automação de acordo com a tabela abaixo.

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Além das colunas listadas abaixo, para cada uma das versões documentadas, você pode também usar uma das colunas* `created_at` *e/ou* `updated_at`*. Ambas refletem a data de criação do registro no módulo*, e a *data da última atualização do registro naquele módulo*, respectivamente.

|  | **MÓDULO** | **VERSÃO** | **COLUNA** | **SIGNIFICADO** |
| --- | --- | --- | --- | --- |
| 1 | Orçamento | `Budget` | `valid_from` | Data de Início da Validade |
| 2 | Orçamento | `Budget` | `valid_to` | Data de Término da Validade |
| 3 | Patrimônio | `BusinessAsset` | `warranty` | Data da Garantia |
| 4 | CC-e | `Cce` | `issue_date` | Data de Emissão |
| 5 | Central de CT-es | `Central__Cte` | `issued_at` | Data de Emissão |
| 6 | CIOT | `Ciot` | `start_date` | Data de Início |
| 7 | CIOT | `Ciot` | `end_date` | Data de Término |
| 8 | CIOT | `Ciot` | `issued_at` | Data de Emissão |
| 9 | CIOT | `Ciot` | `canceled_at` | Data de Cancelamento |
| 10 | CIOT | `Ciot` | `finished_at` | Data de Encerramento |
| 11 | Fechamento de Caixa | `CloseWallet` | `start_date` | Data de Início |
| 12 | Fechamento de Caixa | `CloseWallet` | `end_date` | Data de Término |
| 13 | Fechamento de Caixa | `CloseWallet` | `close_date` | Data de Fechamento |
| 14 | Ordem de Coleta | `Collection` | `retired_limit_date` | Data Limite de Retirada |
| 15 | Ordem de Coleta | `Collection` | `last_print` | Data da Última Impressão |
| 16 | Tabela de Frete/Desconto | `Costtable__Table` | `valid_from` | Data de Início da Validade |
| 17 | Tabela de Frete/Desconto | `Costtable__Table` | `valid_to` | Data de Término da Validade |
| 18 | Tabela de Frete/Desconto | `Costtable__Table` | `usd_last_api_check` | Data da Última Verificação do Dolar |
| 19 | Desacordos | `Cte__Disagreement` | `issued_at` | Data de Emissão |
| 20 | CT-es | `Cte` | `delivered_at` | Data de Entrega |
| 21 | CT-es | `Cte` | `delivery_at` | Data de Previsão de Entrega |
| 22 | CT-es | `Cte` | `expiration` | Data de Vencimento |
| 23 | CT-es | `Cte` | `issued_at` | Data da Emissão |
| 24 | CT-es | `Cte` | `last_print` | Data da Última Impressão |
| 25 | CT-es | `Cte` | `delivery2_at` | Data de Previsão da 2ª Entrega |
| 26 | CT-es | `Cte` | `delivery3_at` | Data de Previsão da 3ª Entrega |
| 27 | CT-es | `Cte` | `authorized_at` | Data da Autorização da SEFAZ |
| 28 | CT-es | `Cte` | `load_date` | Data de Carregamento |
| 29 | Abastecimento | `FuelSupply` | `supply_date` | Data do Abastecimento |
| 30 | Minutas | `Income` | `withdrawal_limit_date` | Data Limite de Retirada |
| 31 | Minutas | `Income` | `receiver_limit_date` | Data Limite de Recebimento |
| 32 | Minutas | `Income` | `last_print` | Data da Última Impressão |
| 33 | Minutas | `Income` | `delivery_at` | Data de Previsão de Entrega |
| 34 | Minutas | `Income` | `expiration` | Data de Vencimento |
| 35 | Minutas | `Income` | `request_date` | Data de Solicitação |
| 36 | Minutas | `Income` | `load_date` | Data de Carregamento |
| 37 | Seguros | `Insurance` | `coverage_start` | Data de Início da Cobertura |
| 38 | Seguros | `Insurance` | `coverage_end` | Data de Término da Cobertura |
| 39 | Cursos e Licenças | `License` | `license_date` | Data da Licença |
| 40 | Cursos e Licenças | `License` | `maturity` | Data de Vencimento |
| 41 | Cursos e Licenças | `License` | `recycle_date` | Data de Reciclagem |
| 42 | Ordem de Carregamento | `LoadingOrder` | `start_date` | Data de Início |
| 43 | Ordem de Carregamento | `LoadingOrder` | `finish_date` | Data de Término |
| 44 | Ordem de Carregamento | `LoadingOrder` | `last_paused_date` | Data da Última Pausa |
| 45 | MDF-es | `Mdfe` | `issued_at` | Data de Emissão |
| 46 | MDF-es | `Mdfe` | `finish_at` | Data de Encerramento |
| 47 | MDF-es | `Mdfe` | `cancel_at` | Data de Cancelamento |
| 48 | NFS-es | `Nfse` | `issued_at` | Data de Emissão |
| 49 | NFS-es | `Nfse` | `canceled_at` | Data de Cancelamento |
| 50 | Ocorrências | `Occurrence` | `date_added` | Data da Ocorrência |
| 51 | Programação de Viagem ou Romaneio | `Outcome` ou `TripProgramming` | `last_print` | Data da Última Impressão |
| 52 | Programação de Viagem ou Romaneio | `Outcome` ou `TripProgramming` | `scheduled_date` | Data de Previsão de Início |
| 53 | Programação de Viagem ou Romaneio | `Outcome` ou `TripProgramming` | `start_date` | Data de Início |
| 54 | Programação de Viagem ou Romaneio | `Outcome` ou `TripProgramming` | `finish_date` | Data de Término |
| 55 | Programação de Viagem ou Romaneio | `Outcome` ou `TripProgramming` | `scheduled_end_date` | Data de Previsão de Término |
| 56 | Pagamentos | `Outsourced__Payment` | `maturity` | Data de Vencimento |
| 57 | Pagamentos | `Outsourced__Payment` | `paid_at` | Data de Pagamento |
| 58 | Pagamentos | `Outsourced__Payment` | `competency_date` | Data de Competência |
| 59 | Pagamentos | `Outsourced__Payment` | `payment_date` | Data do Lançamento do Pagamento |
| 60 | Pagamentos | `Outsourced__Payment` | `advance_date` | Data do Adiantamento |
| 61 | Pagamentos | `Outsourced__Payment` | `competency_date` | Data de Competência |
| 62 | Pagamentos | `Outsourced__Payment` | `issued_at` | Data de Emissão |
| 63 | Fechamento de Parceiro | `Partner__Invoice` | `maturity` | Data de Vencimento |
| 64 | Fechamento de Parceiro | `Partner__Invoice` | `competency_date` | Data de Competência |
| 65 | Atendimentos | `Person__Attendance` | `attendance_date` | Data de Atendimento |
| 66 | Pessoas | `Person` | `birthdate` | Data de Nascimento |
| 67 | Pessoas | `Person` | `license_emission` | Data de Emissão da CNH |
| 68 | Pessoas | `Person` | `license_expiration` | Data de Vencimento da CNH |
| 69 | Pessoas | `Person` | `license_1st` | Data de Vencimento da Primeira CNH |
| 70 | Pessoas | `Person` | `certificate_date` | Data de Vencimento do Certificado Digital |
| 71 | Pessoas | `Person` | `rg_issued_at` | Data de Emissão do RG |
| 72 | Pessoas | `Person` | `maturity_rntrc` | Data de Vencimento do RNTRC |
| 73 | Pessoas | `Person` | `gris_checkup` | Data de Vencimento da Consulta do GRIS |
| 74 | Pessoas | `Person` | `uniform_handout_date` | Data da Entrega do Uniforme |
| 75 | Pessoas | `Person` | `epi_handout_date` | Data da Entrega do EPI |
| 76 | Pessoas | `Person` | `aso_expiration` | Data de Vencimento do ASO |
| 77 | Pessoas | `Person` | `vacation_expiration` | Data de Vencimento das Férias |
| 78 | Pessoas | `Person` | `mopp_expiration` | Data de Vencimento do MOPP |
| 79 | Programação de Carga | `Process` | `collect_deadline` | Data Limite de Coleta |
| 80 | Programação de Carga | `Process` | `delivery_deadline` | Data Limite de Entrega |
| 81 | Programação de Carga | `Process` | `demurrage_date` | Data de Demurrage |
| 82 | Programação de Carga | `Process` | `requested_at` | Data de Solicitação |
| 83 | Programação de Carga | `Process` | `scheduled_at` | Data de Agendamento |
| 84 | Protocolos | `Protocol` | `delivery_date` | Data de Entrega |
| 85 | Protocolos | `Protocol` | `maturity_date` | Data de Vencimento |
| 86 | Ordem de Compras | `PurchasingOrder` | `canceled_at` | Data de Cancelamento |
| 87 | Cotações | `Quotation` | `maturity` | Data de Vencimento |
| 88 | Cotações | `Quotation` | `validity` | Data de Validade |
| 89 | Cotações | `Quotation` | `delivery_forecast` | Data de Previsão de Entrega |
| 90 | Fechamento de Vendedor | `Seller__Invoice` | `maturity` | Data de Vencimento |
| 91 | Fechamento de Vendedor | `Seller__Invoice` | `competency_date` | <span style="background-color:#ffffff;" class="full-cell-size">Data de Competência</span> |
| 92 | Ordem de Serviço | `ServiceOrder` | `start_at` | Data de Início |
| 93 | Ordem de Serviço | `ServiceOrder` | `finish_at` | Data de Término |
| 94 | Ordem de Serviço | `ServiceOrder` | `prevision_start_at` | Data de Previsão de Início |
| 95 | Ordem de Serviço | `ServiceOrder` | `prevision_finish_at` | Data de Previsão de Término |
| 96 | Ordem de Serviço | `ServiceOrder` | `release_date` | Data de Finalização |
| 97 | Pneus | `Tire` | `purchased_at` | Data da Compra |
| 98 | Vale Pedágios | `TollVoucher` | `expires_at` | Data de Expiração |
| 99 | Vale Pedágios | `TollVoucher` | `issued_at` | Data de Emissão |
| 100 | Vale Pedágios | `TollVoucher` | `canceled_at` | Data de Cancelamento |
| 101 | Multas e Infrações | `TrafficTicket` | `ticket_date` | Data da Multa |
| 102 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `maturity` | Data de Vencimento |
| 103 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `paid_at` | Data de Pagamento |
| 104 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `invoice_issued_at` | Data de Emissão da Fatura |
| 105 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `competency_date` | Data de Competência |
| 106 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `protest_date` | Data Limite para Protesto |
| 107 | Movimentações ou Faturas | `Transaction` ou `Invoice` | `charging_last_date` | Data da Última Cobrança |
| 108 | Veículos | `Vehicle` | `purchased_at` | Data da Compra |
| 109 | Veículos | `Vehicle` | `ipva_expiration` | Data de Vencimento do IPVA |
| 110 | Veículos | `Vehicle` | `tachograph_expiration` | Data de Vencimento do Tacógrafo |
| 111 | Veículos | `Vehicle` | `dangerous_product_expiration` | Data de Vencimento da Licença para Produtos Perigosos |
| 112 | Veículos | `Vehicle` | `aet_expiration` | Data de Vencimento da AET |
| 113 | Veículos | `Vehicle` | `insurance_expiration` | Data de Vencimento do Seguro |
| 114 | Veículos | `Vehicle` | `gris_expiration` | Data de Vencimento do GRIS |
| 115 | Veículos | `Vehicle` | `checklist_expiration` | Data de Vencimento do Checklist |
| 116 | Veículos | `Vehicle` | `renting_expiration` | Data de Vencimento do Arrendamento |
| 117 | Veículos | `Vehicle` | `license_expiration` | Data de Vencimento da Licença |
| 118 | Alocações do Armazém | `Warehouse__Allocation` | `maturity` | Data de Vencimento |
| 119 | Alocações do Armazém | `Warehouse__Allocation` | `original_created_at` | Data Original da Alocação |
| 120 | Ordem de Separação/Expedição | `Warehouse__SeparationOrder` | `collection_schedule_date` | Data de Agendamento |

