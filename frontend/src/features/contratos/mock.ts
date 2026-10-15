import type { ComponenteContrato, Contrato, CondicoesContrato, DocumentoVinculado, FaturaContrato, ItemEscopo, SituacaoFatura } from './types'

/**
 * Dados de EXEMPLO do protótipo (Mirai Matriz e Filial). Nada aqui vem do banco.
 * "Hoje" do protótipo é a data real; as faturas são montadas em volta dela.
 */

const condicoesPadrao: CondicoesContrato = {
  diaFaturamento: 1,
  referencia: 'mes-anterior',
  diaVencimento: 10,
  anteciparFimDeSemana: true,
  renovacaoAutomatica: true,
  avisoPrevioDias: 60,
  reajusteIndice: 'IPCA',
  reajusteMesBase: 6,
  multaRescisoria: '3 mensalidades, proporcional ao tempo restante',
  carteira: 'Sicredi · Matriz',
  formaCobranca: 'Boleto com Pix',
  prazoPagamentoDias: 9,
}

const item = (id: string, servico: string, descricao: string, quantidade: number, unidade: string, valorUnitario: number, custoUnitario: number): ItemEscopo => ({
  id, servico, descricao, quantidade, unidade, valorUnitario, custoUnitario,
})

const somaItens = (itens: ItemEscopo[]) => Math.round(itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0) * 100) / 100

const hoje = new Date()
const mesHoje = hoje.getFullYear() * 12 + hoje.getMonth()
const comp = (indiceMes: number) => `${Math.floor(indiceMes / 12)}-${String((indiceMes % 12) + 1).padStart(2, '0')}`
const venc = (indiceMes: number, dia: number) => `${comp(indiceMes)}-${String(dia).padStart(2, '0')}`
const indiceDe = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1

/**
 * Faturas de um recorrente, do início até o mês que vem. As antigas estão recebidas, a do mês
 * corrente está no ciclo (situação informada) e a do mês que vem está prevista.
 */
function faturasRecorrentes(inicio: string, valor: number, nfInicial: number, situacaoDoMes: SituacaoFatura, extrasDoMes = 0, fim?: string): FaturaContrato[] {
  const primeira = indiceDe(inicio) + 1 // fatura no mês seguinte ao início (referência: mês anterior)
  const ultima = Math.min(mesHoje + 1, fim ? indiceDe(fim) + 1 : Infinity)
  const lista: FaturaContrato[] = []
  for (let m = primeira, n = nfInicial; m <= ultima; m++, n++) {
    const situacao: SituacaoFatura = m < mesHoje ? 'recebida' : m === mesHoje ? situacaoDoMes : 'prevista'
    const emitida = ['nf-emitida', 'boleto-emitido', 'recebida', 'atrasada'].includes(situacao)
    lista.push({
      // Dois contratos podem começar no mesmo dia: o valor desempata o id.
      id: `f-${inicio}-${valor}-${m}`,
      competencia: comp(m),
      vencimento: venc(m, 10),
      previsto: valor,
      extras: m === mesHoje ? extrasDoMes : 0,
      descontos: 0,
      situacao,
      nf: emitida ? String(n) : undefined,
      boleto: ['boleto-emitido', 'recebida', 'atrasada'].includes(situacao) ? `000${n}`.slice(-6) : undefined,
      recebidoEm: situacao === 'recebida' ? venc(m, 9) : undefined,
    })
  }
  return lista
}

const arubaItens = [
  item('a1', 'Terceirização de mão de obra', 'Auxiliar de limpeza · escala 6x1 · 7h20', 2, 'posto', 6850, 5390),
  item('a2', 'Terceirização de mão de obra', 'Auxiliar de limpeza extra · 1x por semana', 1, 'posto', 2100, 1610),
  item('a3', 'Portaria', 'Portaria 24h · escala 12x36', 1, 'posto', 14769.87, 12105),
  item('a4', 'Terceirização de mão de obra', 'Zelador(a) · escala 6x1 · 7h20', 1, 'posto', 6550, 5280),
]

const BASE: Contrato[] = [
  {
    id: 'c1',
    numero: 'MIR-0001',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Residencial Aruba',
    clienteDocumento: '12.345.678/0001-90',
    contato: 'Síndica Márcia · (13) 99812-4410',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2026-06-01',
    fim: '2030-01-31',
    propostaNumero: 'MS-00012',
    propostaAprovadaEm: '2026-05-20',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: 'PIX: CNPJ 41.627.718/0001-90 · Vencimento: dia 10 de cada mês',
    centroCusto: 'Terceirização',
    responsavel: 'Ricardo',
    escopo: [
      { versao: 1, vigenteDesde: '2026-06-01', motivo: 'Proposta MS-00012 aprovada', itens: arubaItens.slice(0, 3) },
      { versao: 2, vigenteDesde: '2026-09-01', motivo: 'Aditivo 1: inclusão de zelador(a)', itens: arubaItens },
    ],
    condicoes: condicoesPadrao,
    faturas: faturasRecorrentes('2026-06-01', somaItens(arubaItens), 1148, 'a-conferir', 456),
    extras: [
      { id: 'e1', data: '2026-10-04', tipo: 'hora-extra', descricao: 'Portaria: cobertura de falta (12h)', quantidade: 12, valorUnitario: 38, cobranca: 'proxima-fatura', lancadoPor: 'Jéssica' },
      { id: 'e2', data: '2026-10-11', tipo: 'custo-extra', descricao: 'Material de limpeza pós-reforma do salão', quantidade: 1, valorUnitario: 320, cobranca: 'separado', lancadoPor: 'Jéssica' },
      { id: 'e3', data: '2026-09-18', tipo: 'hora-extra', descricao: 'Limpeza extra: evento no salão de festas (6h)', quantidade: 6, valorUnitario: 34, cobranca: 'proxima-fatura', faturadoEm: '2026-10', lancadoPor: 'Jéssica' },
      { id: 'e4', data: '2026-08-27', tipo: 'ocorrencia', descricao: 'Troca de colaborador na portaria a pedido do cliente', quantidade: 0, valorUnitario: 0, cobranca: 'nao-cobrar', lancadoPor: 'Ricardo' },
    ],
    documentos: [
      { id: 'd1', nome: 'Contrato assinado - Residencial Aruba.pdf', tipo: 'contrato', data: '2026-05-28', tamanho: '412 KB' },
      { id: 'd2', nome: 'Aditivo 1 - inclusão de zelador.pdf', tipo: 'aditivo', data: '2026-08-22', tamanho: '188 KB' },
      { id: 'd3', nome: 'Proposta MS-00012.pdf', tipo: 'proposta', data: '2026-05-20', tamanho: '1,2 MB' },
    ],
    eventos: [
      { data: '2026-10-11', tipo: 'extra', texto: 'Custo extra lançado: material de limpeza (R$ 320,00, cobrança separada)', quem: 'Jéssica' },
      { data: '2026-10-04', tipo: 'extra', texto: 'Hora extra lançada: portaria, 12h (entra na próxima fatura)', quem: 'Jéssica' },
      { data: '2026-10-09', tipo: 'fatura', texto: 'Fatura de set/2026 recebida (NF 1151)', quem: 'sistema' },
      { data: '2026-09-01', tipo: 'aditivo', texto: 'Aditivo 1 em vigor: inclusão de zelador(a) (+ R$ 6.550,00/mês)', quem: 'Ricardo' },
      { data: '2026-08-22', tipo: 'documento', texto: 'Aditivo 1 assinado e anexado', quem: 'Ricardo' },
      { data: '2026-06-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00012)', quem: 'Ricardo' },
    ],
    margemRealizada: 0.168,
  },
  {
    id: 'c2',
    numero: 'MIR-0002',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Edifício Residencial Beatriz',
    clienteDocumento: '23.456.789/0001-01',
    contato: 'Adm. Predial Costa · (13) 3473-1100',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2026-05-01',
    fim: '2027-04-30',
    propostaNumero: 'MS-00009',
    propostaAprovadaEm: '2026-04-15',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: '',
    centroCusto: 'Terceirização',
    responsavel: 'Jéssica',
    escopo: [{ versao: 1, vigenteDesde: '2026-05-01', motivo: 'Proposta MS-00009 aprovada', itens: [
      item('b1', 'Terceirização de mão de obra', 'Auxiliar de limpeza · escala 5x2', 1, 'posto', 6219.5, 4980),
      item('b2', 'Portaria', 'Porteiro diurno · escala 6x1', 1, 'posto', 8650, 7010),
    ] }],
    condicoes: { ...condicoesPadrao, reajusteMesBase: 5, renovacaoAutomatica: false },
    faturas: faturasRecorrentes('2026-05-01', 14869.5, 1138, 'nf-emitida'),
    extras: [],
    documentos: [{ id: 'd4', nome: 'Contrato assinado - Ed. Beatriz.pdf', tipo: 'contrato', data: '2026-04-25', tamanho: '398 KB' }],
    eventos: [
      { data: '2026-10-02', tipo: 'fatura', texto: 'NF 1160 emitida (competência out/2026)', quem: 'sistema' },
      { data: '2026-05-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00009)', quem: 'Jéssica' },
    ],
    margemRealizada: 0.171,
  },
  {
    id: 'c3',
    numero: 'MIR-0003',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Edifício Residencial Gomes House',
    clienteDocumento: '34.567.890/0001-12',
    contato: 'Síndico Paulo · (13) 98100-2233',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2025-11-01',
    fim: '2026-11-30',
    propostaNumero: 'MS-00003',
    propostaAprovadaEm: '2025-10-20',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: '',
    centroCusto: 'Terceirização',
    responsavel: 'Ricardo',
    escopo: [{ versao: 1, vigenteDesde: '2025-11-01', motivo: 'Proposta MS-00003 aprovada', itens: [
      item('g1', 'Terceirização de mão de obra', 'Auxiliar de limpeza · escala 6x1', 2, 'posto', 5480, 4410),
      item('g2', 'Portaria', 'Portaria noturna · escala 12x36', 1, 'posto', 7063.35, 5790),
    ] }],
    condicoes: { ...condicoesPadrao, reajusteMesBase: 11, renovacaoAutomatica: false, avisoPrevioDias: 30 },
    faturas: faturasRecorrentes('2025-11-01', 18023.35, 1100, 'boleto-emitido', 0, '2026-11-30'),
    extras: [],
    documentos: [{ id: 'd5', nome: 'Contrato assinado - Gomes House.pdf', tipo: 'contrato', data: '2025-10-28', tamanho: '402 KB' }],
    eventos: [
      { data: '2026-10-02', tipo: 'fatura', texto: 'Boleto 001167 emitido (NF 1167)', quem: 'sistema' },
      { data: '2025-11-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00003)', quem: 'Ricardo' },
    ],
    margemRealizada: 0.149,
  },
  {
    id: 'c4',
    numero: 'MIR-0004',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Residencial Jardins do Forte',
    clienteDocumento: '45.678.901/0001-23',
    contato: 'Síndica Helena · (13) 99654-7788',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2025-12-01',
    fim: '2027-11-30',
    propostaNumero: 'MS-00005',
    propostaAprovadaEm: '2025-11-18',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: '',
    centroCusto: 'Terceirização',
    responsavel: 'Jéssica',
    escopo: [{ versao: 1, vigenteDesde: '2025-12-01', motivo: 'Proposta MS-00005 aprovada', itens: [
      item('j1', 'Portaria', 'Portaria 24h · escala 12x36', 1, 'posto', 14100.8, 11720),
      item('j2', 'Terceirização de mão de obra', 'Jardinagem · 2x por semana', 1, 'posto', 4170, 3290),
    ] }],
    condicoes: { ...condicoesPadrao, reajusteMesBase: 12 },
    faturas: faturasRecorrentes('2025-12-01', 18270.8, 1110, 'atrasada'),
    extras: [{ id: 'e5', data: '2026-10-08', tipo: 'custo-extra', descricao: 'Poda de árvore com caminhão (terceiro)', quantidade: 1, valorUnitario: 850, cobranca: 'proxima-fatura', lancadoPor: 'Jéssica' }],
    documentos: [{ id: 'd6', nome: 'Contrato assinado - Jardins do Forte.pdf', tipo: 'contrato', data: '2025-11-26', tamanho: '420 KB' }],
    eventos: [
      { data: '2026-10-11', tipo: 'ocorrencia', texto: 'Fatura de out/2026 venceu sem pagamento: cliente avisado', quem: 'Jéssica' },
      { data: '2025-12-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00005)', quem: 'Jéssica' },
    ],
    margemRealizada: 0.177,
  },
  {
    id: 'c5',
    numero: 'MIR-0005',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Residencial das Acácias III',
    clienteDocumento: '56.789.012/0001-34',
    contato: 'Síndico Roberto · (13) 99701-5522',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2025-11-01',
    fim: '2026-10-31',
    propostaNumero: 'MS-00002',
    propostaAprovadaEm: '2025-10-10',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: '',
    centroCusto: 'Terceirização',
    responsavel: 'Ricardo',
    escopo: [{ versao: 1, vigenteDesde: '2025-11-01', motivo: 'Proposta MS-00002 aprovada', itens: [
      item('ac1', 'Terceirização de mão de obra', 'Limpeza de áreas comuns · 3x por semana', 1, 'posto', 1050, 860),
    ] }],
    condicoes: { ...condicoesPadrao, reajusteMesBase: 11, renovacaoAutomatica: false, avisoPrevioDias: 30 },
    faturas: faturasRecorrentes('2025-11-01', 1050, 1101, 'conferida', 0, '2026-10-31'),
    extras: [],
    documentos: [{ id: 'd7', nome: 'Contrato assinado - Acácias III.pdf', tipo: 'contrato', data: '2025-10-25', tamanho: '305 KB' }],
    eventos: [{ data: '2025-11-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00002)', quem: 'Ricardo' }],
    margemRealizada: 0.181,
  },
  {
    id: 'c6',
    numero: 'MRF-0001',
    empresaId: 'filial',
    empresaNome: 'Mirai - Filial 02',
    clienteNome: 'Distribuidora Litoral Ltda',
    clienteDocumento: '67.890.123/0001-45',
    contato: 'Logística · Fábio · (13) 3361-9000',
    tipoOperacao: 'Armazenagem',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2026-03-01',
    fim: '2028-02-29',
    propostaNumero: 'MF-00004',
    propostaAprovadaEm: '2026-02-12',
    servicoNfse: 'Armazenagem e guarda de bens',
    servicoNfseDetalhe: 'LC 116 11.04 · ISS 3% · Cubatão (SP)',
    textoAdicionalNota: 'Posições contratadas: 120 pallets PBR',
    centroCusto: 'Armazém',
    responsavel: 'Ricardo',
    escopo: [{ versao: 1, vigenteDesde: '2026-03-01', motivo: 'Proposta MF-00004 aprovada', itens: [
      item('w1', 'Armazenagem', 'Posição-pallet PBR (fixa)', 120, 'posição', 42, 29.5),
      item('w2', 'Armazenagem', 'Movimentação (entrada e saída) · pacote mensal', 1, 'pacote', 2400, 1690),
      item('w3', 'Armazenagem', 'Gestão de estoque e inventário', 1, 'mês', 1800, 1150),
    ] }],
    condicoes: { ...condicoesPadrao, carteira: 'Inter · Filial', reajusteIndice: 'IGP-M', reajusteMesBase: 3, diaVencimento: 15 },
    faturas: faturasRecorrentes('2026-03-01', 9240, 2201, 'a-conferir', 1240),
    extras: [{ id: 'e6', data: '2026-10-06', tipo: 'custo-extra', descricao: 'Posições excedentes: 30 pallets por 10 dias', quantidade: 30, valorUnitario: 14, cobranca: 'proxima-fatura', lancadoPor: 'Ricardo' }, { id: 'e7', data: '2026-10-09', tipo: 'hora-extra', descricao: 'Recebimento fora do horário (sábado)', quantidade: 8, valorUnitario: 102.5, cobranca: 'proxima-fatura', lancadoPor: 'Ricardo' }],
    documentos: [{ id: 'd8', nome: 'Contrato de armazenagem - Distribuidora Litoral.pdf', tipo: 'contrato', data: '2026-02-20', tamanho: '640 KB' }],
    eventos: [
      { data: '2026-10-09', tipo: 'extra', texto: 'Hora extra lançada: recebimento no sábado (8h)', quem: 'Ricardo' },
      { data: '2026-03-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MF-00004)', quem: 'Ricardo' },
    ],
    margemRealizada: 0.214,
  },
  {
    id: 'c7',
    numero: 'MRF-0002',
    empresaId: 'filial',
    empresaNome: 'Mirai - Filial 02',
    clienteNome: 'Atacadão Baixada S.A.',
    clienteDocumento: '78.901.234/0001-56',
    contato: 'Compras · Renata · (13) 3229-4400',
    tipoOperacao: 'Transporte',
    modalidade: 'recorrente',
    situacao: 'vigente',
    inicio: '2026-07-01',
    fim: '2027-06-30',
    propostaNumero: 'MF-00007',
    propostaAprovadaEm: '2026-06-18',
    servicoNfse: 'Transporte dedicado (frota à disposição)',
    servicoNfseDetalhe: 'Frete municipal · CT-e por viagem emitido na operação',
    textoAdicionalNota: 'Veículo dedicado: VUC placa FTR4H21',
    centroCusto: 'Transporte',
    responsavel: 'Jéssica',
    escopo: [{ versao: 1, vigenteDesde: '2026-07-01', motivo: 'Proposta MF-00007 aprovada', itens: [
      item('t1', 'Transporte dedicado', 'VUC dedicado com motorista · 22 dias/mês', 1, 'veículo', 16900, 13350),
    ] }],
    condicoes: { ...condicoesPadrao, carteira: 'Inter · Filial', reajusteIndice: 'Negociado', reajusteMesBase: 7, diaVencimento: 20 },
    faturas: faturasRecorrentes('2026-07-01', 16900, 2240, 'prevista'),
    extras: [],
    documentos: [{ id: 'd9', nome: 'Contrato de transporte dedicado - Atacadão.pdf', tipo: 'contrato', data: '2026-06-25', tamanho: '520 KB' }],
    eventos: [{ data: '2026-07-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MF-00007)', quem: 'Jéssica' }],
    margemRealizada: 0.158,
  },
  {
    id: 'c8',
    numero: 'MRF-0014',
    empresaId: 'filial',
    empresaNome: 'Mirai - Filial 02',
    clienteNome: 'Química Cubatão Ltda',
    clienteDocumento: '89.012.345/0001-67',
    contato: 'Expedição · Marcos · (13) 3362-1200',
    tipoOperacao: 'Transporte',
    modalidade: 'spot',
    situacao: 'a-faturar',
    inicio: '2026-10-13',
    fim: '2026-10-13',
    localServico: 'Cubatão (SP) → Jundiaí (SP) · carga fracionada 6 t',
    propostaNumero: 'MF-00021',
    propostaAprovadaEm: '2026-10-10',
    servicoNfse: 'Transporte de cargas (CT-e)',
    servicoNfseDetalhe: 'Documento fiscal da própria viagem (CT-e 80)',
    textoAdicionalNota: '',
    centroCusto: 'Transporte',
    responsavel: 'Jéssica',
    escopo: [{ versao: 1, vigenteDesde: '2026-10-13', motivo: 'Proposta MF-00021 aprovada', itens: [
      item('s1', 'Frete', 'Frete Cubatão → Jundiaí · truck', 1, 'viagem', 3480, 2610),
      item('s2', 'Frete', 'Ajudante para descarga', 1, 'diária', 260, 180),
    ] }],
    condicoes: { ...condicoesPadrao, carteira: 'Inter · Filial', diaVencimento: 0, prazoPagamentoDias: 15, renovacaoAutomatica: false },
    faturas: [{ id: 'f-s1', competencia: '2026-10', vencimento: '2026-10-28', previsto: 3740, extras: 0, descontos: 0, situacao: 'a-conferir' }],
    extras: [],
    documentos: [
      { id: 'd10', nome: 'CT-e 80.xml', tipo: 'cte', data: '2026-10-13', tamanho: '18 KB' },
      { id: 'd11', nome: 'MDF-e 41.xml', tipo: 'mdfe', data: '2026-10-13', tamanho: '12 KB' },
      { id: 'd12', nome: 'Canhoto assinado.jpg', tipo: 'canhoto', data: '2026-10-14', tamanho: '640 KB' },
    ],
    eventos: [
      { data: '2026-10-14', tipo: 'documento', texto: 'Canhoto da entrega anexado', quem: 'Jéssica' },
      { data: '2026-10-13', tipo: 'documento', texto: 'CT-e 80 e MDF-e 41 emitidos na saída', quem: 'sistema' },
      { data: '2026-10-10', tipo: 'assinatura', texto: 'Spot criado a partir da proposta MF-00021', quem: 'Jéssica' },
    ],
    margemRealizada: 0.231,
  },
  {
    id: 'c9',
    numero: 'MRF-0015',
    empresaId: 'filial',
    empresaNome: 'Mirai - Filial 02',
    clienteNome: 'Química Cubatão Ltda',
    clienteDocumento: '89.012.345/0001-67',
    contato: 'Expedição · Marcos · (13) 3362-1200',
    tipoOperacao: 'Transporte',
    modalidade: 'spot',
    situacao: 'faturado',
    inicio: '2026-10-08',
    fim: '2026-10-08',
    localServico: 'Cubatão (SP) → Campinas (SP) · carga fechada 12 t',
    propostaNumero: 'MF-00019',
    propostaAprovadaEm: '2026-10-06',
    servicoNfse: 'Transporte de cargas (CT-e)',
    servicoNfseDetalhe: 'Documento fiscal da própria viagem (CT-e 78)',
    textoAdicionalNota: '',
    centroCusto: 'Transporte',
    responsavel: 'Jéssica',
    escopo: [{ versao: 1, vigenteDesde: '2026-10-08', motivo: 'Proposta MF-00019 aprovada', itens: [item('s3', 'Frete', 'Frete Cubatão → Campinas · carreta', 1, 'viagem', 5950, 4590)] }],
    condicoes: { ...condicoesPadrao, carteira: 'Inter · Filial', diaVencimento: 0, prazoPagamentoDias: 15, renovacaoAutomatica: false },
    faturas: [{ id: 'f-s2', competencia: '2026-10', vencimento: '2026-10-23', previsto: 5950, extras: 0, descontos: 0, situacao: 'boleto-emitido', nf: 'CT-e 78', boleto: '002251' }],
    extras: [],
    documentos: [{ id: 'd13', nome: 'CT-e 78.xml', tipo: 'cte', data: '2026-10-08', tamanho: '17 KB' }, { id: 'd14', nome: 'Canhoto assinado.jpg', tipo: 'canhoto', data: '2026-10-09', tamanho: '580 KB' }],
    eventos: [{ data: '2026-10-09', tipo: 'fatura', texto: 'Boleto 002251 emitido', quem: 'sistema' }, { data: '2026-10-08', tipo: 'documento', texto: 'CT-e 78 emitido na saída', quem: 'sistema' }],
    margemRealizada: 0.229,
  },
  {
    id: 'c10',
    numero: 'MIR-0016',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Construtora Orla Nova',
    clienteDocumento: '90.123.456/0001-78',
    contato: 'Eng. Tiago · (13) 99620-1188',
    tipoOperacao: 'Terceirização',
    modalidade: 'spot',
    situacao: 'a-faturar',
    inicio: '2026-10-20',
    fim: '2026-10-20',
    localServico: 'Edifício Orla Nova · Praia Grande (SP)',
    propostaNumero: 'MS-00024',
    propostaAprovadaEm: '2026-10-14',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: 'Limpeza pós-obra: 4 auxiliares por 2 dias',
    centroCusto: 'Terceirização',
    responsavel: 'Ricardo',
    escopo: [{ versao: 1, vigenteDesde: '2026-10-20', motivo: 'Proposta MS-00024 aprovada', itens: [item('s4', 'Limpeza pós-obra', 'Auxiliar de limpeza · diária', 8, 'diária', 850, 610)] }],
    condicoes: { ...condicoesPadrao, diaVencimento: 0, prazoPagamentoDias: 10, renovacaoAutomatica: false },
    faturas: [{ id: 'f-s3', competencia: '2026-10', vencimento: '2026-10-31', previsto: 6800, extras: 0, descontos: 0, situacao: 'prevista' }],
    extras: [],
    documentos: [{ id: 'd15', nome: 'Proposta MS-00024.pdf', tipo: 'proposta', data: '2026-10-14', tamanho: '980 KB' }],
    eventos: [{ data: '2026-10-14', tipo: 'assinatura', texto: 'Spot criado a partir da proposta MS-00024', quem: 'Ricardo' }],
    margemRealizada: 0,
  },
  {
    id: 'c11',
    numero: 'MIR-0006',
    empresaId: 'matriz',
    empresaNome: 'Mirai - Matriz',
    clienteNome: 'Hotel Praia Grande',
    clienteDocumento: '01.234.567/0001-89',
    contato: 'Gerência · (13) 3491-8000',
    tipoOperacao: 'Terceirização',
    modalidade: 'recorrente',
    situacao: 'encerrado',
    inicio: '2025-10-01',
    fim: '2026-09-30',
    propostaNumero: 'MS-00001',
    propostaAprovadaEm: '2025-09-15',
    servicoNfse: 'Terceirização de mão de obra',
    servicoNfseDetalhe: 'LC 116 17.05 · ISS 5% retido · Praia Grande (SP)',
    textoAdicionalNota: '',
    centroCusto: 'Terceirização',
    responsavel: 'Ricardo',
    escopo: [{ versao: 1, vigenteDesde: '2025-10-01', motivo: 'Proposta MS-00001 aprovada', itens: [item('h1', 'Terceirização de mão de obra', 'Camareira · escala 6x1', 3, 'posto', 4900, 3980)] }],
    condicoes: { ...condicoesPadrao, renovacaoAutomatica: false },
    faturas: faturasRecorrentes('2025-10-01', 14700, 1090, 'recebida', 0, '2026-09-30'),
    extras: [],
    documentos: [{ id: 'd16', nome: 'Contrato assinado - Hotel Praia Grande.pdf', tipo: 'contrato', data: '2025-09-25', tamanho: '388 KB' }],
    eventos: [{ data: '2026-09-30', tipo: 'encerramento', texto: 'Contrato encerrado no fim da vigência (cliente não renovou)', quem: 'Ricardo' }, { data: '2025-10-01', tipo: 'assinatura', texto: 'Contrato em vigor (proposta MS-00001)', quem: 'Ricardo' }],
    margemRealizada: 0.152,
  },
]

// ── ligação com os Modelos de Contrato (Parametrizações) ─────────────────────────────

const componente = (apelido: string, nome: string, regra: ComponenteContrato['regra'], p: Partial<ComponenteContrato> = {}): ComponenteContrato => ({
  id: `cc-${apelido}`, apelido, nome, regra, unidade: '', valorUnitario: 0, quantidade: 0, formula: '', documento: '', servicoNfse: '', ativo: true, ...p,
})

const terceirizacao = (caracteristicas: Record<string, string | number>, extras: ComponenteContrato[] = []): Partial<Contrato> => ({
  modeloId: 'm-terceirizacao',
  caracteristicas,
  componentes: [
    componente('hora_extra', 'Hora extra', 'lancamento', { unidade: 'hora', valorUnitario: 38 }),
    componente('material', 'Material extra', 'lancamento', { unidade: 'item' }),
    ...extras,
  ],
})

/** O que cada contrato de exemplo usa do modelo (apelido dos itens, características, componentes). */
const LIGACAO: Record<string, { apelido: string; extra: Partial<Contrato> }> = {
  c1: { apelido: 'posto', extra: terceirizacao({ escala: '6x1 e 12x36', qtd_postos: 5, turno: 'Misto', convencao: 'SIEMACO Baixada Santista 2026', local: 'Av. Presidente Kennedy, 1200 · Praia Grande' }) },
  c2: { apelido: 'posto', extra: terceirizacao({ escala: '5x2 e 6x1', qtd_postos: 2, turno: 'Diurno', convencao: 'SIEMACO Baixada Santista 2026' }) },
  c3: {
    apelido: 'posto',
    extra: terceirizacao({ escala: '6x1 e 12x36', qtd_postos: 3, turno: 'Noturno', convencao: 'SIEMACO Baixada Santista 2025' }, [
      // Mesmo modelo da Aruba, mas aqui o adicional noturno existe (desligado: dá para ligar e ver a fatura mudar).
      componente('adicional_noturno', 'Adicional noturno', 'formula', { formula: 'posto * 20%', ativo: false, servicoNfse: 'Terceirização de mão de obra' }),
    ]),
  },
  c4: { apelido: 'posto', extra: terceirizacao({ escala: '12x36', qtd_postos: 2, turno: 'Misto' }) },
  c5: { apelido: 'posto', extra: terceirizacao({ escala: '3x por semana', qtd_postos: 1, turno: 'Diurno' }) },
  c6: {
    apelido: 'posicao',
    extra: {
      modeloId: 'm-armazenagem',
      caracteristicas: { posicoes: 120, tipo_pallet: 'PBR', armazem: 'CD Cubatão · rua B' },
      componentes: [
        componente('excedente', 'Posição excedente', 'lancamento', { unidade: 'pallet-dia', valorUnitario: 1.4 }),
        componente('fora_horario', 'Recebimento fora do horário', 'lancamento', { unidade: 'hora', valorUnitario: 102.5 }),
      ],
    },
  },
  // Transporte com veículo dedicado e mensalidade fixa: mesmo modelo de frete, mas cobra um fixo em vez dos CT-es.
  c7: {
    apelido: 'veiculo',
    extra: {
      modeloId: 'm-frete',
      caracteristicas: { tipo_veiculo: 'VUC', veiculo_dedicado: 'FTR4H21', janela: 'seg a sáb, 6h às 14h' },
      componentes: [componente('pedagio', 'Pedágio', 'lancamento', { unidade: 'praça' })],
    },
  },
  c11: { apelido: 'posto', extra: terceirizacao({ escala: '6x1', qtd_postos: 3, turno: 'Diurno' }) },
}

// ── contrato de FRETES: contrato-base com tabela; cada viagem entra vinculada com o seu CT-e ──

const fretes: DocumentoVinculado[] = [
  { id: 'v1', tipo: 'CT-e', numero: '70', data: venc(mesHoje - 1, 3), descricao: 'Cubatão → Jundiaí · Truck · 11 t', valor: 3480, mdfe: '38', canhoto: true, situacao: 'entregue' },
  { id: 'v2', tipo: 'CT-e', numero: '71', data: venc(mesHoje - 1, 9), descricao: 'Cubatão → Santos (porto) · Truck', valor: 1450, mdfe: '39', canhoto: true, situacao: 'entregue' },
  { id: 'v3', tipo: 'CT-e', numero: '73', data: venc(mesHoje - 1, 18), descricao: 'Cubatão → Campinas · Carreta · 26 t', valor: 5950, mdfe: '40', canhoto: true, situacao: 'entregue' },
  { id: 'v4', tipo: 'CT-e', numero: '75', data: venc(mesHoje - 1, 25), descricao: 'Cubatão → Jundiaí · Truck · 9 t', valor: 3480, mdfe: '42', canhoto: true, situacao: 'entregue' },
  { id: 'v5', tipo: 'CT-e', numero: '79', data: venc(mesHoje, 2), descricao: 'Cubatão → Santos (porto) · Truck', valor: 1450, mdfe: '44', canhoto: true, situacao: 'entregue' },
  { id: 'v6', tipo: 'CT-e', numero: '81', data: venc(mesHoje, 7), descricao: 'Cubatão → Jundiaí · Truck · 12 t', valor: 3480, mdfe: '45', canhoto: true, situacao: 'entregue' },
  { id: 'v7', tipo: 'CT-e', numero: '84', data: venc(mesHoje, 12), descricao: 'Cubatão → Campinas · Carreta · 24 t', valor: 5950, mdfe: '47', canhoto: false, situacao: 'em-transito' },
]

const CONTRATO_FRETES: Contrato = {
  id: 'c12',
  numero: 'MRF-0003',
  empresaId: 'filial',
  empresaNome: 'Mirai - Filial 02',
  clienteNome: 'Química Cubatão Ltda',
  clienteDocumento: '89.012.345/0001-67',
  contato: 'Expedição · Marcos · (13) 3362-1200',
  tipoOperacao: 'Transporte',
  modalidade: 'recorrente',
  situacao: 'vigente',
  inicio: '2026-08-01',
  fim: '2027-07-31',
  propostaNumero: 'MF-00016',
  propostaAprovadaEm: '2026-07-22',
  servicoNfse: 'Transporte de cargas (CT-e)',
  servicoNfseDetalhe: 'Documento fiscal de cada viagem (CT-e emitido na saída)',
  textoAdicionalNota: '',
  centroCusto: 'Transporte',
  responsavel: 'Jéssica',
  escopo: [{ versao: 1, vigenteDesde: '2026-08-01', motivo: 'Proposta MF-00016 aprovada (tabela de fretes)', itens: [
    { ...item('tf1', 'Frete', 'Cubatão → Jundiaí · Truck (até 12 t)', 1, 'viagem', 3480, 2610), apelido: 'fretes', tabela: true },
    { ...item('tf2', 'Frete', 'Cubatão → Campinas · Carreta (até 27 t)', 1, 'viagem', 5950, 4590), apelido: 'fretes', tabela: true },
    { ...item('tf3', 'Frete', 'Cubatão → Santos (porto) · Truck', 1, 'viagem', 1450, 1050), apelido: 'fretes', tabela: true },
  ] }],
  condicoes: { ...condicoesPadrao, carteira: 'Inter · Filial', diaFaturamento: 1, diaVencimento: 0, prazoPagamentoDias: 15, reajusteIndice: 'Negociado', reajusteMesBase: 8, agrupamento: 'periodo', fechamento: 'quinzenal' },
  faturas: [],
  extras: [
    { id: 'e8', data: venc(mesHoje, 7), tipo: 'custo-extra', descricao: 'Pedágio Anchieta/Bandeirantes (CT-e 81)', quantidade: 1, valorUnitario: 96.4, cobranca: 'proxima-fatura', lancadoPor: 'Jéssica' },
    { id: 'e9', data: venc(mesHoje, 12), tipo: 'hora-extra', descricao: 'Diária de carreta parada no cliente (CT-e 84)', quantidade: 1, valorUnitario: 650, cobranca: 'proxima-fatura', lancadoPor: 'Jéssica' },
  ],
  documentos: [{ id: 'd17', nome: 'Contrato de fretes - Química Cubatão.pdf', tipo: 'contrato', data: '2026-07-28', tamanho: '450 KB' }],
  eventos: [
    { data: venc(mesHoje, 12), tipo: 'documento', texto: 'CT-e 84 importado da SIIMP e vinculado (Cubatão → Campinas)', quem: 'sistema' },
    { data: venc(mesHoje, 7), tipo: 'documento', texto: 'CT-e 81 importado da SIIMP e vinculado (Cubatão → Jundiaí)', quem: 'sistema' },
    { data: '2026-08-01', tipo: 'assinatura', texto: 'Contrato de fretes em vigor (proposta MF-00016)', quem: 'Jéssica' },
  ],
  margemRealizada: 0.219,
  modeloId: 'm-frete',
  caracteristicas: { tipo_veiculo: 'Truck e Carreta', rotas: 'Cubatão → Jundiaí, Campinas e porto de Santos', janela: 'seg a sex, 7h às 16h', seguro_rctrc: 0.0035 },
  componentes: [
    componente('fretes', 'Fretes do período (CT-e)', 'documento', { documento: 'CT-e', servicoNfse: 'Transporte de cargas (CT-e)' }),
    componente('pedagio', 'Pedágio', 'lancamento', { unidade: 'praça' }),
    componente('diaria_parada', 'Diária de veículo parado', 'lancamento', { unidade: 'diária', valorUnitario: 650 }),
  ],
  documentosVinculados: fretes,
}

export const CONTRATOS_EXEMPLO: Contrato[] = [
  ...BASE.map((c) => {
    const l = LIGACAO[c.id]
    if (!l) return c
    return { ...c, ...l.extra, escopo: c.escopo.map((v) => ({ ...v, itens: v.itens.map((i) => ({ ...i, apelido: i.apelido ?? l.apelido })) })) }
  }),
  CONTRATO_FRETES,
]
