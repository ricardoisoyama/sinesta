# Banco Inter: estudo de integração (14/10/2026)

Estudo completo (página): https://claude.ai/artifact/9CMqbraiWbuNHSGXBoA4hW

## Arquivos nesta pasta
- `openapi/`: os 7 OpenAPI 3.0.3 oficiais, baixados de `https://developers.inter.co/redocusaurus/<arquivo>` (o portal não tem botão de download; as páginas de referência são montadas a partir deles).
  - `swagger-token-yaml.yaml`: OAuth (`POST /oauth/v2/token`)
  - `swagger-banking-yaml.yaml`: extrato, extrato enriquecido, saldo, pagamentos, Pix pagamento, webhooks (banking/v2)
  - `swagger-cobranca-bolepix-yaml.yaml`: Cobrança v3, boleto com Pix (cobranca/v3). **Usar esta.**
  - `swagger-cobranca-yaml.yaml`: Cobrança v2 (descontinuada)
  - `swagger-api-pix-yaml.yaml`: Pix cob/cobv, recebidos, devolução (pix/v2)
  - `swagger-api-pix-automatico-yaml.yaml`: Pix Automático (rec, solicrec, cobr)
  - `swagger-api-forum-yaml.yaml`: fórum do app (não interessa)
- `postman-collection.json`: coleção Postman oficial (produção e sandbox).

## Fatos que pesam no desenho
- **URLs:** produção `https://cdpj.partners.bancointer.com.br`, sandbox `https://cdpj-sandbox.partners.uatinter.co` (sandbox indisponível em 14/10/2026).
- **Autenticação:** OAuth2 client_credentials **com mTLS em toda chamada**, inclusive no token.
  - Token vale 60 min e só pode ser gerado 5 vezes por minuto: guardar e reaproveitar.
  - Certificado (.crt e .key) vale 1 ano; renovar a partir de 90 dias antes do vencimento mantém clientId, secret e escopos.
  - Contas múltiplas: header `x-conta-corrente`. A spec também cita `x-inter-conta-corrente`; testar os dois.
- **Extrato:**
  - Sem OFX na API (confirmado no swagger), só JSON ou PDF.
  - Janela máxima de 90 dias e 10 chamadas por minuto.
  - `/extrato/completo` traz `idTransacao` (substitui o FITID) e `detalhes` por tipo: no boleto, `nossoNumero`/`seuNumero`; no Pix, `txId`/`endToEndId`/pagador.
  - `valor` vem como string.
  - Em contingência devolve `tipoDetalhe=BASIC`.
- **Saldo:** `/saldo` traz disponível, bloqueados e limite; com `dataSaldo`, só o disponível do dia.
- **Cobrança v3:**
  - Emissão assíncrona: guardar `codigoSolicitacao`; nosso número, linha digitável e Pix chegam depois.
  - `seuNumero` tem no máximo 15 caracteres (precisamos de numeração curta por empresa).
  - Idempotência do Inter: seuNumero + valor + vencimento + pagador, por 30 min.
  - Vencimento no mesmo dia só até 19h59.
  - Multa e mora começam no dia seguinte ao vencimento; só um desconto; não aceita só PIX (para isso, `cobv`).
  - Valor mínimo R$ 2,50.
  - Webhook em `/cobrancas/webhook`: até 4 novas tentativas (20, 30, 60 e 120 min).
- **Webhooks:**
  - Autenticação só por mTLS: validar o certificado do Inter contra o `ca.crt` baixado no IB. Não há HMAC.
  - O ELROND está atrás do Apache do cPanel, então isso exige configuração no vhost. Plano B: consultar periodicamente.
- **Pix:** `GET /pix` só lista Pix originados de cob/cobv. Para conciliar tudo, usar o extrato enriquecido.
- **SDK C# oficial:** https://github.com/inter-co/pj-sdk-csharp (parado desde fev/2025). Usar como referência; o cliente nosso sai do OpenAPI.

## ELROND hoje (ponto de partida)
- Conciliação: OFX lido no navegador (`frontend/src/features/financeiro/ofx.ts`). O backend guarda `ExtratoLinha` com índice único (CarteiraId, Fitid).
- Sem CNAB ou boleto. Propostas aprovadas ainda não geram `Movimento` a receber.
- Saldo calculado no front (`financeiro/calculos.ts`); nada vem do banco.
- Molde de integração: NFS-e (porta `INfseProvedor`, adaptador NFE.io e simulador, worker, webhook). Para cifrar credenciais por empresa, o mesmo esquema do certificado A1 (`CertificadoService`, AES-256-GCM).
