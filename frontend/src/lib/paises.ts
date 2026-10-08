/**
 * Países (ISO 3166-1) com o código de discagem internacional e a moeda usual. O nome sai em
 * português pelo próprio navegador (Intl.DisplayNames), então não há tradução para manter aqui.
 */
export interface Pais {
  iso: string
  nome: string
  /** Código de discagem, sem o "+" (ex.: "1", "44"). */
  ddi: string
  /** Moeda usual (ISO 4217), quando conhecida. */
  moeda: string
}

// [ISO, DDI, moeda]
const DADOS: [string, string, string][] = [
  ['AF', '93', 'AFN'], ['ZA', '27', 'ZAR'], ['AL', '355', 'ALL'], ['DE', '49', 'EUR'], ['AD', '376', 'EUR'], ['AO', '244', 'AOA'],
  ['AG', '1', 'XCD'], ['SA', '966', 'SAR'], ['DZ', '213', 'DZD'], ['AR', '54', 'ARS'], ['AM', '374', 'AMD'], ['AU', '61', 'AUD'],
  ['AT', '43', 'EUR'], ['AZ', '994', 'AZN'], ['BS', '1', 'BSD'], ['BH', '973', 'BHD'], ['BD', '880', 'BDT'], ['BB', '1', 'BBD'],
  ['BE', '32', 'EUR'], ['BZ', '501', 'BZD'], ['BJ', '229', 'XOF'], ['BY', '375', 'BYN'], ['BO', '591', 'BOB'], ['BA', '387', 'BAM'],
  ['BW', '267', 'BWP'], ['BR', '55', 'BRL'], ['BN', '673', 'BND'], ['BG', '359', 'BGN'], ['BF', '226', 'XOF'], ['BI', '257', 'BIF'],
  ['BT', '975', 'BTN'], ['CV', '238', 'CVE'], ['CM', '237', 'XAF'], ['KH', '855', 'KHR'], ['CA', '1', 'CAD'], ['QA', '974', 'QAR'],
  ['KZ', '7', 'KZT'], ['TD', '235', 'XAF'], ['CL', '56', 'CLP'], ['CN', '86', 'CNY'], ['CY', '357', 'EUR'], ['CO', '57', 'COP'],
  ['KM', '269', 'KMF'], ['CG', '242', 'XAF'], ['CD', '243', 'CDF'], ['KR', '82', 'KRW'], ['KP', '850', 'KPW'], ['CI', '225', 'XOF'],
  ['CR', '506', 'CRC'], ['HR', '385', 'EUR'], ['CU', '53', 'CUP'], ['DK', '45', 'DKK'], ['DJ', '253', 'DJF'], ['DM', '1', 'XCD'],
  ['EG', '20', 'EGP'], ['SV', '503', 'USD'], ['AE', '971', 'AED'], ['EC', '593', 'USD'], ['ER', '291', 'ERN'], ['SK', '421', 'EUR'],
  ['SI', '386', 'EUR'], ['ES', '34', 'EUR'], ['US', '1', 'USD'], ['EE', '372', 'EUR'], ['SZ', '268', 'SZL'], ['ET', '251', 'ETB'],
  ['FJ', '679', 'FJD'], ['PH', '63', 'PHP'], ['FI', '358', 'EUR'], ['FR', '33', 'EUR'], ['GA', '241', 'XAF'], ['GM', '220', 'GMD'],
  ['GH', '233', 'GHS'], ['GE', '995', 'GEL'], ['GD', '1', 'XCD'], ['GR', '30', 'EUR'], ['GT', '502', 'GTQ'], ['GY', '592', 'GYD'],
  ['GN', '224', 'GNF'], ['GQ', '240', 'XAF'], ['GW', '245', 'XOF'], ['HT', '509', 'HTG'], ['NL', '31', 'EUR'], ['HN', '504', 'HNL'],
  ['HK', '852', 'HKD'], ['HU', '36', 'HUF'], ['YE', '967', 'YER'], ['MH', '692', 'USD'], ['SB', '677', 'SBD'], ['IN', '91', 'INR'],
  ['ID', '62', 'IDR'], ['IR', '98', 'IRR'], ['IQ', '964', 'IQD'], ['IE', '353', 'EUR'], ['IS', '354', 'ISK'], ['IL', '972', 'ILS'],
  ['IT', '39', 'EUR'], ['JM', '1', 'JMD'], ['JP', '81', 'JPY'], ['JO', '962', 'JOD'], ['KW', '965', 'KWD'], ['LA', '856', 'LAK'],
  ['LS', '266', 'LSL'], ['LV', '371', 'EUR'], ['LB', '961', 'LBP'], ['LR', '231', 'LRD'], ['LY', '218', 'LYD'], ['LI', '423', 'CHF'],
  ['LT', '370', 'EUR'], ['LU', '352', 'EUR'], ['MO', '853', 'MOP'], ['MK', '389', 'MKD'], ['MG', '261', 'MGA'], ['MY', '60', 'MYR'],
  ['MW', '265', 'MWK'], ['MV', '960', 'MVR'], ['ML', '223', 'XOF'], ['MT', '356', 'EUR'], ['MA', '212', 'MAD'], ['MU', '230', 'MUR'],
  ['MR', '222', 'MRU'], ['MX', '52', 'MXN'], ['MM', '95', 'MMK'], ['FM', '691', 'USD'], ['MZ', '258', 'MZN'], ['MD', '373', 'MDL'],
  ['MC', '377', 'EUR'], ['MN', '976', 'MNT'], ['ME', '382', 'EUR'], ['NA', '264', 'NAD'], ['NR', '674', 'AUD'], ['NP', '977', 'NPR'],
  ['NI', '505', 'NIO'], ['NE', '227', 'XOF'], ['NG', '234', 'NGN'], ['NO', '47', 'NOK'], ['NZ', '64', 'NZD'], ['OM', '968', 'OMR'],
  ['PW', '680', 'USD'], ['PS', '970', 'ILS'], ['PA', '507', 'PAB'], ['PG', '675', 'PGK'], ['PK', '92', 'PKR'], ['PY', '595', 'PYG'],
  ['PE', '51', 'PEN'], ['PL', '48', 'PLN'], ['PR', '1', 'USD'], ['PT', '351', 'EUR'], ['KE', '254', 'KES'], ['KG', '996', 'KGS'],
  ['KI', '686', 'AUD'], ['GB', '44', 'GBP'], ['CF', '236', 'XAF'], ['CZ', '420', 'CZK'], ['DO', '1', 'DOP'], ['RO', '40', 'RON'],
  ['RW', '250', 'RWF'], ['RU', '7', 'RUB'], ['WS', '685', 'WST'], ['SM', '378', 'EUR'], ['LC', '1', 'XCD'], ['KN', '1', 'XCD'],
  ['ST', '239', 'STN'], ['VC', '1', 'XCD'], ['SC', '248', 'SCR'], ['SN', '221', 'XOF'], ['SL', '232', 'SLE'], ['RS', '381', 'RSD'],
  ['SG', '65', 'SGD'], ['SY', '963', 'SYP'], ['SO', '252', 'SOS'], ['LK', '94', 'LKR'], ['SD', '249', 'SDG'], ['SS', '211', 'SSP'],
  ['SE', '46', 'SEK'], ['CH', '41', 'CHF'], ['SR', '597', 'SRD'], ['TH', '66', 'THB'], ['TW', '886', 'TWD'], ['TJ', '992', 'TJS'],
  ['TZ', '255', 'TZS'], ['TL', '670', 'USD'], ['TG', '228', 'XOF'], ['TO', '676', 'TOP'], ['TT', '1', 'TTD'], ['TN', '216', 'TND'],
  ['TM', '993', 'TMT'], ['TR', '90', 'TRY'], ['TV', '688', 'AUD'], ['UA', '380', 'UAH'], ['UG', '256', 'UGX'], ['UY', '598', 'UYU'],
  ['UZ', '998', 'UZS'], ['VU', '678', 'VUV'], ['VA', '39', 'EUR'], ['VE', '58', 'VES'], ['VN', '84', 'VND'], ['ZM', '260', 'ZMW'],
  ['ZW', '263', 'ZWL'], ['CW', '599', 'ANG'], ['GL', '299', 'DKK'], ['KY', '1', 'KYD'], ['BM', '1', 'BMD'], ['GI', '350', 'GIP'],
]

const nomes = (() => {
  try {
    return new Intl.DisplayNames(['pt-BR'], { type: 'region' })
  } catch {
    return null
  }
})()

/** Todos os países, em ordem alfabética (português). O Brasil fica de fora: é o cadastro normal. */
export const PAISES_EXTERIOR: Pais[] = DADOS.filter(([iso]) => iso !== 'BR')
  .map(([iso, ddi, moeda]) => ({ iso, ddi, moeda, nome: nomes?.of(iso) ?? iso }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** País pelo nome gravado no cadastro (aceita sem acento, maiúscula ou o código ISO). */
export const paisPorNome = (nome: string): Pais | undefined => {
  const k = semAcento(nome)
  if (!k) return undefined
  return PAISES_EXTERIOR.find((p) => semAcento(p.nome) === k || p.iso.toLowerCase() === k)
}

/** Busca por nome, código ISO ou DDI ("esta", "US", "+44"). */
export const buscarPaises = (texto: string): Pais[] => {
  const k = semAcento(texto).replace(/^\+/, '')
  if (!k) return PAISES_EXTERIOR
  return PAISES_EXTERIOR.filter((p) => semAcento(p.nome).includes(k) || p.iso.toLowerCase() === k || p.ddi === k)
}

/** Telefone internacional: mantém dígitos, espaço, "+", "-", "(", ")" (cada país tem o seu formato). */
export const formatTelefoneInternacional = (v: string): string => v.replace(/[^\d+\-() ]/g, '').replace(/(?!^)\+/g, '').slice(0, 24)
