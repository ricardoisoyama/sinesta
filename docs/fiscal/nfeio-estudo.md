# Estudo técnico: integração do ELROND com a API da NFE.io

*Estudo de 08/10/2026. Só leitura: nenhum arquivo do projeto foi alterado.*

**Fontes.** A documentação oficial da NFE.io foi lida direto: os arquivos OpenAPI publicados em `nfe.io/docs/api/*.yaml|json` e as páginas em Markdown (`.../index.md`). As páginas de referência da REST API são montadas por JavaScript e vêm quase vazias quando baixadas, mas a própria NFE.io indica os arquivos OpenAPI como a fonte correta para integração. Também usei o `nfse-levantamento.md` e as entidades do ELROND.

**Legenda.**
- **[Doc]**: está escrito na documentação oficial (OpenAPI ou páginas).
- **[Inferência]**: conclusão minha, que precisa ser confirmada com a NFE.io.

---

## a) Resumo executivo

1. **Como funciona.** O ELROND chama uma API REST com uma chave fixa no cabeçalho `Authorization`. Antes de emitir, cada empresa é cadastrada **uma vez** na NFE.io, em 3 recursos: Empresa, Certificado A1 e Inscrição Municipal. Depois disso, cada nota é um `POST` com JSON (tomador, serviço, valores, grupo `ibsCbs`). A NFE.io **guarda o certificado**, monta o XML de cada prefeitura (GissOnline, ISS.net, Paulistana ou Nacional), assina e transmite. O ELROND não precisa montar XML nem assinar nada.
2. **A emissão é assíncrona.** O `POST` devolve `202` com um `id`. O resultado chega por **webhook** (assinado com HMAC-SHA1) ou por consulta (`GET`). PDF e XML são baixados depois.
3. **O ambiente fica na Inscrição Municipal, não na nota.** Existem 3 ambientes:
   - `Development`: simulador da NFE.io. Não precisa de certificado e não vai à prefeitura.
   - `Staging`: homologação da prefeitura, configurada pelo suporte.
   - `Production`: liberado só após a contratação.

   Isso bate com o que a NFE.io disse ao cliente: dá para integrar e testar inteiro agora e ir para produção depois.
4. **Cobertura.** Santos, Praia Grande, São Vicente e São Paulo aparecem como **"Habilitado para emissão: Sim"** na lista oficial de prefeituras integradas [Doc].
5. **O que muda no ELROND.**
   - Uma configuração fiscal por empresa: IDs da NFE.io, série do RPS, ambiente e código IBGE.
   - Os campos fiscais do **Serviço**: `cityServiceCode` por município, `federalServiceCode`, `nbsCode`, `operationIndicator` e `classCode`.
   - Uma entidade **NotaFiscal** ligada ao lançamento a receber.
   - Um endpoint público de webhook e uma tela de status, PDF, XML e cancelamento.
6. **A maior parte dos impostos a NFE.io calcula sozinha.** ISS, retenções e IBS/CBS são calculados a partir do código de serviço, se o ELROND não enviar valores. **Mas** a regra é "tudo ou nada": se o ELROND enviar uma retenção, a NFE.io deixa de calcular as outras. No grupo IBS/CBS, um envio parcial é recalculado por cima.
7. **Pontos de atenção.**
   1. **Códigos fiscais por serviço e município.** Quem define é o contador; sem eles não sai nota.
   2. **Local da prestação.** Na limpeza (LC 116 07.10), o `operationIndicator` sugerido é `020201`, que **exige o endereço do imóvel** no payload; sem ele a nota é rejeitada (`E1521`).
   3. **Retenções da cessão de mão de obra** (INSS 11%, IR, PCC): convém o ELROND calcular e enviar todas.
   4. **O webhook é por conta, não por empresa.** Se Sinesta e BM usarem a mesma conta, cada deploy recebe eventos do outro.
   5. **CNPJ alfanumérico.** Se a Sinesta, que está em abertura, receber um CNPJ alfanumérico, a API atual recusa; seria preciso usar o "novo versionamento".
   6. **Limites de requisição e preço por nota** não estão na documentação.

---

## b) Como a API funciona

### b.1 Hosts e versões [Doc]

| Uso | Host | Caminho | Observação |
|---|---|---|---|
| **Emissão/consulta/cancelamento de NFS-e** | `https://api.nfe.io` | `/v1/companies/{company_id}/serviceinvoices...` | "A emissão de NFS-e ainda é servida pela API v1 e continuará funcionando durante a transição" |
| **Contribuintes v2** (empresa, certificado, IM, IE) | `https://api.nfse.io` | `/v2/companies...` | Substitui o `/v1/companies` (em descontinuação desde a release 2026.1) |
| **Webhooks** | `https://api.nfse.io` | `/v2/webhooks...` | Registrados por **conta** |
| **NF-e / NFC-e** | `https://api.nfse.io` | `/v2/companies/{companyId}/productinvoices` e `/consumerinvoices` | |

- **Homologação e produção usam a mesma URL** [Doc]. O OpenAPI só lista o servidor de produção. Na NFS-e, a nota sai no ambiente do campo `Environment` da Inscrição Municipal. Na NF-e, sai no ambiente da Inscrição Estadual (`switch-authorizer`).
- **TLS 1.2 ou superior** é obrigatório desde a release 2026.7. O .NET 10 já atende.
- **Contradição na documentação.** A página "Chaves de autenticação" mostra `POST api.nfe.io/v2/companies/{id}/serviceinvoices`, mas o OpenAPI e o "Primeiros passos" mostram **`/v1`**. **Usar `/v1`** e confirmar com a NFE.io.
- **Não há SDK .NET oficial** (só Node, PHP, Ruby e Java, conforme o GitHub `nfe`). [Inferência] O caminho é um `HttpClient` tipado no `Elrond.Infrastructure`. Dá para gerar DTOs a partir do OpenAPI (NSwag ou Kiota) ou escrever à mão só os campos usados, que é mais simples.

### b.2 Autenticação [Doc]

- Cabeçalho `Authorization: <chave>`, **sem "Bearer"**. A alternativa é a query `?apikey=<chave>`, que deve ser evitada porque a chave vai parar nos logs.
- Existem **duas chaves por conta**:
  - **Chave de Nota Fiscal**: emitir, cadastrar empresas, certificados e webhooks. É a que o ELROND usa.
  - **Chave de Dados**: consultas de CNPJ, CPF e CEP em `*.api.nfe.io`. Opcional.

  Usar a chave errada dá `401`.
- O Contribuintes v2 também aceita JWT Bearer, mas não precisamos.
- [Inferência] A chave deve ficar como segredo **por deploy** (variável de ambiente ou cifrada como o certificado) e nunca ir ao front.

### b.3 Ambientes e testes

| Ambiente (`Environment` da IM) | O que acontece | Certificado | Como ativar |
|---|---|---|---|
| `Development` (0) | Servidores da NFE.io **simulam a prefeitura**. A nota é aprovada com número e protocolo simulados. Sem validade fiscal | **Opcional** [Doc] | Padrão: toda IM **nasce** em `Development`, mesmo que o `POST` peça outro valor [Doc] |
| `Staging` (2) | Envio ao **ambiente de homologação da prefeitura**. A nota é emitida no ambiente de teste do município | [Inferência] provavelmente obrigatório (há assinatura real) | "É necessário entrar em contato com o suporte para que a empresa seja parametrizada" [Doc, OpenAPI RTC]. "Nem todas as prefeituras suportam ambiente de teste/homologação" [Doc] |
| `Production` (1) | Prefeitura real, com validade fiscal | **Obrigatório** | `PUT .../municipaltaxes/{id}` com `"Environment":"Production"` ou pelo painel. O roteiro oficial manda "entrar em contato com a equipe comercial para gerar sua fatura" e trocar só **após o pagamento** [Doc] |

Detalhes úteis do ambiente de testes [Doc]:
- O campo `environment` **não existe no corpo da nota**. Se for enviado, é ignorado sem aviso. Com a IM em `Production`, toda nota é real.
- **Simular erro:** com a IM em `Development`, colocar o texto `random error` em `description`. O envio e a consulta do lote falham em cerca de 1 de cada 3 vezes, com os códigos `E998` (SendBatch) e `E999` (CheckBatch).
- **IMs de teste reservadas** (`355030999`, `111111`, `222222`) vão ao ambiente de teste da própria prefeitura, e nelas `random error` não funciona.
- No `Development`, o CPF/CNPJ do tomador é validado antes do envio: um documento inválido dá `400`.
- "Contribuintes optantes pelo Simples Nacional/MEI, em um primeiro momento, não poderão realizar testes utilizando as novas tags da Reforma Tributária." Isso afeta a Sinesta se ela for do Simples.

### b.4 Modelo assíncrono e status [Doc]

`POST` → **`202 Accepted`** com `{ id, environment, flowStatus: "WaitingCalculateTaxes", flowMessage }`. O processamento continua em segundo plano.

**`status`** (situação final): `Error` (-1), `None` (0), `Created` (1), `Issued` (2), `Cancelled` (3).

**`flowStatus`** (etapa do processamento):

| Valor | Significado |
|---|---|
| `WaitingCalculateTaxes` (10) | Calculando tributos |
| `WaitingDefineRpsNumber` (11) | Definindo número do RPS |
| `WaitingSend` (12) | Aguardando envio à prefeitura |
| `WaitingReturn` (14) | Aguardando retorno da prefeitura |
| `WaitingDownload` (15) | Aguardando PDF/XML |
| `Issued` (1) | Emitida |
| `IssueFailed` (-1) | Falha na emissão |
| `WaitingSendCancel` (13) | Aguardando envio do cancelamento |
| `WaitingReturnCancel` (24) | Aguardando retorno do cancelamento |
| `Cancelled` (2) | Cancelada |
| `CancelFailed` (-2) | Falha no cancelamento |
| `PullFromCityHall` (3) | Nota capturada da prefeitura (emitida fora da plataforma) |

**Como interpretar** (a NFE.io manda olhar os dois campos juntos):
- `Issued`/`Issued` = emitida.
- `Cancelled`/`Cancelled` = cancelada.
- `Issued`/`CancelFailed` = o cancelamento falhou e **a nota continua válida**.
- **Armadilha:** `status=Issued`, `flowStatus=IssueFailed` e `flowMessage="max retry reached on download stage"` significa que **a nota foi emitida**, só falhou o PDF. **Não reemitir**: pedir ao suporte que reprocesse o PDF.

**Polling (consulta)**
- `GET /v1/companies/{company_id}/serviceinvoices/{id}`
- `GET /v1/companies/{company_id}/serviceinvoices/external/{externalId}`: consulta pelo ID do ELROND.
- `GET /v1/companies/{company_id}/serviceinvoices?pageIndex=&pageCount=&issuedBegin=&issuedEnd=&createdBegin=&createdEnd=`: listagem com filtros.

**Webhook** [Doc]
- **Cadastro:** `POST https://api.nfse.io/v2/webhooks` com o corpo:
  ```json
  { "webHook": { "uri": "...", "secret": "...", "contentType": ..., "insecureSsl": false, "status": ..., "filters": [...], "headers": {...}, "properties": {...} } }
  ```
  - A URI precisa responder `200` a um `POST` de teste já no cadastro.
  - É registrado **por conta**: todas as empresas da conta disparam para os mesmos webhooks.
  - Os filtros usam o tipo do evento, por exemplo `service_invoice.issued_successfully`.
  - Os tipos disponíveis saem de `GET /v2/webhooks/eventtypes`.
  - Para testar: `PUT /v2/webhooks/{id}/pings`.
- **Eventos de NFS-e:**
  - `issued_successfully`
  - `issued_error`: rejeição da prefeitura ou falha pontual.
  - `issued_failed`: esgotou as tentativas; `flowMessage` começa com `"max retry"`.
  - `cancelled_successfully`
  - `cancelled_error`
  - `cancelled_failed`: a nota segue `Issued`.
  - `pulled`
- **Corpo da NFS-e:** `{"action": "issued_successfully", "payload": { ...nota completa... }}`. O tipo vem no cabeçalho `X-Hook-Event` (`service_invoice`).
- **Assinatura:** cabeçalho `X-Hub-Signature: sha1=<hex>`. É um **HMAC-SHA1** calculado sobre os **bytes crus do corpo**, com o `secret` de 32 a 64 caracteres cadastrado. Validar antes de processar e comparar em tempo constante.
- **IP de origem** ativo: `34.44.243.117`. Serve como camada extra; não substitui o HMAC.
- **Entrega "at-least-once"** (pode chegar repetido):
  - Deduplicar por `X-Hook-Id`. O cabeçalho `X-Hook-Attempts` é `0` na primeira entrega.
  - São até **16 tentativas em cerca de 45 h**.
  - Timeout de 10 s nas 3 primeiras tentativas e de 100 s nas seguintes. Responder 2xx rápido e processar em fila.
- **Respostas que matam o evento sem nova tentativa:** `400`, `401`, `403`, `404`, `405` e `422`. Numa falha temporária do ELROND, responder **`500`** para receber de novo. `410` conta como entregue.
- **Zeros à esquerda:** no payload v1/v2, `federalTaxNumber` vem como **número**, então perde o zero inicial. Normalizar para 14 dígitos (CNPJ) ou 11 (CPF) antes de comparar.

[Inferência] **Recomendo webhook + polling de segurança.** Um job consulta notas paradas em `Waiting*` há mais de alguns minutos. Isso cobre webhook perdido e a janela entre o `POST` e o primeiro evento.

### b.5 Idempotência e identificador externo [Doc]

- O campo **`externalId`** existe para isso. A documentação se contradiz sobre o reenvio com o mesmo valor:
  - a página de cenários diz "retorna **400** (já existe)";
  - o layout RTC diz "**retornaremos os dados da nota fiscal original**".

  Tratar os dois casos e perguntar qual vale.
- O **`409`** indica "RPS já enviado/duplicado".
- Em **`408`** (timeout de 60 s) ou **`504`**, a NFE.io diz que "não há certeza se a nota foi enviada". [Inferência] O ELROND deve consultar `GET .../external/{externalId}` **antes** de reenviar. Nunca reenviar no escuro.
- [Inferência] `externalId` = ID da `NotaFiscal` do ELROND, gerado antes do `POST` e gravado junto.

### b.6 Erros [Doc]

| HTTP | Significado | Ação |
|---|---|---|
| 202 | Aceita na fila | Aguardar webhook ou consulta |
| 400 | Regra violada. **O corpo é uma string em inglês** com a primeira regra violada, por exemplo `borrower.address.country must be a valid ISO 3166-1 code...`. Erro de formato do JSON vem como `application/problem+json` | Mostrar ao usuário e corrigir o cadastro |
| 401 | Chave inválida ou errada | Configuração |
| 404 | Empresa ou inscrição não encontrada | Configuração |
| 408 | Timeout de 60 s | Consultar por `externalId` antes de reenviar |
| 409 | RPS duplicado | Consultar |
| 422 | Não processou | Mostrar |
| 500 | Erro no processamento | Reenviar, com o mesmo `externalId` |
| 503 / 504 | Indisponível / gateway | 504: consultar antes de reenviar |

- **Contribuintes v2** responde no formato `{"Errors":[{"Code":40041,"Message":"company not found"}]}`.
- Códigos comuns:
  - `40017`: nome vazio.
  - `40020`: nome com menos de 2 ou mais de 60 caracteres.
  - `40028`: código IBGE não bate com a UF.
  - `40030`: CEP inválido.
  - `40032`: CNPJ inválido.
- **Rejeições da prefeitura** chegam depois, em `flowMessage` e no webhook `issued_error`, com texto livre, por exemplo `[1001] XML não compatível com Schema...`. Guardar e mostrar como texto, sem tentar interpretar.
- Rejeições da reforma citadas:
  - `E1521`: a localidade do IBS/CBS não bate com o `operationIndicator`.
  - `E1530`: a prefeitura exige os valores de IBS/CBS no payload.
  - `345`: NBS inválido para o item da LC 116.

### b.7 Limites [Doc + lacunas]

- **Não há limite de requisições documentado** para emissão, nem cota por minuto. Perguntar (seção g).
- **Paginação do Contribuintes v2:** `limit` de 1 a 50, com cursor `startingAfter`/`endingBefore`.
- **Limites de campo na NFS-e:**

  | Campo | Limite |
  |---|---|
  | `description` | 2.000 caracteres |
  | `additionalInformation` | 500 caracteres |
  | `borrower.name` | 115 caracteres |
  | `issRate` | entre 0 e **0,05** (fração) |
  | `federalServiceCode` | 5 caracteres |
  | `nbsCode` | 9 caracteres |
  | `operationIndicator` e `classCode` | exatamente 6 dígitos |
  | `rpsSerialNumber` | 5 caracteres |

- **Empresa v2:** `Name` (razão social) com **2 a 60 caracteres**; uma razão social longa precisa ser abreviada. `Street` com no mínimo 5 caracteres e prefixo válido (Rua, Av., ...). `District` com no mínimo 2. `PostalCode` com 8 dígitos.

---

## c) Contribuintes v2: cadastro de cada empresa

**Fluxo oficial para NFS-e** [Doc]:
1. `POST /v2/companies`
2. `POST /v2/companies/{id}/certificates`
3. `POST /v2/companies/{id}/municipaltaxes`
4. Verificar o `FiscalStatus`.

Todas as chamadas vão para `https://api.nfse.io`.

> **A NFE.io guarda o certificado** [Doc]: "Os dados são criptografados e armazenados com segurança na plataforma". Um novo upload "sobrescreve automaticamente o certificado anterior". **O ELROND envia o certificado uma vez por empresa e de novo só na renovação**, e não a cada nota. O mesmo certificado serve para NFS-e, NF-e e NFC-e.

### c.1 Empresa: `POST /v2/companies` (corpo `{"Company": {...}}`)

| Campo API | Obrig. | ELROND | Situação |
|---|---|---|---|
| `Name` (2 a 60) | Sim | `Empresa.RazaoSocial` | **Tem** (validar o tamanho) |
| `TradeName` | Não | `Empresa.NomeFantasia` | **Tem** |
| `FederalTaxNumber` (long, só dígitos; **não pode ser alterado depois**) | Sim | `Empresa.Cnpj` sem máscara | **Tem** |
| `TaxRegime` (`LucroReal`, `LucroPresumido`, `SimplesNacional`, `SimplesNacionalExcessoSublimite`, `MicroempreendedorIndividual`, `Isento`) | Sim | `Empresa.Regime` ("Lucro Presumido" → `LucroPresumido`, "Simples Nacional" → `SimplesNacional`, "MEI" → `MicroempreendedorIndividual`) | **Tem** (mapear) |
| `Address.State`, `Address.City.Code` (IBGE, 7 dígitos, prefixo da UF), `Address.City.Name` | Sim | `Empresa.Endereco` ("Santos - SP") resolvido na tabela `Cidade` | **Parcial** (gravar `CidadeIbge`) |
| `Address.Street`, `Number`, `AdditionalInformation`, `District`, `PostalCode` (8 dígitos), `Country` (`BRA`) | Sim (exceto o complemento) | `Empresa.EnderecoCompleto` {Logradouro, Numero, Complemento, Bairro, Cep} | **Tem** (campos recém-adicionados) |
| `STStateTaxNumber`, `SuframaTaxNumber` | Não | — | N/A |
| `AccountId` | A doc marca como obrigatório, mas o exemplo não envia | — | [Inferência] Preenchido pela chave |

A resposta traz **`Id` = `company_id`**, que precisa ser gravado no ELROND. As consultas são `GET/PUT/DELETE /v2/companies/{id}` e `HEAD` para checar se existe.

### c.2 Certificado A1: `POST /v2/companies/{company_id}/certificates`

- **Formato:** `multipart/form-data` com os campos **`File`** (`.pfx` ou `.p12`) e **`Password`**.
- **Regras:**
  - só e-CNPJ A1 ou NF-e A1; A3 e e-CPF não são aceitos;
  - o certificado não pode estar vencido;
  - **o CNPJ do certificado precisa ser igual ao `FederalTaxNumber` da empresa**.
- **Resposta:** `Thumbprint`, `TaxId`, `Subject`, `ValidUntil` e `Status` (`Active`, `Overdue`, `Pending`, `Inactive`). Com `Overdue`, as emissões ficam bloqueadas.
- **Consulta:** `GET .../certificates` ou `GET .../certificates/{thumbprint}`. **Remoção:** `DELETE`.
- **Mensagens de erro:** `File is null`, `File extension is not valid`, `Certificate password is invalid`, `Certificate expired`, `Certificate or company federal tax number is invalid`, `40034 password is null or empty`.
- **No ELROND:** o `CertificadoService` já guarda o arquivo e a senha cifrados e confere senha, validade e CNPJ. **Falta um método que devolva os bytes do .pfx e a senha decifrados**, porque hoje `CarregarAsync` devolve um `X509Certificate2`. Esse método monta o multipart e grava o `Thumbprint` e a data do envio. [Inferência] Disparar o upload quando um certificado novo é salvo, se a empresa já estiver ligada à NFE.io.
- **Risco:** uma filial com certificado da matriz (mesma raiz de CNPJ) pode ser recusada por "CNPJ deve corresponder". Perguntar.

### c.3 Inscrição Municipal: `POST /v2/companies/{company_id}/municipaltaxes` (corpo `{"MunicipalTax": {...}}`)

| Campo API | Obrig. | O que é | ELROND | Situação |
|---|---|---|---|---|
| `City.Code`, `City.Name`, `City.State` | Sim | Município da IM | Cidade IBGE da Empresa | **Parcial** |
| `TaxNumber` | Não (a prefeitura costuma exigir) | Número da IM | `Empresa.InscricaoMunicipal` | **Tem** |
| `RpsSerialNumber` | Sim (padrão `"IO"`) | Série do RPS | Nova config. **No Ambiente Nacional a série tem de ser numérica** | **Falta** |
| `RpsNumber` / `LastRpsSent` | Sim | Próximo número e último enviado (`LastRpsSent = RpsNumber − 1`) | Nova config. Precisa ser o **último RPS real** da empresa, para não repetir número | **Falta** |
| `Environment` | — | Sempre nasce em `Development`; muda por `PUT` | Config | **Falta** |
| `SpecialTaxRegime` (`Automatico`, `Nenhum`, `MicroempresaMunicipal`, `Estimativa`, `SociedadeDeProfissionais`, `Cooperativa`, `MicroempreendedorIndividual`, `MicroempresarioEmpresaPequenoPorte`; padrão `Nenhum`) | Não | Regime especial | Novo campo (BM: provavelmente `Nenhum`) | **Falta** |
| `IssRate` | Não | Alíquota de ISS **em %** (exemplo: `2.0`). Atenção: no corpo da nota, `issRate` é **fração** (`0.02`) | `Empresa.Iss.Aliquota` (fração ×100) | **Parcial** |
| `LoginName`, `LoginPassword`, `AuthIssueValue` | Cond. | Credenciais do webservice da prefeitura, quando ela exige além do certificado | Novo campo (segredo) | **Falta** |
| `Email`, `LegalNature`, `CompanyRegistryNumber` | Não | Contato, natureza jurídica, Junta Comercial | — | **Falta** (opcionais) |
| `RegionalTaxNumber` | Cond. | **`530000` = "Emitir via Emissor Nacional de NFS-e"**; `0` desliga [Doc] | Config (só para quem usa o Emissor Nacional, como Simples/MEI a partir de 01/11/2026) | **Falta** |
| `FederalTaxDetermination`, `MunicipalTaxDetermination` (`NotInformed`, `Default`, `SimplesNacional`) | Não (padrão `Default`) | Como a NFE.io calcula os impostos | — | Padrão |

**Campos que o sistema devolve:**
- `Id` (= `municipal_tax_id`): gravar no ELROND.
- **`FiscalStatus`**: `Active` = a NFE.io tem integração homologada com a cidade. `CityNotSupported`, `Pending`, `Inactive` e `None` não emitem.
- `RpsSerialNumbers`, `LastRpsSent`.

**Outros endpoints:**
- `PUT .../municipaltaxes/{id}`: alterar, inclusive promover para produção.
- `PATCH .../municipaltaxes/{id}/updateprefecture`: força a reverificação do suporte da cidade.
- `GET .../municipaltaxes/{id}/series/{serie}`: devolve `{ RpsNumber, LastRpsSent }`, útil para conferir a numeração.

**Credenciamento na prefeitura** [Doc]: "Esta API **não cadastra** sua empresa na prefeitura". IM, liberação do webservice e credenciais são obtidas pelo contribuinte no portal de cada município. Isso confirma o levantamento: GissOnline Santos/Praia Grande e ISS.net São Vicente pedem liberação.

### c.4 Inscrição Estadual (só para NF-e/NFC-e)

- **Endpoints:** `POST/GET/PUT/DELETE /v2/companies/{id}/statetaxes` e `POST .../statetaxes/{id}/switch-authorizer` (troca o ambiente).
- **Não é usada na NFS-e** [Doc]. O ELROND já tem `Empresa.InscricaoEstadual`.

---

## d) NFS-e RTC (DPS): `POST https://api.nfe.io/v1/companies/{company_id}/serviceinvoices`

### d.1 Pontos gerais [Doc]

- **O prestador não vai no payload.** A NFE.io usa o cadastro da Empresa e da IM: CNPJ, regime, endereço, IM, regime especial. Não existe `tpAmb`, `tpEmit`, `cLocEmi`, `verAplic` nem assinatura no JSON.
- **Campos obrigatórios no schema** (`NFSeRequest.required`): `cityServiceCode`, `description`, `servicesAmount` e `nbsCode`. **No grupo `ibsCbs`:** `operationIndicator` e `classCode`.
- **Divergências entre o schema e a documentação funcional:**
  - `federalServiceCode`: a doc funcional diz "obrigatório", o schema não marca.
  - `nbsCode`: a doc funcional diz "opcional", o schema diz obrigatório.
  - `borrower`: a doc funcional diz "obrigatório", o schema diz "pode ser omitido".
  - **Tratar os três como obrigatórios no ELROND.**
- **Lucro Presumido/Real** precisa enviar o `ibsCbs` com `operationIndicator` e `classCode` mesmo nas prefeituras de sistema próprio. Simples/MEI ainda não precisam, salvo exigência do município [Doc].
- **Formatos:**
  - alíquotas (`...Rate`) em **fração** (`0.0065`);
  - valores em reais com ponto decimal;
  - datas ISO (`2026-10-01`, `2026-10-08T10:00:00-03:00`);
  - CNPJ/CPF numérico.

  [Inferência] O `nbsCode` vai **só com dígitos** (9). A tabela oficial mostra `1.1801.21.00` e o exemplo da API usa `'101010100'`.
- **Cálculo automático:** se nenhum imposto for enviado, a NFE.io calcula ISS e retenções "com base no `cityServiceCode`", usando o catálogo do município. O catálogo pode ser customizado **por CNPJ** pelo suporte.
  - Ao informar **qualquer** imposto, por exemplo `issRate`, a NFE.io passa a usar só os valores enviados.
  - Ao informar **uma** retenção, "a plataforma não calcula as demais".
  - No `ibsCbs`, ou se envia o grupo completo ou só a classificação. Um envio parcial é recalculado.

### d.2 Tabela campo a campo

**Origem no ELROND:** Emp = Empresa · Cli = Cliente · Srv = Serviço · Prop = Proposta/ItemProposta · Lanç = Movimento (a receber) · Cfg = nova configuração fiscal · Sist = gerado pelo sistema.

#### Identificação e controle

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `externalId` | Não (recomendado) | ID do ELROND para idempotência e conciliação | Sist: `NotaFiscal.Id` | **Falta** (nova entidade) |
| `issuedOn` | Não (padrão: agora) | `dhEmi` | Sist | Tem |
| `accrualOn` | Não (padrão: `issuedOn`) | Competência `AAAA-MM-DD` (`dCompet`) | Lanç: `Movimento.Competencia` (`yyyy-MM`) + dia definido com o contador | **Parcial** |
| `rpsSerialNumber` | Não (padrão: série da IM) | Série do RPS | Cfg (série na IM). Melhor não enviar | Falta (só config) |
| `rpsNumber` | Não (padrão: próxima da sequência) | Número do RPS | **Deixar a NFE.io numerar** [Inferência] | N/A |
| `ReferenceSubstitution` {`id` (44 dígitos), `reason`, `reasonText`} | Cond. | NFS-e que esta nota substitui | NotaFiscal (ação "substituir") | Falta (fase posterior) |
| `additionalInformation` (até 500) | Não | Observações (`xInfComp`) | Lanç: `Movimento.Observacao` + texto padrão (retenções, contrato) | **Parcial** |
| `additionalInformationGroup.order` | Não | Nº do pedido ou contrato (`xPed`) | Prop: `Proposta.Numero` | **Tem** |
| `isEarlyInstallmentPayment` | Não | Pagamento antecipado | — | N/A |

#### Serviço

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `cityServiceCode` | **Sim** | Código do serviço **na tabela do município do prestador**. No Ambiente Nacional, o código nacional de 6 dígitos mais até 3 do município [Doc, página do Emissor Nacional] | Srv × Município/Empresa (tabela nova) | **Falta** |
| `federalServiceCode` (até 5, ex.: `"17.05"`) | Sim (doc funcional) | Item da LC 116 | Srv | **Falta** |
| `nbsCode` (9) | **Sim** (schema) | NBS. Uma combinação errada com o item da LC 116 dá a rejeição 345 | Srv | **Falta** |
| `cnaeCode` | Cond. (município) | CNAE | Srv × Empresa | **Falta** |
| `ncmCode` | Não | NCM (serviço ligado a bem) | — | N/A |
| `description` (até 2000) | **Sim** | Discriminação | Srv (texto modelo) + `ItemProposta.Descricao` + `Movimento.Descricao` (período, posto, contrato) | **Parcial** |

#### Valores

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `servicesAmount` | **Sim** | Valor bruto | Lanç: `Movimento.Valor` (origem: `ItemProposta.PrecoFinal`) | **Tem** |
| `discountUnconditionedAmount` | Não | Desconto incondicionado (reduz a base do ISS) | Lanç/Prop (definir com o contador) | **Parcial** |
| `discountConditionedAmount` | Não | Desconto condicionado | Lanç: `Movimento.Desconto` (a baixa é outra coisa) | **Parcial** |
| `deductionsAmount` ou `deduction` {`rate`, `amount` ou `documents[]`} | Cond. | Deduções da base do ISS (materiais, subempreitada) | Lanç | **Falta** |
| `paidAmount` | Não | Valor recebido (padrão de SP). Evitar em nota com IBS/CBS em SP | — | N/A |
| `serviceAmountDetails` {`initialChargedAmount`, `finalChargedAmount`, `fineAmount`, `interestAmount`} | Não | Multa e juros (padrão de SP) | Lanç: `Juros`/`Multa` | Tem (opcional) |

#### ISS

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `taxationType` | Não (padrão `WithinCity`) | Tributação do ISS: `WithinCity`, `OutsideCity`, `Export`, `Free`, `Immune`, `SuspendedCourtDecision`... | Regra Srv + local da prestação (`OutsideCity` quando o ISS é devido fora) | **Falta** |
| `issRate` (fração, até 0,05) | Não (padrão: catálogo do código de serviço) | Alíquota do ISS | Srv × Município (hoje só `Empresa.Iss.Aliquota`) | **Parcial** |
| `issTaxAmount` | Não (automático) | Valor do ISS | Sist/NFE.io | — |
| `retentionType` | Não (automático) | `NotWithheld`, `WithheldByBuyer` ou `WithheldByIntermediary` | Regra Srv × Cli (hoje `Empresa.Iss.Retido` fixo) | **Parcial** |
| `issAmountWithheld` | Não | ISS retido | Sist | **Parcial** |
| `immunityType`, `suspension` {`reason`, `processNumber`}, `benefit` {`id`, `amount`/`rate`} | Cond. | Imunidade, exigibilidade suspensa, benefício municipal | — | N/A hoje |

#### Retenções federais

Retenções reduzem o líquido e não têm alíquota na API. **Ao enviar uma, é preciso enviar todas.**

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `inssAmountWithheld` | Cond. (cessão de mão de obra: 11%) | INSS retido (`vRetCP`) | Srv (flag "cessão de mão de obra") × Cli (PJ/condomínio) + `Empresa.Inss` | **Parcial** |
| `irAmountWithheld` | Cond. | IRRF retido (1% / 1,5%) | Srv × Cli + `Empresa.Ir` | **Parcial** |
| `pisAmountWithheld`, `cofinsAmountWithheld`, `csllAmountWithheld` | Cond. | PCC retido. No Ambiente Nacional os três são somados em `vRetCSLL` | Srv × Cli + `Empresa.Pis/Cofins/Csll` | **Parcial** |
| `othersAmountWithheld` | Não | Outras retenções | — | N/A |

#### PIS/COFINS próprios (informativos; não reduzem o líquido)

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `cstPisCofins` (texto de 2 dígitos) | Não (Ambiente Nacional: padrão `"00"`) | CST do PIS/COFINS (Lucro Presumido cumulativo: provavelmente `"01"`; confirmar) | Emp (padrão) ou Srv | **Falta** |
| `pisCofinsBaseTax`, `pisRate`, `pisAmount`, `cofinsRate`, `cofinsAmount` | Não | Base, alíquotas e valores próprios. Não são preenchidos automaticamente; mandar valor e alíquota coerentes | `Empresa.Pis/Cofins.Aliquota` | **Parcial** |
| `csllAmount`, `csllRate` | Não | CSLL própria. Não vai ao Ambiente Nacional nem à Paulistana | — | N/A |
| `approximateTax` / `approximateTotals` | Não (automático, "Lei da Transparência") | Carga aproximada | Deixar automático | — |

#### Tomador (`borrower`, estrutura `partyDefinition`)

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `borrower.type` (`NaturalPerson` / `LegalEntity`) | Recom. | Tipo de pessoa | Cli: `Tipo` ("fisica"/"juridica") | **Tem** |
| `borrower.name` (até 115) | Sim | Razão social | Cli: `Nome` | **Tem** |
| `borrower.federalTaxNumber` (número) | Sim (PJ) | CNPJ ou CPF; validado contra o `type` | Cli: `CpfCnpj` só com dígitos | **Tem** |
| `borrower.municipalTaxNumber` (até 12), `stateTaxNumber` | Não | IM e IE | Cli: `InscricaoMunicipal`, `InscricaoEstadual` | **Tem** |
| `borrower.email`, `phoneNumber` (7 a 20 dígitos) | Não | Contato (o e-mail recebe a nota) | Cli: `Email`/`Telefone`; contatos com `RecebeNotaFiscal` | **Tem** |
| `borrower.taxRegime` | Não | Regime do tomador | — | **Falta** (opcional) |
| `borrower.address.country` (`BRA`) | Sim se houver endereço | País | Constante (exterior: país ISO-3) | Tem |
| `borrower.address.postalCode` (9 caracteres, `"99999-999"`), `street`, `number`, `additionalInformation`, `district` | Endereço parcial torna tudo obrigatório. **A NFE.io não completa o endereço**: sem ele, o PDF sai como "Endereço Não Informado" | Endereço do tomador | Cli: `Endereco` {Cep, Logradouro, Numero, Complemento, Bairro} | **Parcial** (opcional nos cadastros antigos) |
| `borrower.address.city.code` (IBGE) + `city.name` + `state` | Sim (com endereço) | Município do tomador. É também a **localidade do IBS/CBS** quando o `operationIndicator` é `100301` | Cli: `Cidade` ("Nome - UF") resolvido na tabela `Cidade` | **Parcial** (gravar o IBGE) |
| `borrower.caepf`, `noTaxIdReason` | Cond. | Tomador PF com CAEPF ou do exterior | — | Falta (exterior) |
| `intermediary` | Cond. | Intermediário | — | N/A |
| `recipient` + `ibsCbs.destinationIndicator = DifferentFromBuyer` | Cond. | Destinatário diferente do tomador | — | N/A hoje |

#### Local da prestação e imóvel

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `location` (`country`, `postalCode`, `street`, `number`, `district`, `city.code`, `city.name`, `state`) | Cond.: ISS fora do município (`OutsideCity`) e `operationIndicator` que pede o local (`010102`, `050102`, `060101`...). Se informado, `city.code` (7 dígitos), `city.name` e `state` são obrigatórios | Local da prestação (`cLocPrestacao`) | Prop/Lanç: "local da prestação/posto" (padrão: endereço do cliente) | **Falta** |
| `realEstate` {`siteAddress` ou `cibCode`, `propertyFiscalRegistration`} | **Cond.: `operationIndicator` `020101`, `020201`, `020202`...** Limpeza (07.10) e jardinagem (07.11) caem em `020201` na tabela oficial | Imóvel onde o serviço é feito ("limpeza, vigilância, quando o local da prestação é o imóvel") | Prop/Lanç: endereço do posto ou condomínio | **Falta** |
| `construction`, `activityEvent`, `lease`, `foreignTrade` | Cond. | Obra, evento, locação, comércio exterior | — | N/A (comércio exterior: só se a Sinesta exportar) |

#### IBS/CBS (`ibsCbs`)

| Campo da API | Obrig.? | O que é | De onde vem no ELROND | Situação |
|---|---|---|---|---|
| `ibsCbs.operationIndicator` (6 dígitos) | **Sim** | `cIndOp`. Define a **localidade do IBS/CBS** e **qual endereço precisa estar no payload** | Srv (sugerido pelo Anexo VIII: 17.05 → `100301`; 07.10/07.11 → `020201`; 01.01–01.04/01.06 → `100301`; 01.05 → `100501`; 11.02 → `030101`/`100301`). Confirmar com o contador | **Falta** |
| `ibsCbs.classCode` (6 dígitos) | **Sim** | `cClassTrib` (`000001` = tributação integral) | Srv | **Falta** |
| `ibsCbs.situationCode` (3) | Não (sai dos 3 primeiros dígitos do `classCode`) | CST do IBS/CBS | Srv (opcional) | Falta (opcional) |
| `ibsCbs.purpose` | Não (padrão `regular`) | `finNFSe` | Constante | — |
| `ibsCbs.personalUse` | Não | `indFinal` (uso pessoal) | Cli: `Tipo = fisica` | **Parcial** |
| `ibsCbs.destinationIndicator` | Não (padrão `SameAsBuyer`) | `indDest` | Constante | — |
| `ibsCbs.basis`, `ibs` {`totalAmount`, `state`{`rate`, `effectiveRate`, `amount`}, `municipal`{...}}, `cbs` {`rate`, `effectiveRate`, `amount`} | Não (calculado). **Enviar completo ou não enviar** | Base, alíquotas e valores | `Empresa.IbsMunicipal/IbsEstadual/Cbs` (recomendo **não enviar** e deixar o cálculo) | Parcial |
| `ibsCbs.operationType`, `governmentPurchase` {`entityType`: `Union`, `State`, `FederalDistrict`, `Municipality`, ...} | Cond. (tomador público) | Compra governamental | Cli: `Perfil = "B2G"` (falta a esfera) | **Parcial** |
| `reimbursedResuppliedAmount`, `thirdPartyReimbursements`, `relatedDocs`, `presumedCredits`, `creditTransfer`, `regularTaxation`, `leasedMovableAssets`, `ibscbsDeductionReductionAmount` | Cond. | Cenários específicos | — | N/A |

### d.3 Exemplo [Inferência]: nota de limpeza da BM (São Vicente) num condomínio em Santos

Os códigos abaixo são ilustrativos e precisam de confirmação do contador.

```json
{
  "externalId": "nf_7b1c...",
  "cityServiceCode": "<código municipal de São Vicente>",
  "federalServiceCode": "07.10",
  "nbsCode": "118031000",
  "description": "Serviços de limpeza e conservação - competência 10/2026 - Posto: Cond. X - Contrato BM-0012",
  "servicesAmount": 25000.00,
  "accrualOn": "2026-10-01",
  "taxationType": "OutsideCity",
  "location": { "country": "BRA", "postalCode": "11010-000", "street": "Rua ...", "number": "100", "district": "...", "city": { "code": "3548500", "name": "Santos" }, "state": "SP" },
  "realEstate": { "siteAddress": { "country": "BRA", "postalCode": "11010-000", "street": "Rua ...", "number": "100", "district": "...", "city": { "code": "3548500", "name": "Santos" }, "state": "SP" } },
  "retentionType": "WithheldByBuyer",
  "issAmountWithheld": 1250.00,
  "inssAmountWithheld": 2750.00, "irAmountWithheld": 250.00,
  "pisAmountWithheld": 162.50, "cofinsAmountWithheld": 750.00, "csllAmountWithheld": 250.00,
  "borrower": { "type": "LegalEntity", "name": "CONDOMINIO X", "federalTaxNumber": 12345678000199, "email": "sindico@...", "address": { "country": "BRA", "postalCode": "11010-000", "street": "Rua ...", "number": "100", "district": "...", "city": { "code": "3548500", "name": "Santos" }, "state": "SP" } },
  "additionalInformationGroup": { "order": "BM-0012" },
  "ibsCbs": { "operationIndicator": "020201", "classCode": "000001" }
}
```

### d.4 Endpoints da NFS-e [Doc]

Todos em `https://api.nfe.io`.

| Ação | Método e caminho | Observação |
|---|---|---|
| Emitir | `POST /v1/companies/{company_id}/serviceinvoices` | 202 + `id` |
| Consultar por ID | `GET /v1/companies/{company_id}/serviceinvoices/{id}` | Ver os campos da resposta abaixo |
| Consultar por `externalId` | `GET /v1/companies/{company_id}/serviceinvoices/external/{externalId}` | Usar depois de timeout |
| Listar | `GET /v1/companies/{company_id}/serviceinvoices?pageIndex&pageCount&issuedBegin&issuedEnd&createdBegin&createdEnd` | |
| Cancelar | `DELETE /v1/companies/{company_id}/serviceinvoices/{id}` | Assíncrono; resultado por webhook `cancelled_*`. **Nenhum campo de motivo ou código de cancelamento documentado.** Perguntar |
| PDF (DANFSe) | `GET .../serviceinvoices/{id}/pdf` | Redireciona para uma URL assinada e temporária [Doc] |
| XML da nota | `GET .../serviceinvoices/{id}/xml` | Idem |
| XML do evento de cancelamento | `GET .../serviceinvoices/{id}/cancellation-xml` | **Só Ambiente Nacional** (evento `101101`) e só com `status = Cancelled`. Prefeituras ABRASF ou Paulistana dão `404` |
| Reenviar e-mail ao tomador | `PUT .../serviceinvoices/{id}/sendemail` | |
| Notificação por e-mail da empresa | `POST /v1/companies/{company_id}/notifications/email` | Opcional |

**O que guardar da resposta da consulta** [Doc, schema v1]:
- identificação: `id`, `externalId`, `environment`;
- situação: `status`, `flowStatus`, `flowMessage`;
- números: `number` (nº da NFS-e), `checkCode` (código de verificação), `rpsSerialNumber`, `rpsNumber`, `rpsStatus`, `batchNumber`, `batchCheckNumber`;
- datas: `issuedOn`, `cancelledOn`;
- valores: `baseTaxAmount`, `issRate`, `issTaxAmount`, cada retenção, `amountWithheld`, **`amountNet`** (líquido);
- partes: `provider`, `borrower`.

[Inferência] No Ambiente Nacional também deve vir a chave de acesso de 50 dígitos. Ela não aparece no schema v1; conferir no retorno de homologação.

**PDF e XML.** [Inferência] O `HttpClient` deve seguir o redirecionamento; o .NET descarta o `Authorization` ao mudar de host, o que é o certo aqui. Guardar cópia do PDF e do XML no ELROND, porque o XML precisa ser mantido **5 anos** [Doc, página de cancelamento].

---

## e) NF-e / NFC-e RTC (visão curta)

**Endpoints** [Doc]. Todos em `https://api.nfse.io`, com a mesma chave de Nota Fiscal.

| Ação | Método e caminho |
|---|---|
| Emitir NF-e | `POST /v2/companies/{companyId}/productinvoices` (ou `/statetaxes/{stateTaxId}/productinvoices` para escolher a IE) |
| Emitir NFC-e | `POST /v2/companies/{companyId}/consumerinvoices`. Mesmo payload; sem `issuedOn`/`operationOn`; `presenceType` só `Presence` ou `Delivery` |
| Consultar / cancelar | `GET` / `DELETE /v2/companies/{companyId}/productinvoices/{invoiceId}` |
| Itens / eventos | `GET .../{invoiceId}/items` · `GET .../{invoiceId}/events` |
| DANFE (PDF) / XML / rejeição / EPEC | `GET .../{invoiceId}/pdf` · `/xml` · `/xml-rejection` · `/xml-epec` |
| Carta de correção | `PUT .../{invoiceId}/correctionletter` (+ `/pdf`, `/xml`) |
| Inutilização | `POST .../{invoiceId}/disablement` · `POST .../productinvoices/disablement` |
| Eventos de autoridade da reforma (NT 2025.002) | `POST/GET .../{invoiceId}/authority-events[/{id}[/xml]]` |

**Pré-requisitos:**
- Empresa + certificado + **Inscrição Estadual** (`/statetaxes`, com série e numeração).
- **O certificado é obrigatório mesmo em homologação**, porque a homologação da SEFAZ é o ambiente real do órgão [Doc].

**Payload, campos principais:**
- **Cabeçalho:** `operationNature`, `operationType` (`Outgoing`/`Incoming`), `destination`, `purposeType`, `consumerType`, `presenceType`, `serie`, `number`, `issuedOn`.
- **`buyer`:** `name`, `federalTaxNumber`, `type`, `stateTaxNumberIndicator` (`TaxPayer`/`Exempt`/`NonTaxPayer`), `stateTaxNumber`, `address`.
- **`items[]`** (pelo menos 1):
  - `code`, `description`, **`ncm`**, **`cfop`**, `unit`, `quantity`, `unitAmount`, `totalAmount`, `unitTax`;
  - `tax.icms` {`origin`, `cst`/`csosn`, `baseTax`, `rate`, `amount`}, `tax.pis`/`tax.cofins` {`cst`};
  - **`tax.IBSCBS`** {`calculationMode`: `Manual` | `OfficialService`, `situationCode`, `classCode`, `basis`, `state`, `municipal`, `cbs`...}.
- **Pagamento e frete:** `payment[].paymentDetail[]` {`method`, `paymentType`, `amount`}, `transport` {`freightModality`, ...}.
- **Totais e outros:** `totals`, `additionalInformation`, `billing`, `delivery`/`withdrawal`.

**Fluxo:**
- A resposta é **`200`** com eco dos dados + `id`; isso **não** é a autorização.
- O resultado vem por webhook (envelope "achatado", eventos `product_invoice.*`) ou por consulta (`status: Issued`, `authorization.accessKey`, `xml.uri`, `pdf.uri`, ou `status: Error` + `errors[]`).
- Em homologação, a SEFAZ já rejeita (1115) notas de CRT 3 (regime normal) sem o grupo IBSCBS, emitidas a partir de 01/07/2026 [Doc].

**Para o ELROND:** é um projeto à parte. Exige **cadastro de produto** (NCM, CFOP, CST/CSOSN, origem, unidade), IE com série e regra de ICMS por UF. O ELROND hoje só tem `EmpresaIcms` (alíquota por UF). Só vale a pena se alguma empresa do grupo vender mercadoria.

---

## f) Plano de integração em fases

Regras do projeto: migrations **só aditivas e com valor padrão** (há massa em produção); deploy nos 2 ambientes.

### Fase 0: pré-requisitos (fora do código) · esforço **pequeno**, mas dependente de terceiros

- Conta da NFE.io em teste, com a **chave de Nota Fiscal**. Decidir **uma conta por ambiente do ELROND** (Sinesta × BM) ou uma só (ver o webhook na fase 4).
- **Pedir ao contador**, por serviço vendido:
  - item da LC 116, NBS, `operationIndicator`, `classCode`;
  - `cityServiceCode` em São Vicente, Santos, Praia Grande e São Paulo;
  - CNAE e alíquota de ISS;
  - regras de retenção (ISS, INSS, IR, PCC).
- Último RPS e série de cada empresa; IM; credenciais do webservice, se a prefeitura pedir.

### Fase 1: cliente HTTP + cadastro da empresa na NFE.io + certificado · **médio**

**Backend:**
- `NfeIoOpcoes`: URLs (`api.nfe.io`, `api.nfse.io`) e a chave, como segredo do deploy (variável de ambiente, como a chave AES do certificado).
- `INfeIoClient` / `NfeIoClient`: `HttpClient` tipado com retry e backoff **só para 5xx e falha de rede**. Nunca repetir `POST` de nota sem consultar por `externalId` antes.
- Nova entidade **`IntegracaoFiscalEmpresa`**, 1:1 com a Empresa, em tabela própria e aditiva. Campos:
  - `EmpresaId`, `NfeioCompanyId`, `NfeioMunicipalTaxId`;
  - `Ambiente` (`Development` / `Staging` / `Production`), `FiscalStatus`;
  - `SerieRps`, `RpsInicial`, `RegimeEspecial` (padrão `Nenhum`), `EmissorNacional` (bool);
  - credenciais da prefeitura cifradas (AES-GCM, como o certificado);
  - `CertificadoThumbprint`, `CertificadoEnviadoEm`, `UltimaSincronizacao`, `UltimoErro`.
- **`Empresa.CidadeIbge`** (string, padrão ""), preenchido a partir de `Endereco` ("Cidade - UF") por busca exata na tabela `Cidade`, com correção manual quando não achar.
- `ICertificadoService`: novo método que devolve **bytes do .pfx + senha** decifrados, para o multipart.
- **Casos de uso:**
  - "Sincronizar empresa": `POST` ou `PUT /v2/companies`, depois `POST` ou `PUT /municipaltaxes`, depois `GET` do `FiscalStatus`.
  - "Enviar certificado": `POST /v2/.../certificates`, que também roda ao salvar um certificado novo.
  - "Consultar status".

**Front:** aba **"Integração fiscal (NFS-e)"** no cadastro da Empresa:
- ambiente, série e próximo RPS, regime especial;
- botões Sincronizar e Enviar certificado;
- status da cidade (`FiscalStatus`), status e validade do certificado na NFE.io;
- último erro (texto da API).

**Teste:** IM em `Development`, sem certificado.

### Fase 2: campos fiscais do Serviço e do Cliente · **médio**

**Serviço** (hoje só tem `Nome`). Novos campos:
- `ItemLc116` (→ `federalServiceCode`, ex.: "17.05"), `CodigoNbs` (9 dígitos);
- `IndicadorOperacao` (6), `ClassificacaoTributaria` (6), `CstIbsCbs` (opcional);
- `TextoDiscriminacao` (modelo), `CessaoMaoDeObra` (bool, dispara INSS e IR);
- `ExigeEnderecoImovel`, derivado do indicador `0201xx`/`0202xx`;
- `TributacaoIss` (padrão `WithinCity`/`OutsideCity` pela regra de incidência).

**Nova tabela `ServicoMunicipio`** (`ServicoId`, `EmpresaId` ou `CidadeIbge`, `CodigoMunicipal` → `cityServiceCode`, `Cnae`, `AliquotaIss`, `IssRetidoPadrao`). O mesmo serviço tem códigos e alíquotas diferentes em cada cidade.

**Cliente:**
- `CidadeIbge`: a `ConsultaPublicaService` já recebe o código IBGE pelo CEP ou CNPJ e descarta; basta guardar.
- "Retém tributos?" e a esfera de governo (para B2G).
- **Endereço obrigatório para emitir**, com saneamento dos cadastros antigos.

**Front:** seção "Fiscal" no Serviço, com ajuda e link para a tabela oficial de correlação LC 116 × NBS × `indOp` × `cClassTrib`; sub-tabela por município. Validações de tamanho (6 e 9 dígitos).

### Fase 3: entidade NotaFiscal + emissão em homologação a partir do lançamento a receber · **grande**

**Nova entidade `NotaFiscal`** (aditiva). Campos:
- vínculos: `Id` (= `externalId`), `EmpresaId`, `MovimentoId`, `PropostaId`, `ClienteId`;
- controle: `NfeioId`, `Ambiente`, `Status`, `FlowStatus`, `FlowMessage`;
- números: `Numero`, `CodigoVerificacao`, `ChaveAcesso`, `SerieRps`, `NumeroRps`;
- dados: `Competencia` (data), `LocalPrestacao` (endereço + IBGE);
- valores: `ValorServicos`, as retenções, `ValorLiquido`;
- auditoria: `PayloadEnviado` (json), `UltimoRetorno` (json), `CriadaEm`, `EmitidaEm`, `CanceladaEm`, `MotivoCancelamento`;
- arquivos: `PdfAnexoId`, `XmlAnexoId`.

**`NfseMontador`** (Application): monta o JSON a partir de Empresa, Cliente, Serviço, ItemProposta e Movimento.
- **Validação antes do envio:** IBGE, endereço completo, códigos do serviço, endereço do imóvel quando o indicador exige, tamanhos.
- **Decisão de retenções:** calcular no ELROND e enviar todas (com `0` nas que não se aplicam), ou não enviar nenhuma e deixar o cálculo automático. Nunca as duas coisas.

**Regras:**
- **uma nota por empresa** (o `EmpresaId` fica no item da proposta);
- emitir só lançamento **a receber aprovado e não cancelado** [Inferência];
- **`ValorLiquido = amountNet`** atualiza o líquido esperado do recebimento (hoje o `Movimento` não separa bruto, retenções e líquido).

**Front:** botão **"Emitir NFS-e"** no lançamento a receber e na proposta aprovada. Abre um modal de conferência com descrição, competência, local da prestação, retenções, líquido e ambiente (com destaque quando for `Production`). Depois mostra o status da nota no lançamento.

**Teste no `Development`:** caminho feliz, `random error` (falhas E998/E999), CPF/CNPJ inválido (400), tomador PF e PJ, nota fora do município, limpeza com `realEstate`.

### Fase 4: webhook, consulta, PDF/XML, cancelamento e e-mail · **médio**

**Webhook:**
- Endpoint público `POST /api/integracoes/nfeio/webhook` (sem login).
- Ler o **corpo cru**, validar `X-Hub-Signature` (HMAC-SHA1 com o `secret` guardado como segredo), deduplicar por `X-Hook-Id` (tabela `WebhookRecebido`).
- Responder `200` na hora e processar em fila (`BackgroundService` + `Channel`). Numa falha temporária, responder `500`, e não `4xx`.
- Evento de nota desconhecida (por exemplo, de outro ambiente na mesma conta): **responder 200 e ignorar**.
- Cadastro do webhook por deploy (`POST /v2/webhooks`) com `filters` de `service_invoice.*`. Usar `headers`/`properties` para identificar o ambiente.

**Polling de segurança:** job a cada N minutos para notas em `Waiting*` há mais de X minutos (`GET .../{id}`).

**Arquivos:** ao chegar `Issued`, baixar `/pdf` e `/xml` e guardar como Anexo. Botões "Baixar PDF/XML" e "Reenviar e-mail" (`PUT .../sendemail` ou envio próprio para os contatos com `RecebeNotaFiscal`).

**Cancelamento:**
- `DELETE .../{id}` → estado "cancelando" → webhook `cancelled_successfully` / `cancelled_failed` (a nota segue válida) / `cancelled_error`.
- No Ambiente Nacional, baixar também o `/cancellation-xml`.
- O motivo fica guardado no ELROND (a API v1 não tem campo de motivo).
- Efeito no lançamento: avisar e não apagar (o `Movimento` nunca é apagado).

**Tela "Notas fiscais"** (lista por empresa, status, filtros) e alerta de certificado vencendo (`ValidUntil` da NFE.io ou do ELROND).

### Fase 5: produção, após o contrato · **pequeno** em código, **grande** em dependências externas

1. Contratar e pagar a NFE.io.
2. Credenciar cada empresa na prefeitura e obter a liberação do webservice.
3. Enviar o certificado A1 real.
4. Conferir `FiscalStatus = Active`.
5. **Ajustar `RpsNumber`/`LastRpsSent` para o último RPS real.**
6. Pedir ao suporte o teste em `Staging`, se a prefeitura tiver homologação.
7. `PUT .../municipaltaxes/{id}` com `Environment: "Production"`.
8. Cadastrar o webhook de produção.
9. Emitir uma nota-piloto de baixo valor por empresa e conferir no portal da prefeitura.

**No ELROND:** trava de segurança, com confirmação dupla e perfil autorizado, para mudar o ambiente para produção. Log de auditoria (`RegistroAuditoria`).

### Depois

- Emissão em lote no fechamento mensal (contratos de terceirização): **médio**.
- Substituição de NFS-e (`ReferenceSubstitution`): **pequeno a médio**.
- NF-e/NFC-e: **grande**, porque exige cadastro de produto, IE e ICMS.

---

## g) Perguntas para a NFE.io

1. **Cobertura e padrão por município.**
   - Para **Santos (3548500), Praia Grande (3541000), São Vicente (3551009) e São Paulo (3550308)**, a lista mostra "Habilitado: Sim · Amb. Nacional: Sim · Emissor Nacional: Não". Isso quer dizer que vocês emitem pelo **sistema do município** (GissOnline, ISS.net, Paulistana) e a prefeitura repassa ao ADN?
   - Em qual leiaute sai a nota de cada um?
   - Quais desses municípios pedem `LoginName`/`LoginPassword`/`AuthIssueValue` além do certificado?
2. **Homologação por município.**
   - Quais dessas 4 prefeituras têm `Staging` (homologação real)?
   - Como pedir a parametrização?
   - Precisa de certificado e credenciamento prévio na prefeitura?
   - Simples/MEI ainda não testam as tags da reforma: há previsão?
3. **Testar sem certificado.** Confirmam que, com a IM em `Development`, dá para testar emissão, consulta, cancelamento, PDF/XML e **webhooks** sem certificado e sem custo? O PDF simulado sai?
4. **Conta, chaves e ambientes.**
   - Uma conta com várias empresas (BM, VRM, MB, Sinesta) ou uma conta por ambiente do ELROND?
   - Há chave separada para teste e produção?
   - O webhook é mesmo por conta, ou dá para filtrar por empresa?
5. **Custo.**
   - Preço por nota emitida e mensalidade por CNPJ ou por conta.
   - Nota cancelada ou rejeitada é cobrada?
   - O ambiente de teste é gratuito e por quanto tempo?
   - Há custo por consulta de CNPJ/CEP?
6. **Limites.** Limite de requisições (por segundo ou minuto) na emissão, na consulta e no Contribuintes v2. Há `429` com `Retry-After`? Limite diário?
7. **Versão da API.** Emissão RTC em `/v1/companies/{id}/serviceinvoices` (como no OpenAPI) ou `/v2` (como na página de chaves)? Prazo de desligamento do `/v1/companies`?
8. **Idempotência.** Reenviar o mesmo `externalId` devolve `400` ou a nota original? O `externalId` é único por empresa ou por conta? Qual o tamanho máximo?
9. **Cancelamento.** Como informar o **motivo ou código** (erro de emissão, serviço não prestado, duplicidade) que as prefeituras ABRASF e o Ambiente Nacional pedem? Qual o prazo de cancelamento em cada município?
10. **Campos.**
    - `nbsCode` vai com ou sem pontos?
    - Nos municípios de sistema próprio, `cityServiceCode` é o código municipal e `federalServiceCode` o item da LC 116; e no Ambiente Nacional, `cityServiceCode` leva o cTribNac?
    - O exemplo `operationIndicator: '1005011'` tem 7 dígitos e a regra diz 6: qual vale?
    - A resposta da consulta traz a chave de acesso de 50 dígitos?
11. **Cálculo automático.**
    - O catálogo de Santos, São Vicente e Praia Grande já tem alíquota e retenções para 17.05, 07.10, 07.11 e 11.02?
    - Calcula INSS 11% na cessão de mão de obra e respeita condomínio como tomador?
    - Dá para customizar por CNPJ?
12. **Certificado.**
    - Filial pode usar o certificado da matriz (mesma raiz)?
    - Vocês avisam (e-mail ou webhook) quando o certificado vai vencer?
13. **CNPJ alfanumérico.** A Sinesta está em abertura e pode receber CNPJ alfanumérico. Qual a versão "alfa-aware" da NFS-e (v3?) e ela já funciona em homologação?
14. **Numeração.** Na migração de empresas que já emitem por outro meio, como sincronizar `LastRpsSent` para não colidir? Vocês importam notas antigas (`PullFromCityHall`)?
15. **Suporte e SLA.** Canal técnico para a homologação, SLA em produção e retenção de PDF/XML no lado de vocês (por quanto tempo ficam disponíveis).

---

## h) Fontes

**Especificações OpenAPI** (fonte principal):
- https://nfe.io/docs/api/service-invoice-rtc-v1.yaml (NFS-e RTC)
- https://nfe.io/docs/api/nf-servico-v1.yaml (NFS-e v1: consulta, cancelamento, PDF/XML, webhooks)
- https://nfe.io/docs/api/contribuintes-v2.json (Contribuintes v2)
- https://nfe.io/docs/api/product-invoice-rtc-v1.yaml e https://nfe.io/docs/api/nf-produto-v2.yaml (NF-e/NFC-e)

**Páginas indicadas no pedido:**
- https://nfe.io/docs/desenvolvedores/rest-api/reforma-tributaria/nota-fiscal-de-servico-rtc/envio-de-dados-para-emissao-de-nfs-e-rps-dps/
- https://nfe.io/docs/desenvolvedores/rest-api/reforma-tributaria/nota-fiscal-de-produto-consumidor-rtc/api-de-emissao-de-nota-fiscal-de-produto-nfe-nfce-rtc/
- https://nfe.io/docs/desenvolvedores/rest-api/contribuintes-v2/

**Documentação para agentes e índice:**
- https://nfe.io/docs/docs-para-agentes/
- https://nfe.io/docs/documentacao/llms.txt

**Contribuintes:**
- https://nfe.io/docs/documentacao/gerenciamento-empresas/visao-geral/
- https://nfe.io/docs/documentacao/gerenciamento-empresas/api-empresas/
- https://nfe.io/docs/documentacao/gerenciamento-empresas/api-certificados/
- https://nfe.io/docs/documentacao/gerenciamento-empresas/api-inscricoes-municipais/
- https://nfe.io/docs/documentacao/gerenciamento-empresas/api-inscricoes-estaduais/
- https://nfe.io/docs/release-notes/2026-1-unificacao-api-contribuintes/

**Autenticação e ambientes:**
- https://nfe.io/docs/documentacao/nossa-plataforma/chaves-de-autenticacao/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/primeiros-passos/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/ambiente-na-emissao-nfse/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/erros-e-status/como-simular-erro-de-processamento-nfse-ambiente-de-testes/

**Status e erros:**
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/como-saber-se-sua-nota-fiscal-de-servico-foi-emitida-pela-api/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/erros-e-status/tipos-de-retorno-de-status-das-requisicoes-https/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/erros-e-status/cenarios-de-badrequest-na-emissao/

**Webhooks:**
- https://nfe.io/docs/documentacao/webhooks/integracao/
- https://nfe.io/docs/webhooks/catalogo-de-eventos/
- https://nfe.io/docs/webhooks/catalogo-saida-nfse/
- https://nfe.io/docs/documentacao/webhooks/duvidas-frequentes/
- https://nfe.io/docs/documentacao/webhooks/ips-de-origem/

**Layout RTC e cenários de emissão:**
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-servico/documentacao-layout-nfse-rtc/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-servico/mudancas-layout-integracao-nfse-v4/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-servico/guia-solucao-problemas-nfse-rtc/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-servico/adequacao-ao-emissor-ambiente-nacional-nfse/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-servico/municipios-que-nao-utilizam-ambiente-nacional/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/tabelas-de-referencia/tabela-correlacao-nbs-lc116/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/cenarios-de-emissao/ (subpáginas `cenarios-iss-e-local`, `cenarios-retencoes`, `cenarios-reforma-tributaria-ibs-cbs`, `cenarios-regime-tributario`, `cenarios-externalid-e-rps`, `calculo-automatico-impostos`)
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/tributos-federais/campos-no-payload/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/impostos-e-classificacao/cnae-e-item-da-lc116/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/emissor-nacional/evento-cancelamento/
- https://nfe.io/docs/documentacao/nota-fiscal-servico-eletronica/duvidas/campos-de-autorizacao-nfse/

**NF-e:**
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-produto/quickstart-nfe-api/
- https://nfe.io/docs/documentacao/reforma-tributaria/conceitos-funcionais/nota-fiscal-de-produto/documentacao-layout-nfe-rtc/

**Release notes:**
- https://nfe.io/docs/release-notes/2026-3-cnpj-alfanumerico/
- https://nfe.io/docs/release-notes/2026-3-cnpj-alfanumerico/emissoes-dfe/
- https://nfe.io/docs/release-notes/2026-7-fim-suporte-tls-1-0-1-1/

**Prefeituras integradas:**
- https://nfe.io/docs/prefeituras-integradas/sao-paulo/santos-sp-3548500/
- https://nfe.io/docs/prefeituras-integradas/sao-paulo/praia-grande-sp-3541000/
- https://nfe.io/docs/prefeituras-integradas/sao-paulo/sao-vicente-sp-3551009/
- https://nfe.io/docs/prefeituras-integradas/sao-paulo/sao-paulo-sp-3550308/

**SDKs:**
- https://github.com/nfe (client-nodejs, client-php, client-ruby; sem cliente .NET)

**ELROND:**
- `backend/Elrond.Domain/Entities/` (Empresa, CertificadoEmpresa, Parceiros, Proposta, Financeiro, CadastrosApoio, Cidade)
- `backend/Elrond.Application/Interfaces/ICertificadoService.cs`
- `nfse-levantamento.md` (scratchpad)
