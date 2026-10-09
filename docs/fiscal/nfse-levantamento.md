# Levantamento NFS-e (e visão rápida de NF-e) — o que o ELROND precisa ter para emitir nota

*Estudo de 08/10/2026. Só leitura: nenhum arquivo do projeto foi alterado.*
*Fontes: manual GissOnline v1.7 (21/09/2026, ABRASF 2.04 + campos da reforma), documentação do padrão nacional (DPS/Sefin Nacional) e código do ELROND (`backend/Elrond.Domain/Entities`). URLs no fim.*

---

## a) Resumo executivo

1. **Qual padrão.** Desde 01/01/2026 todo município precisa **usar o padrão nacional ou enviar as notas para o Ambiente de Dados Nacional (ADN)** (LC 214/2025, art. 62). Isso **não obriga a usar o Emissor Nacional**: cada empresa emite pelo sistema do **município onde ela está estabelecida**. No grupo: **Santos e Praia Grande → GissOnline** (ABRASF 2.04 + campos da reforma, que é o manual que temos aqui); **São Vicente → ISS.net/Nota Control** (ABRASF 2.04); **São Paulo capital → Nota Fiscal Paulistana** (leiaute próprio, versão 2 com IBS/CBS; aderiu ao ADN em 22/12/2025). **Optantes do Simples Nacional/MEI passam a ser obrigados a usar o Emissor Nacional a partir de 01/11/2026** (Res. CGSN 189/2026). As empresas do BM são do Lucro Presumido e ficam nos sistemas municipais.
2. **Recomendação.** Guardar os dados no ELROND **pelo modelo nacional (DPS)**, que cobre todos os campos dos outros leiautes, e emitir por **uma API agregadora** (ex.: Focus NFe ou NFE.io, que já atendem Santos, Praia Grande, São Vicente e SP). Fazer a integração direta exigiria **3 a 4 integrações SOAP/XML diferentes**, cada uma com assinatura e credenciamento próprios.
3. **O que já temos.** Dados básicos do prestador (CNPJ, razão social, regime, alíquotas de impostos, IBS/CBS) e do tomador (CPF/CNPJ, IM/IE, endereço estruturado, e-mail e contatos que "recebem nota fiscal"). Temos também a base IBGE de municípios e o lançamento a receber com empresa, cliente, valor e competência.
4. **O que falta.** (i) **Dados fiscais do Serviço**: hoje o cadastro tem só o `Nome`. Faltam item LC 116, cTribNac, código municipal, CNAE, NBS, CST/cClassTrib do IBS/CBS e cIndOp. (ii) **Local da prestação** na proposta ou no lançamento. (iii) **Código IBGE gravado** na Empresa e no Cliente (hoje a cidade é texto "Cidade - UF"). (iv) **Regras de retenção** por serviço e tomador (ISS, INSS 11%, IR, PIS/COFINS/CSLL). (v) **Entidade NotaFiscal** com numeração de RPS/DPS, retorno e cancelamento. (vi) **Certificado A1 e configuração da integração** por empresa.
5. **Maiores bloqueios.** Dependem do **contador e da prefeitura**, não de código: os códigos por serviço e município, as regras de retenção na cessão de mão de obra, o certificado A1 de cada CNPJ, a liberação do webservice em cada prefeitura e a **confirmação do município da Sinesta** (o seed tem "Sinesta Transportes – Cajamar-SP", que parece dado fictício).
6. **Prazo.** O preenchimento de IBS/CBS na NFS-e **já é exigido desde 01/10/2026** para a maioria dos serviços. Para os subitens 1.03, 1.05 e 1.09 (software/SaaS) a data é 01/12/2026. Até 31/12/2026 a ausência não causa rejeição, mas a nota fica em desconformidade.

---

## b) Tabela de campos por grupo

**Legenda**
- **Situação**: **Tem** · **Adicionado agora** (Cep/Logradouro/Número/Complemento/Bairro, InscricaoMunicipal e InscricaoEstadual na Empresa) · **Parcial** · **Falta** · **N/A** (não se aplica ao negócio hoje).
- **Obrigatório?**: "Sim" = obrigatório no leiaute. "Cond." = obrigatório só em certas situações. "Município" = opcional no leiaute, mas a prefeitura exige.
- **Nomes de campo**: o nome do padrão nacional (DPS) vem primeiro, depois o nome ABRASF/GissOnline (após a barra).

### B.1 Identificação da nota / RPS / DPS

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `tpAmb` / (URL do ambiente no ABRASF) | Sim | Produção ou homologação (teste) | Falta | Configuração da integração (por empresa) | Sistema |
| `dhEmi` / `Rps.DataEmissao` | Sim | Data/hora de emissão | Falta (o sistema gera) | Nova entidade **NotaFiscal** | Sistema |
| `verAplic` | Sim (DPS) | Versão do sistema emissor | Falta (constante) | Configuração | Sistema |
| `serie` / `IdentificacaoRps.Serie` (até 5 caracteres) | Sim | Série do RPS/DPS | Falta | Configuração por empresa | Prefeitura/contador define |
| `nDPS` / `IdentificacaoRps.Numero` (até 15 dígitos) | Sim | Número sequencial do RPS/DPS. **Não pode repetir nem pular** | Falta | Contador por empresa + série (no molde da `NumeracaoProposta`) | Sistema |
| `IdentificacaoRps.Tipo` | Sim (ABRASF) | 1 = RPS | Falta (constante) | — | Sistema |
| `Rps.Status` | Sim (ABRASF) | 1 = normal, 2 = cancelado | Falta | NotaFiscal | Sistema |
| `dCompet` / `Competencia` (data) | Sim | Data de competência (quando o serviço foi prestado) | **Parcial**: `Movimento.Competencia` é `yyyy-MM` e o leiaute pede data completa (usar o dia 1º ou a data do fim do serviço; confirmar com o contador) | Lançamento | Sistema/usuário |
| `tpEmit` | Sim (DPS) | Quem emite: 1 = prestador | Falta (constante 1) | — | Sistema |
| `cLocEmi` | Sim (DPS) | Código IBGE do município emissor (o do prestador) | **Parcial**: `Empresa.Endereco` guarda "Cidade - UF" em texto. Dá para resolver pela tabela `Cidade` (Id = IBGE), mas não existe busca exata por nome + UF e o código não fica gravado | Empresa (gravar `CidadeIbge`) | Cadastro |
| `RpsSubstituido` / `NfseSubstituida` / `refNFSe` | Cond. | Nota que esta substitui | Falta | NotaFiscal | Usuário |
| `NumeroLote`, `QuantidadeRps` (`EnviarLoteRpsEnvio`) | Sim (ABRASF, envio em lote, máx. 50 RPS) | Lote de envio assíncrono | Falta | NotaFiscal/LoteEnvio | Sistema |
| Retorno: nº da NFS-e, `CodigoVerificacao`, chave de acesso (50 posições no nacional), data, protocolo, XML, PDF/DANFSe, situação, erros | — | O que a prefeitura devolve e precisa ser guardado | Falta | NotaFiscal (+ arquivo do XML) | Sistema |
| Cancelamento: `CodigoCancelamento` (1 erro de emissão, 2 serviço não prestado, 4 duplicidade) | Cond. | Pedido de cancelamento | Falta | NotaFiscal | Usuário |

### B.2 Prestador (a Empresa do ELROND)

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `CNPJ` / `Prestador.CPFCNPJ.Cnpj` | Sim | CNPJ do estabelecimento emissor | **Tem** (`Empresa.Cnpj`; enviar só os dígitos) | Empresa | Cadastro |
| `IM` / `InscricaoMunicipal` | Município (0-1 no leiaute, mas as prefeituras exigem) | Inscrição municipal | **Adicionado agora** | Empresa | Cadastro/contador |
| `xNome` / `RazaoSocial` | Sim | Razão social | **Tem** | Empresa | Cadastro |
| `NomeFantasia` | Não | Nome fantasia | **Tem** | Empresa | Cadastro |
| Endereço: `xLgr`/`Endereco`, `nro`/`Numero`, `xCpl`/`Complemento`, `xBairro`/`Bairro`, `CEP`/`Cep` | Na DPS é opcional quando o emitente é o próprio prestador (o sistema nacional usa o cadastro dele). No ABRASF vem do cadastro municipal | Endereço do prestador (sai no DANFSe) | **Adicionado agora** | Empresa | Cadastro |
| `cMun` / `CodigoMunicipio` (IBGE, 7 dígitos) + `UF` | Sim | Município do prestador | **Parcial** (texto "Cidade - UF") | Empresa (gravar o IBGE) | Cadastro |
| `fone`, `email` / `Contato` | Não | Contato do prestador | **Falta** (a Empresa não tem telefone nem e-mail) | Empresa | Cadastro |
| `opSimpNac` / `OptanteSimplesNacional` | Sim | 1 = não optante, 2 = MEI, 3 = ME/EPP (DPS); 1 = sim, 2 = não (ABRASF) | **Tem** (sai de `Empresa.Regime`) | Empresa | Sistema |
| `regApTribSN` | Cond. (só Simples) | Como o Simples apura os tributos | Falta | Empresa | Contador |
| `regEspTrib` / `RegimeEspecialTributacao` | Sim na DPS (0 = nenhum); 0-1 no ABRASF | Regime especial (sociedade de profissionais, cooperativa, estimativa, ME municipal...) | Falta (para o BM deve ser "nenhum"; confirmar) | Empresa | Contador |
| `IncentivoFiscal` | Sim (ABRASF/GissOnline) | Se a empresa é incentivadora fiscal (1 = sim, 2 = não) | Falta (padrão "2 – Não") | Empresa | Contador |
| CNAE (`CodigoCnae`) | Município (Santos e São Vicente pedem) | Atividade econômica ligada ao serviço | Falta | **Serviço × Empresa** | Contador |
| Inscrição estadual | Não na NFS-e (só NF-e) | — | **Adicionado agora** | Empresa | Cadastro |

### B.3 Tomador (o Cliente do ELROND)

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `CNPJ`/`CPF` / `IdentificacaoTomador.CPFCNPJ` | Sim para PJ (0-1 no leiaute, mas sem ele não há retenção nem crédito) | Documento do cliente | **Tem** (`Cliente.CpfCnpj` + `Tipo`) | Cliente | Cadastro |
| `NIF`, `cPais`, endereço no exterior | Cond. (cliente estrangeiro) | Identificação fiscal estrangeira | **Falta** no Cliente (o Fornecedor tem `Externo/Pais/TaxId`) | Cliente | Cadastro |
| `IM` / `InscricaoMunicipal` | Não (alguns municípios pedem quando o tomador é do mesmo município) | IM do cliente | **Tem** | Cliente | Cadastro |
| `xNome` / `RazaoSocial` | Sim (1-1 no GissOnline) | Razão social | **Tem** (`Cliente.Nome`; confirmar que guarda a razão social e não o apelido) | Cliente | Cadastro |
| Endereço: logradouro, número, complemento, bairro, CEP | Sim no ABRASF (`tcEndereco` 1-1, complemento opcional) | Endereço do cliente | **Parcial**: `EnderecoParceiro` existe, mas é opcional e está vazio nos cadastros antigos | Cliente | Cadastro |
| `cMun` (IBGE) + `UF` | Sim | Município do cliente | **Parcial** (`Cliente.Cidade` = "Nome - UF", sem código gravado; a `ConsultaPublicaService` já recebe o IBGE do CNPJ/CEP e descarta) | Cliente (gravar o IBGE) | Cadastro (automático pelo CEP/CNPJ) |
| `fone`, `email` / `Contato` | Não | Contato e envio da nota | **Tem** (`Telefone`, `Email`, `Contatos[].RecebeNotaFiscal`) | Cliente | Cadastro |
| `indFinal` (IBS/CBS) | Sim | Uso ou consumo pessoal (pessoa física consumidora) | **Parcial** (sai de `Tipo = fisica`, mas convém confirmar) | Cliente | Sistema |
| Ente governamental (`tpEnteGov`, `tpOper`, `pRedutor`) | Cond. (cliente público) | Compra governamental (redutor de IBS/CBS e retenções federais da IN 1.234) | **Parcial** (`Cliente.Perfil = "B2G"` indica, mas não diz a esfera) | Cliente | Cadastro |
| `indDest` / grupo `dest` | Sim (IBS/CBS) | Se o destinatário é o próprio tomador (0) ou outro (1) | Falta (padrão 0) | Proposta/Lançamento | Sistema |

### B.4 Serviço

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `cTribNac` (6 dígitos: item + subitem + desdobramento) | **Sim (DPS)** | Código nacional do serviço, derivado da lista da LC 116 | **Falta** | Serviço | **Contador** |
| `ItemListaServico` (ex.: "17.05") | **Sim (ABRASF)** | Subitem da LC 116/2003 | **Falta** | Serviço | **Contador** |
| `cTribMun` / `CodigoTributacaoMunicipio` | Município (GissOnline Santos/Praia Grande e ISS.net exigem) | Código do serviço **na tabela de cada prefeitura** | **Falta** | **Serviço × Município/Empresa** (o mesmo serviço tem código diferente em cada cidade) | Contador/prefeitura |
| `CodigoCnae` | Município | CNAE do serviço | Falta | Serviço × Empresa | Contador |
| `cNBS` / `CodigoNbs` (9 dígitos) | **Sim no GissOnline (1-1)**; necessário para IBS/CBS | Nomenclatura Brasileira de Serviços | **Falta** | Serviço | Contador |
| `xDescServ` / `Discriminacao` (até 2000 caracteres) | Sim | Texto da nota | **Parcial** (`Servico.Nome`, `ItemProposta.Descricao`, `Movimento.Descricao`). Falta montar o texto padrão: período, posto/local, nº da proposta/contrato, retenções destacadas | Serviço (texto modelo) + Lançamento | Sistema/usuário |
| `cIntContrib` | Não | Código interno do serviço | **Tem** (`Servico.Id`) | Serviço | Sistema |
| `cLocPrestacao` / `Servico.CodigoMunicipio` | **Sim** | Município (IBGE) **onde o serviço foi prestado** | **Falta** (nem a proposta nem o lançamento guardam o local; `Cliente.Cidade` serve de padrão, mas na terceirização o posto pode ficar em outra cidade) | **Proposta/Lançamento** (ou "local de prestação" do contrato) | Usuário |
| `MunicipioIncidencia` | 0-1 (ABRASF) | Onde o ISS é devido (regra da LC 116, art. 3º) | Falta (calcular pela regra do serviço) | Regra no Serviço | Sistema |
| `cPaisPrestacao` / `CodigoPais` | Cond. (exterior) | País da prestação | Falta | Lançamento | Usuário |
| `tribISSQN` / `ExigibilidadeISS` | Sim | 1 tributável/exigível; 2 imunidade; 3 exportação; 4 não incidência (DPS). No ABRASF de 1 a 7, incluindo isenção e suspensão | **Falta** (padrão 1) | Serviço | Contador |
| `exigSusp` / `NumeroProcesso`, `IdentifNaoExigibilidade`, `tpImunidade`, `BM` (benefício municipal) | Cond. | Suspensão judicial ou benefício | Falta | Empresa/Serviço | Contador |
| `obra` / `ConstrucaoCivil`, `atvEvento` / `Evento` | Cond. (construção civil, eventos) | — | N/A | — | — |
| `comExt` (mdPrestacao, vincPrest, tpMoeda, vServMoeda, mecAFComexP/T, movTempBens, mdic) | Cond. (exportação de serviço) | Comércio exterior | N/A hoje (possível para a Sinesta se vender software para o exterior) | Lançamento | Usuário |

### B.5 Valores e retenções

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `vServ` / `ValorServicos` | **Sim** | Valor bruto do serviço | **Tem** (`Movimento.Valor`; na origem, `ItemProposta.PrecoFinal`) | Lançamento | Sistema |
| `vDescIncond` / `DescontoIncondicionado` | Não | Desconto dado na nota; **reduz a base do ISS** | **Parcial**: o `ItemProposta.Desconto` da precificação já está embutido no preço e o `Movimento.Desconto` é aplicado na baixa. Falta definir qual desconto vai para a nota | Lançamento | Sistema/contador |
| `vDescCond` / `DescontoCondicionado` | Não | Desconto ligado a uma condição (ex.: pontualidade); **não reduz a base** | Parcial (idem) | Lançamento | Sistema |
| `vDedRed` / `ValorDeducoes` + `Deducao` | Cond. (só onde o município permite) | Deduções da base do ISS (materiais, subempreitada...) | Falta | Lançamento | Contador |
| `tpRetISSQN` / `IssRetido` + `ResponsavelRetencao` | **Sim** | ISS retido pelo tomador? 1 não retido, 2 retido pelo tomador, 3 retido pelo intermediário | **Parcial**: existe `Empresa.Iss.Retido`, mas é **fixo por empresa**, e a retenção depende do serviço, do tomador e do município | Regra Serviço × Cliente, com ajuste no Lançamento | Contador |
| `vRetCP` / `ValorInss` | Cond. (**cessão de mão de obra: 11%**) | Retenção de INSS feita pelo tomador | **Parcial** (`Empresa.Inss` tem alíquota e "retido", mas não tem a regra por serviço, as deduções da base nem o tomador PF, que não retém) | Serviço (flag de cessão de mão de obra) + Lançamento | Sistema/contador |
| `vRetIRRF` / `ValorIr` | Cond. | IR retido (1% em limpeza/vigilância/locação de mão de obra; 1,5% em serviços profissionais) | **Parcial** (`Empresa.Ir`) | Serviço + Cliente (só PJ retém) | Contador |
| `vRetCSLL` / `ValorCsll` | Cond. | CSLL retida (parte dos 4,65% de PIS/COFINS/CSLL) | **Parcial** (`Empresa.Csll`) | Serviço + Cliente | Contador |
| `tpRetPisCofins`, `vPis`, `vCofins` (grupo `tribFed`) | Cond. | PIS/COFINS próprios ou retidos | **Parcial** (`Empresa.Pis/Cofins`) | Serviço + Cliente | Contador |
| `OutrasRetencoes` | Não | Outras | N/A | — | — |
| `ValorLiquidoNfse` (calculado pela prefeitura) | — | Valor bruto − retenções − descontos. **É o que o cliente paga** e deveria virar o valor a receber | **Falta** (o `Movimento` não separa bruto, retenções e líquido) | Lançamento | Sistema |
| `vReceb` (intermediário) | Cond. | — | N/A | — | — |

### B.6 Tributação municipal (ISS)

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `pAliq` / `Aliquota` | Cond. (obrigatória com ISS retido ou no Simples; nos outros casos o município calcula) | Alíquota do ISS (entre 2% e 5%) | **Parcial**: `Empresa.Iss.Aliquota` é **uma só por empresa**, mas a alíquota varia **por serviço e pelo município de incidência** | Tabela Serviço × Município (alíquota) | Contador |
| `BaseCalculo`, `ValorIss` | Calculados pelo município | — | — | Guardar o retorno na NotaFiscal | Sistema |
| `Iss.ReducaoBase` | — | Redução da base | **Tem** (no cálculo de preço) | Empresa | Contador |

### B.7 Tributos federais (informativos na nota, exceto as retenções do B.5)

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `CST` PIS/COFINS (grupo `tribFed`/`piscofins`) | Sim quando o grupo é informado | Situação tributária (Lucro Presumido cumulativo costuma ser "01"; **confirmar**) | Falta | Empresa (padrão) ou Serviço | Contador |
| `vBCPisCofins`, `pAliqPis`, `pAliqCofins`, `vPis`, `vCofins` | Não | Base, alíquotas e valores | **Parcial** (alíquotas em `Empresa.Pis/Cofins`) | Sistema calcula | Sistema |
| `pTotTrib` (Fed/Est/Mun) **ou** `vTotTrib` **ou** `indTotTrib` | Sim na DPS (um dos três) | Carga aproximada de tributos (Lei 12.741/2012, "Lei da Transparência") | **Parcial** (calculável a partir de `Empresa.ImpostosSobreReceita()`) | Sistema | Sistema |

### B.8 IBS/CBS (reforma tributária)

| Campo | Obrigatório? | O que é | Situação | Onde está / deveria ficar | Quem informa |
|---|---|---|---|---|---|
| `finNFSe` | Sim | Finalidade (0 = regular) | Falta (constante) | — | Sistema |
| `indFinal` | Sim | Consumo pessoal (ver B.3) | Parcial | Cliente | Sistema |
| `cIndOp` (6 dígitos) | Sim | Código indicador da operação (tabela oficial; define o local de incidência do IBS/CBS) | **Falta** | Serviço | **Contador** |
| `tpOper`, `tpEnteGov`, `pRedutor` | Cond. (governo) | Operação com ente público | Falta | Cliente/Lançamento | Contador |
| `indDest` / `dest` | Sim | Destinatário igual ao tomador? | Falta (padrão 0) | Lançamento | Sistema |
| `CST` IBS/CBS (3 dígitos) | **Sim** | Situação tributária do IBS/CBS | **Falta** | Serviço | **Contador** |
| `cClassTrib` (6 dígitos) | **Sim** | Classificação tributária (tabela oficial ligada ao CST) | **Falta** | Serviço | **Contador** |
| `cLocalidadeIncid` (GissOnline) | Sim no GissOnline | IBGE do local de incidência do IBS/CBS | Falta (sai do local de prestação + `cIndOp`) | Lançamento | Sistema |
| `vBC` | Calculado | Base do IBS/CBS. **Em 2026**: vServ − desconto incondicionado − deduções − ISS − PIS − COFINS | Falta (calcular) | Sistema | Sistema |
| Alíquotas IBS UF / IBS Mun / CBS | Informadas ou calculadas | Em 2026 é ano de teste: CBS 0,9% e IBS 0,1%, compensáveis com PIS/COFINS. Confirmar a divisão estadual/municipal | **Tem** (`Empresa.IbsMunicipal/IbsEstadual/Cbs`). A partir de 2027 a alíquota é a do **destino**, e uma por empresa deixa de servir | Hoje Empresa; depois tabela por localidade | Contador |
| Diferimento/redução (`pDif*`, redução de alíquota) | Cond. | Benefícios da LC 214 | Falta | Serviço | Contador |

> **Atenção (manual GissOnline):** o manual define os tipos `tcIBSCBS`, `tctribFed`, `pTotTrib` e `tccomExt`, mas a tabela de `tcInfDeclaracaoPrestacaoServico` **não mostra em que ponto do XML eles entram**. Para isso é preciso baixar o **XSD da GissOnline**. O `tcIBSCBS` do manual também não traz os campos de alíquota e valor de IBS/CBS, o que indica que o município calcula; isso precisa ser confirmado na homologação.

### B.9 Configuração técnica

| Item | Obrigatório? | O que é | Situação | Onde deveria ficar | Quem informa |
|---|---|---|---|---|---|
| **Certificado digital A1** (.pfx + senha) | **Sim** (todos os sistemas) | Assina o XML e autentica a conexão (TLS 1.2 com certificado do cliente). ICP-Brasil, tipo A (A1 ou A3; para servidor, só A1 é viável). O da matriz serve para a filial com a **mesma raiz de CNPJ** | **Falta** | Configuração por empresa, guardado **criptografado** (nunca no banco em texto puro), com alerta de vencimento | Cliente (compra) |
| Padrão/provedor por município + URLs | Sim | Santos/Praia Grande: GissOnline (`https://ws-<municipio>.giss.com.br/service-ws/nf/nfse-ws?wsdl`); São Vicente: ISS.net (ABRASF 2.04); SP: Nota Paulistana; Simples: Sefin Nacional | **Falta** | Configuração (ou chave da API agregadora) | Sistema |
| Ambiente de homologação | Sim | GissOnline: `https://v2-ws-homologacao.giss.com.br/service-ws/nf/nfse-ws?wsdl` (regras e alíquotas **diferentes** da produção). ISS.net: `homologaabrasf` (acesso restrito a alguns planos). Nacional: "produção restrita" | Falta | Configuração | Sistema |
| Credenciamento/liberação do webservice | Sim | GissOnline: cadastro no portal do município. ISS.net: pedido por e-mail a `suporte@notacontrol.com.br` com CNPJ, IM, razão social e endereço, e **autorização de RPS** no ISS.net Online. Praia Grande exige autorização prévia de acesso e numeração | **Falta** | — | Cliente/contador |
| Série e próximo número do RPS | Sim | Controle da sequência (alguns municípios exigem "AIDF/autorização de RPS") | Falta | Configuração por empresa | Prefeitura/contador |
| Assinatura XML | Sim | GissOnline: XMLDSig **RSA-SHA1**, c14n, assinatura do lote inteiro. No nacional o algoritmo deve ser conferido na documentação | Falta | Código da integração | Sistema |
| Versão do leiaute | Sim | ABRASF 2.04 + RTC (GissOnline v1.7); DPS v1.01 no nacional | Falta | Configuração | Sistema |
| Login do portal / token / chave de API | Cond. | Se usar agregador: chave por conta e certificado enviado ao agregador | Falta | Configuração (segredo) | Cliente |
| Envio da nota ao cliente | Desejável | PDF/XML por e-mail aos contatos com `RecebeNotaFiscal` | **Parcial** (a flag existe, o envio não) | — | Sistema |

---

## c) O que FALTA, por onde implementar

**Prioridades:** **P1** = sem isto não sai nota · **P2** = necessário para a nota sair certa (retenções e IBS/CBS) · **P3** = melhoria.

Todas as mudanças de banco devem ser **aditivas, com valor padrão** (regra do projeto: sem perda de dados).

### Cadastro da Empresa
- **P1**: gravar o **código IBGE do município** (`CidadeIbge`) além do texto "Cidade - UF". Endereço completo e IM já estão sendo adicionados agora.
- **P1**: `RegimeEspecialTributacao` (padrão 0 = nenhum) e `IncentivoFiscal` (padrão Não).
- **P2**: `regApTribSN` (só para Simples/MEI), CST PIS/COFINS padrão, telefone/e-mail fiscal.
- **P2**: deixar `Iss.Retido`, `Inss.Retido` etc. como **padrão sugerido**, porque a decisão real é por serviço e tomador.
- **P3**: alerta de vencimento do certificado.

### Cadastro do Cliente
- **P1**: gravar o **código IBGE** (a `ConsultaPublicaService` já recebe o IBGE pelo CNPJ e pelo CEP; basta guardar).
- **P1**: tornar o **endereço obrigatório** para emitir nota e montar um saneamento dos cadastros antigos.
- **P2**: "Retém impostos?" (PJ retém, PF não; condomínio e órgão público seguem regras próprias), esfera de governo (B2G), consumidor final.
- **P3**: cliente do exterior (NIF, país, endereço livre), como já existe no Fornecedor.

### Cadastro do Serviço (o maior buraco: hoje só tem `Nome`)
- **P1**: `ItemListaServico` (LC 116), `cTribNac`, `NBS`, texto padrão da discriminação, `tribISSQN`/exigibilidade.
- **P1**: tabela **Serviço × Empresa/Município**, com `cTribMun`/código municipal, CNAE e **alíquota de ISS**. O mesmo serviço tem códigos e alíquotas diferentes em Santos, São Vicente e Praia Grande.
- **P1**: **regra do local de incidência do ISS** (estabelecimento do prestador, local da execução ou estabelecimento do tomador).
- **P2**: flag **cessão de mão de obra/empreitada** (dispara o INSS 11%), regras de IR/PCC, `CST` e `cClassTrib` do IBS/CBS, `cIndOp`.

### Proposta / Lançamento a receber
- **P1**: **local da prestação** (município IBGE e, de preferência, endereço do posto). Pode vir do Cliente como padrão e ser editado.
- **P1**: **competência como data** e regra para definir qual desconto vai na nota.
- **P1**: entidade **NotaFiscal**, ligada ao `Movimento`, com:
  - RPS (série/número), status, protocolo/lote;
  - nº da NFS-e, código de verificação, chave de acesso;
  - XML/PDF, erros e cancelamento/substituição.
- **P1**: regra de **"uma nota por empresa"**. O `EmpresaId` fica no **item** da proposta, não no cabeçalho, então uma proposta com itens de duas empresas gera duas notas.
- **P2**: separar no lançamento **valor bruto, retenções e líquido**, porque o cliente paga o líquido e a conciliação bancária depende disso.
- **P3**: emissão em lote no fechamento do mês (contratos mensais de terceirização).

### Configuração da integração
- **P1**: decidir entre **agregador** (recomendado) e integração direta.
- **P1**: certificado A1 por empresa (guardado com segurança), ambiente (homologação/produção), série e numeração do RPS, URLs/provedor por município.
- **P1**: credenciamento em cada prefeitura (tarefa do cliente/contador).
- **P2**: tela de status/erros da nota, reenvio, cancelamento e consulta.
- **P3**: envio automático por e-mail aos contatos com `RecebeNotaFiscal`.

---

## d) Perguntas para o contador / cliente

1. **Município da Sinesta**: São Paulo capital (Nota Paulistana), Cajamar (como está no seed) ou outro? Qual o regime? Se for Simples, emite pelo **Emissor Nacional a partir de 01/11/2026**.
2. Para **cada serviço vendido** (portaria, limpeza, conservação, jardinagem, recepção, vigilância, zeladoria, administração de condomínio, desenvolvimento/licenciamento/SaaS/suporte), qual é:
   - o **subitem da LC 116** e o **cTribNac**;
   - o **código de tributação municipal** em Santos, São Vicente e Praia Grande;
   - o **CNAE** e o **NBS**?
3. **Alíquota de ISS** de cada serviço em cada município (inclusive nos municípios dos clientes, quando o ISS é devido no local da prestação).
4. **Município de incidência**: em quais serviços o ISS vai para o município do cliente ou do posto? (ver item e). Existe cliente com posto em cidade diferente da sede?
5. **Retenção de ISS**: em quais municípios e serviços o tomador PJ ou o condomínio é responsável por reter? Isso muda quando prestador e tomador estão no mesmo município?
6. **INSS 11% (cessão de mão de obra)**:
   - quais serviços entram;
   - se o contrato discrimina materiais/equipamentos para deduzir da base;
   - se há deduções de vale-transporte/alimentação;
   - qual percentual mínimo de base se aplica;
   - se condomínio edilício retém (em regra sim, porque é equiparado a empresa para o INSS; confirmar).
7. **IRRF e PIS/COFINS/CSLL (4,65%)**: quais tomadores retêm? Condomínio retém PCC/IR? Qual tratamento para órgão público (IN RFB 1.234/2012)?
8. **CST PIS/COFINS** (Lucro Presumido cumulativo) e **CST/cClassTrib/cIndOp de IBS/CBS** por serviço. Como fica a divisão IBS estadual/municipal em 2026?
9. **Regime especial de tributação** e **incentivo fiscal** de cada empresa (esperado: nenhum).
10. **Competência**: usar o mês do serviço (dia 1º) ou a data de fim do período? Emitir no fechamento do mês ou na aprovação da proposta?
11. **Descontos**: o desconto comercial da proposta entra na nota (incondicionado) ou o preço já sai líquido?
12. Cada empresa já tem **certificado A1**? Quem renova? Matriz e filiais têm a mesma raiz de CNPJ?
13. As empresas já emitem hoje (portal ou outro ERP)? **Qual o último número de RPS/nota e a série**, para continuar a sequência sem duplicar?
14. Alguma empresa vende para o **exterior** (exportação de serviço, comExt) ou para **governo**?

---

## e) Observações específicas

### Terceirização de mão de obra (BM Terceirização, VRM, MB Condomínios)

**Enquadramento na LC 116.** Depende do contrato e precisa ser confirmado com o contador:
- **17.05**: fornecimento de mão de obra, inclusive temporária.
- **7.10**: limpeza, manutenção e conservação de imóveis.
- **7.11**: jardinagem.
- **11.02**: vigilância, segurança ou monitoramento (exige autorização da Polícia Federal).
- **Portaria/recepção** costuma cair em 17.05, mas há municípios que enquadram em outros itens.
- **Administração de condomínio** (se a MB fizer isso) é 17.12.

**Local do ISS (LC 116, art. 3º).**
- Em **17.05** o ISS é devido no **estabelecimento do tomador** da mão de obra.
- Em **7.10, 7.11 e 11.02** é devido no **local da execução** (imóvel ou bens).
- Exemplo: a BM (São Vicente) limpando um condomínio em Santos gera **ISS para Santos**, com a **alíquota de Santos** e, em geral, **retido pelo tomador**. A nota continua sendo emitida **no sistema de São Vicente**, porque é o município do prestador.
- Por isso o **local da prestação** na proposta/lançamento é P1, e a alíquota não pode ser única por empresa.
- O ISS tem alíquota mínima de 2% e máxima de 5%.

**INSS 11%** (Lei 8.212/91, art. 31; IN RFB 2.110/2022).
- O tomador PJ (e equiparados) retém 11% do valor bruto da nota em cessão de mão de obra/empreitada. Limpeza, conservação, vigilância, portaria e recepção estão na lista.
- A nota precisa **destacar** a retenção (`vRetCP`/`ValorInss`).
- Pode haver **deduções da base** (materiais e equipamentos discriminados em contrato e na nota) e **bases mínimas** por atividade.
- O prestador compensa o valor na DCTFWeb, e a retenção aparece na EFD-Reinf.
- **O ELROND precisa calcular e mostrar o líquido**, senão o valor a receber fica errado.

**IRRF 1%** (limpeza, conservação, segurança/vigilância, locação de mão de obra) e **PCC 4,65%** (PIS 0,65% + COFINS 3% + CSLL 1%, Lei 10.833/2003, art. 30) quando o tomador é PJ. Existem dispensas para valores pequenos. Para condomínio como tomador, a regra de PCC/IR **não está clara para mim** e deve ser confirmada.

**Contratos mensais.** O normal é uma nota por contrato por mês, com competência = mês do serviço e discriminação com período, posto e quantitativo. Isso puxa a ideia de **emissão em lote no fechamento**.

**IBS/CBS.** Os serviços gerais da LC 116 estão no **Grupo 1**: preenchimento exigido **desde 01/10/2026**, sem rejeição até 31/12/2026.

### Software / tecnologia (Sinesta)

**Itens 1.xx da LC 116:**
- 1.01: análise e desenvolvimento de sistemas;
- 1.02: programação;
- 1.03: processamento, armazenamento ou hospedagem de dados;
- 1.04: elaboração de programas;
- 1.05: licenciamento ou cessão de uso de software;
- 1.06: assessoria e consultoria em informática;
- 1.07: suporte técnico, instalação, configuração e manutenção;
- 1.08: páginas eletrônicas;
- 1.09: conteúdo pela internet.

**SaaS** tem enquadramento discutido (1.03 ou 1.05), e a decisão é do contador.

**Local do ISS:** como regra, o **estabelecimento do prestador** (município da Sinesta), sem o problema de local da prestação da terceirização.

**IBS/CBS:** os subitens **1.03, 1.05 e 1.09** estão no **Grupo 2**, com IBS/CBS exigido a partir de **01/12/2026**. Os demais 1.xx estão no Grupo 1 (01/10/2026).

**Retenções:** "programação" e consultoria estão na lista de serviços profissionais com **IRRF 1,5%** (art. 714 do RIR/2018). PCC de 4,65% quando o tomador é PJ. Confirmar para cada tipo de contrato; licença de software tem tratamento diferente.

**Exportação de software:** `tribISSQN = 3` (exportação) e grupo `comExt`. Só se houver cliente no exterior.

**Se a Sinesta estiver em São Paulo capital:** a Nota Paulistana tem leiaute próprio (webservice manual 3.3.4, leiaute v2 com IBS/CBS). É **mais uma integração**, o que reforça a recomendação de usar um agregador.

---

## f) NF-e (nota de produto) — visão rápida

*Incluí porque o ELROND já trata NF-e como forma de cobrança (`FormaCobranca = 'nfe'` no simulador) e tem ICMS por UF na Empresa. É um levantamento resumido. CT-e (frete) também aparece no simulador, mas ficou fora deste estudo.*

**Como funciona:** a NF-e (modelo 55, leiaute 4.00 + grupo IBS/CBS da NT 2025.002) é emitida na **SEFAZ do estado** (aqui, SEFAZ-SP), com o **mesmo certificado A1**. Há um padrão único nacional, sem variação por município.

| Grupo | Campos principais | Situação no ELROND |
|---|---|---|
| Identificação | natureza da operação, série, número, dhEmi, tipo (entrada/saída), destino (interna/interestadual), finalidade, consumidor final, presença do comprador | **Falta** tudo (sem numeração nem série de NF-e) |
| Emitente | CNPJ, razão social, endereço com IBGE, **IE (obrigatória)**, **CRT** (1 Simples, 2 Simples com excesso, 3 normal, 4 MEI) | CNPJ/razão: **Tem**. Endereço/IE: **Adicionado agora**. IBGE: **Parcial**. CRT: sai do `Regime` |
| Destinatário | CNPJ/CPF, nome, endereço com IBGE, **indIEDest** (1 contribuinte, 2 isento, 9 não contribuinte), IE, e-mail | Quase tudo **Tem** no Cliente. `indIEDest`: **Falta**. IBGE: **Parcial** |
| Produto (por item) | código, descrição, **NCM**, CEST, **CFOP**, unidade, quantidade, valor unitário, GTIN ("SEM GTIN") | **Falta**: o ELROND **não tem cadastro de produto** (só serviços e fichas técnicas) |
| Impostos (por item) | ICMS (**origem, CST ou CSOSN**, base, alíquota; DIFAL para não contribuinte de outra UF), IPI (se houver), PIS/COFINS (CST), **IBS/CBS (CST, cClassTrib)** | Alíquota de ICMS por UF: **Tem** (`EmpresaIcms`). CST/CSOSN/origem/NCM: **Falta** |
| Transporte / pagamento | modalidade do frete, transportadora, volumes; forma de pagamento (tPag) e valor | Forma de pagamento: **Parcial** (texto no Cliente/Proposta). Frete: **Falta** |

**Conclusão NF-e:** é um projeto à parte e maior que a NFS-e, porque exige cadastro de produtos com NCM/CFOP/CST. Faz sentido só se alguma empresa do grupo vender mercadoria. Para terceirização e software, a necessidade é a NFS-e.

---

## Fontes

- Manual local: `C:\Users\Ricardo\Desktop\Projeto EREBOR\ELROND\Manual Técnico - Serviços Prestados - V1.7.pdf` (GissOnline, v1.7 de 21/09/2026)
- [CNM – NT CTAT 09/2025: adesão ao padrão nacional da NFS-e](https://cnm.org.br/biblioteca/exibe/16142)
- [TCE-PI – municípios têm até 01/01/2026 para o padrão nacional](https://www.tcepi.tc.br/tce-pi-alerta-municipios-tem-ate-1o-de-janeiro-de-2026-para-adequacao-ao-padrao-nacional-da-nfs-e/)
- [Fiscal.io – LC 214/2025 e NFS-e (art. 62: emissor nacional ou sistema próprio integrado ao ADN)](https://conteudo.fiscal.io/lc-214-2025-nfs-e/)
- [gov.br/nfse – Documentação técnica atual](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual) · [RTC – produção restrita](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc-producao-restrita-piloto) · [NT 004 – novo leiaute RTC v2.00](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc-producao-restrita-piloto/nt-004-se-cgnfse-novo-layout-rtc-v2-00-20251210.pdf)
- [Focus NFe – campos da DPS nacional (EmissaoDPSXml)](https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html)
- [Buscador NCM – tabelas da NFS-e nacional (cTribNac, cLocPrestacao)](https://buscadorncm.com.br/nfse)
- [Contábeis – IBS/CBS na NFS-e exigidos a partir de outubro/2026](https://www.contabeis.com.br/noticias/79768/nfs-e-informacoes-de-ibs-e-cbs-passam-a-ser-exigidas-em-outubro/)
- [CRC-MS – prazos de IBS/CBS e regra de não rejeição em 2026](https://crcms.org.br/nfs-e-comite-esclarece-prazos-para-ibs-e-cbs-e-regra-de-nao-rejeicao-em-2026/)
- [Prefeitura de SP – Emissor Nacional obrigatório (autônomos 03/08/2026; Simples 01/11/2026)](https://prefeitura.sp.gov.br/web/fazenda/w/usoemissornacional)
- [Serpro – São Paulo adere ao padrão nacional (ADN, 22/12/2025)](https://www.serpro.gov.br/menu/noticias/noticias-2026/sp-adere-nota-fiscal-de-servicos)
- [Nota Fiscal Paulistana – Reforma tributária (leiaute v2 com IBS/CBS)](https://notadomilhao.sf.prefeitura.sp.gov.br/reforma-tributaria/)
- [Focus NFe – Santos (GissOnline, ABRASF, certificado)](https://focusnfe.com.br/guides/nfse/municipios-integrados/santos-sp/) · [Portal GissOnline Santos](https://santos.giss.com.br/portal/)
- [Focus NFe – Praia Grande (GissOnline)](https://focusnfe.com.br/blog/como-emitir-nota-fiscal-de-servico-nfse-em-praia-grande-sp/) · [Portal GissOnline Praia Grande](https://praiagrande.giss.com.br/). *Obs.: uma fonte secundária cita ISS.net para Praia Grande; o portal oficial é GissOnline. Confirmar.*
- [Focus NFe – São Vicente (ISS.net, ABRASF)](https://focusnfe.com.br/guides/nfse/municipios-integrados/sao-vicente-sp/) · [ISS.net São Vicente](https://www.issnetonline.com.br/saovicente/) · [eNotas – liberação de integração no provedor Nota Control/ISS.net](https://atendimento.enotas.com.br/hc/pt-br/articles/35773567263245--Provedor-Nota-Control-ISS-NET-Como-solicitar-libera%C3%A7%C3%A3o-para-emiss%C3%A3o-de-NFS-e-via-integra%C3%A7%C3%A3o)
- Legislação citada de memória (conferir o texto vigente): LC 116/2003 (lista e art. 3º), Lei 8.212/91 art. 31, IN RFB 2.110/2022, Lei 10.833/2003 art. 30, Decreto 9.580/2018 (RIR) arts. 714 e 716, Lei 12.741/2012, LC 214/2025.
