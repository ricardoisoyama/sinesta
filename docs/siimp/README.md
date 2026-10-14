# SIIMP: faturas para boletos (estudo de 14/10/2026)

Estudo completo (página): https://claude.ai/artifact/9ZJFosEsKB73x4YgePFNcF
Estudo do Inter (cobrança): ver `docs/bancos/inter/README.md`

## Arquivos
- `youtrack-PO-A-3-api-rest.md`: visão geral da API.
  - Fonte: https://siimp.youtrack.cloud/articles/PO-A-3/API-REST (público; lido pela API do YouTrack `GET /api/articles/PO-A-3?fields=content`, porque a página é montada no navegador).
- `openapi/`: os 39 swaggers, baixados de `https://dev-lannister.emitir.me/api/<nome>.yaml`. As páginas de documentação `/rest/documentation/<nome>` são Swagger UI apontando para esses arquivos.
- `kb/`: 246 artigos da base de conhecimento pública: Financeiro, Carteiras, Perfil de faturamento, Pessoas, Automações e afins.
  - Para listar: `GET https://siimp.youtrack.cloud/api/articles?fields=idReadable,summary,parentArticle(idReadable)&$top=2000`.

## Fatos que pesam no desenho
- **Acesso**:
  - Um subdomínio por cliente: `https://{subdominio}.lannister.emitir.me` (produção) e `.dev-lannister.` (homologação). A SIIMP configura e libera.
  - Token por usuário no cabeçalho `X-Api-Key`; não expira, mas a SIIMP pode trocar.
  - Limite de 60 requisições por minuto.
  - Erros vêm com `success:false` mais `message` e `errors[]`, inclusive com HTTP 200.
- **Faturas** (`invoice.yaml`):
  - `GET /invoices/search` filtra por id, ids, número (ou faixa), owner_id, status (0 Cadastrada, 3 Emitida, 1 Liquidada, 2 Cancelada), operação, centro de custo, emissão (`invoice_issued_at_from/_to`) e vencimento (`expires_from/_to`).
  - **Sem paginação e sem filtro por data de alteração, cliente ou carteira.**
  - O retorno traz `customer{id,name,cpf,cnpj}` sem endereço, `parcels[]{id,number,value,discount,maturity,paid_at,status}`, `documents[]{cte_id,income_id,nf_id,serie,number,key,total}`, `wallet{id,description}`, `payment_form` (6 boleto, 8 PIX) e `invoice_obs`.
  - Não traz juros, multa, nosso número nem linha digitável, e não tem campo para gravá-los.
  - `POST /invoices/pay` recebe **só `{id}`**: liquida a fatura inteira, sem data nem valor.
  - `pay-by-documents` dá baixa parcial por CT-e, minuta ou nota.
  - Sem webhook. Talvez haja um gatilho de automação "General__FireWebhook" (PO-A-153, PO-A-189), a confirmar.
- **Pessoas** (`person.yaml`):
  - `GET /people/search?ids=` busca vários de uma vez e tem `page` e `updated_from`.
  - `main_address{street,number,complement,district,zipcode,city{name,ibge},state{uf}}`, `email`, `phone`, `cellphone`.
  - O endereço do tipo "Cobrança" e os contatos "Enviar Faturas" não estão na API.
- **Boleto na SIIMP hoje**: carteira com parâmetros de boleto e CNAB 240 ou 400. Remessa e retorno são enviados à mão no internet banking ("não há integração automática com o banco", PO-A-893). O Inter não aparece na base. Intercâmbio Bancário é só contas a pagar (Bradesco e Itaú).
- **Riscos**:
  - Boleto em dobro se a carteira da SIIMP continuar gerando.
  - `seuNumero` do Inter tem até 15 caracteres, e o número da fatura pode se repetir (usar numeração do ELROND).
  - O `/update` da SIIMP substitui listas inteiras (toggleable arrays): nunca usar sem mandar todos os itens.
