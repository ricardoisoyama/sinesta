/**
 * Veículo da frota, agregado ou de terceiro (campos do cadastro de veículos do Erebor).
 * Espelho de `Veiculo.cs`. O CRLV vai como anexo do registro.
 */
export interface Veiculo {
  id: string
  status: 'ativo' | 'inativo'
  // Identificação
  /** Sem hífen, em maiúsculas: ABC1234 ou ABC1D23 (Mercosul). */
  placaTracao: string
  placaReboque: string
  renavam: string
  chassi: string
  /** RNTRC. */
  antt: string
  // Características
  tipoVeiculo: string
  tipoCarroceria: string
  /** Rastreador (Onixsat, Sascar...). */
  tecnologia: string
  travaQuintaRoda: string
  blindado: string
  marca: string
  modelo: string
  cor: string
  perfil: string
  // Proprietário
  cpfCnpj: string
  nomeProprietario: string
  /** yyyy-MM-dd. */
  dataNascimento: string
  rg: string
  ufRg: string
  nomeMae: string
  telefone: string
  /** Calculado no servidor: "ABC1D23 · Truck · Volvo FH". */
  nome?: string
}

// Listas do Erebor, mais os tipos e a carroceria "Aberto" que a Aldrava usa nos Dados da Operação.
export const TIPOS_VEICULO = ['Moto', 'Utilitário', 'Van', 'HR', 'VUC', 'Iveco', '3/4', 'Toco', 'Truck', 'Bitruck', 'Cavalo Mecânico', 'Carreta']
export const CARROCERIAS = ['Aberto', 'Baú', 'Sider', 'Graneleiro', 'Refrigerado', 'Tanque', 'Prancha', 'Caçamba']
export const PERFIS_VEICULO = ['Próprio', 'Agregado', 'Terceiro', 'Frota']
export const SIM_NAO = ['Sim', 'Não']

/** "ABC1234" → "ABC-1234"; a Mercosul (ABC1D23) fica sem hífen. */
export const placaFormatada = (placa: string) => (/^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa)

// Placa por posição: 3 letras, 1 número, letra ou número (Mercosul), 2 números.
const POSICOES_PLACA = [/[A-Z]/, /[A-Z]/, /[A-Z]/, /\d/, /[A-Z0-9]/, /\d/, /\d/]

/** Enquanto digita: maiúsculas e só o que cabe em cada posição da placa (o resto é ignorado). */
export function mascaraPlaca(texto: string): string {
  let placa = ''
  for (const ch of texto.toUpperCase()) {
    if (placa.length === POSICOES_PLACA.length) break
    if (POSICOES_PLACA[placa.length].test(ch)) placa += ch
  }
  return placa
}

/** Só dígitos, até `max`. */
export const soDigitos = (texto: string, max: number) => texto.replace(/\D/g, '').slice(0, max)

/** Chassi (VIN): letras e números, sem I, O e Q (não existem no padrão), até 17. */
export const mascaraChassi = (texto: string) => texto.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)

/** Antiga (ABC1234) ou Mercosul (ABC1D23). Espelho de `Veiculo.PlacaValida`. */
export const placaValida = (placa: string) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa.toUpperCase().replace(/[^A-Z0-9]/g, ''))

/**
 * Marcas e modelos mais comuns de caminhões, utilitários e motos usados no transporte. Servem
 * de sugestão na digitação (o campo aceita qualquer texto); os já cadastrados entram juntos.
 */
export const MARCAS_MODELOS: Record<string, string[]> = {
  'Mercedes-Benz': ['Accelo 815', 'Accelo 1017', 'Atego 1719', 'Atego 2426', 'Axor 2544', 'Actros 2651', 'Sprinter 416', 'Sprinter 516'],
  Volkswagen: ['Delivery 9.170', 'Delivery 11.180', 'Constellation 17.280', 'Constellation 24.280', 'Constellation 25.460', 'Meteor 28.460', 'Saveiro', 'Amarok'],
  Volvo: ['VM 270', 'VM 330', 'FH 460', 'FH 540', 'FMX 500'],
  Scania: ['P 280', 'P 320', 'G 410', 'R 450', 'R 540', 'S 540'],
  Iveco: ['Daily 35-150', 'Daily 55-180', 'Tector 240E30', 'Hi-Way 600S44', 'S-Way 480'],
  DAF: ['XF 480', 'XF 530', 'CF 410'],
  Ford: ['Cargo 816', 'Cargo 1119', 'Cargo 2429', 'Transit', 'Ranger'],
  Hyundai: ['HR', 'HD80'],
  Renault: ['Master', 'Kangoo'],
  Fiat: ['Fiorino', 'Ducato', 'Strada', 'Toro'],
  Peugeot: ['Boxer', 'Partner', 'Expert'],
  Citroën: ['Jumper', 'Jumpy'],
  Chevrolet: ['S10', 'Montana'],
  Toyota: ['Hilux'],
  Mitsubishi: ['L200'],
  Kia: ['Bongo K2500'],
  JAC: ['iEV1200T', 'V260'],
  Agrale: ['8700', '10000', '14000'],
  Foton: ['Aumark 916', 'Aumark 1217'],
  Honda: ['CG 160 Cargo', 'NXR 160 Bros'],
  Yamaha: ['Factor 150', 'Fazer 250'],
}

const mesmaMarca = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Marcas para sugerir: as da lista e as já usadas nos veículos cadastrados. */
export const sugestoesMarca = (cadastrados: Pick<Veiculo, 'marca'>[]) =>
  [...new Set([...Object.keys(MARCAS_MODELOS), ...cadastrados.map((v) => v.marca.trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b))

/** Modelos para sugerir: os da marca escolhida (lista + cadastrados); sem marca, todos. */
export function sugestoesModelo(marca: string, cadastrados: Pick<Veiculo, 'marca' | 'modelo'>[]): string[] {
  const daLista = Object.entries(MARCAS_MODELOS)
    .filter(([m]) => !marca.trim() || mesmaMarca(m, marca))
    .flatMap(([, modelos]) => modelos)
  const usados = cadastrados.filter((v) => !marca.trim() || mesmaMarca(v.marca, marca)).map((v) => v.modelo.trim())
  return [...new Set([...daLista, ...usados].filter(Boolean))]
}

/** Como o veículo aparece nas listas: "ABC-1234 · Toco · Volvo VM 270". */
export const nomeVeiculo = (v: Pick<Veiculo, 'placaTracao' | 'tipoVeiculo' | 'marca' | 'modelo'>) =>
  [placaFormatada(v.placaTracao), v.tipoVeiculo, `${v.marca} ${v.modelo}`.trim()].filter(Boolean).join(' · ')
