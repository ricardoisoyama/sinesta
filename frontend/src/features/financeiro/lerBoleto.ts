import { lerCodigoBoleto } from './codigoBoleto'

/**
 * Lê o boleto de um arquivo, no próprio navegador (o arquivo não sobe para o servidor):
 * PDF → procura a linha digitável no texto; sem texto (PDF escaneado) ou foto → lê o código de barras
 * da imagem (ITF, o do boleto), tentando também a imagem girada.
 */
export type LeituraArquivo = { codigo: string } | { erro: string }

const hoje = () => new Date().toISOString().slice(0, 10)

/** Acha no texto uma linha digitável ou código de barras que confere (dígitos verificadores). */
export function codigoNoTexto(texto: string): string | null {
  // Trechos com dígitos e separadores comuns (pontos, espaços, hífens); dentro deles, testa as janelas de 47, 48 e 44.
  for (const trecho of texto.match(/[\d][\d .\-\n]{40,}[\d]/g) ?? []) {
    const d = trecho.replace(/\D/g, '')
    for (const tam of [47, 48, 44])
      for (let i = 0; i + tam <= d.length; i++) {
        const candidato = d.slice(i, i + tam)
        if (lerCodigoBoleto(candidato, hoje()).codigo) return candidato
      }
  }
  return null
}

async function leitor() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
  const hints = new Map<number, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF]],
    [DecodeHintType.TRY_HARDER, true],
  ])
  return new BrowserMultiFormatReader(hints as never)
}

/** Código de barras do boleto numa imagem (canvas), também girada 90° e 180°. */
export async function codigoNaImagem(canvas: HTMLCanvasElement): Promise<string | null> {
  const r = await leitor()
  const tentar = (c: HTMLCanvasElement) => {
    try {
      const texto = r.decodeFromCanvas(c).getText()
      return lerCodigoBoleto(texto, hoje()).codigo ? texto : null
    } catch {
      return null
    }
  }
  const direto = tentar(canvas)
  if (direto) return direto
  for (const graus of [90, 180, 270]) {
    const g = document.createElement('canvas')
    const de = graus % 180 !== 0
    g.width = de ? canvas.height : canvas.width
    g.height = de ? canvas.width : canvas.height
    const ctx = g.getContext('2d')!
    ctx.translate(g.width / 2, g.height / 2)
    ctx.rotate((graus * Math.PI) / 180)
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
    const t = tentar(g)
    if (t) return t
  }
  return null
}

async function imagemEmCanvas(arquivo: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => falha(new Error('Não foi possível abrir a imagem.'))
      i.src = url
    })
    // Foto de celular é grande: reduz para ~2000 px no lado maior (mais rápido e lê igual).
    const escala = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * escala)
    c.height = Math.round(img.naturalHeight * escala)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function lerPdf(arquivo: File): Promise<LeituraArquivo> {
  const pdfjs = await import('pdfjs-dist')
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  // Sem eval (a CSP do site não deixa): o pdf.js desenha as fontes do jeito comum.
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), isEvalSupported: false }).promise
  const paginas = Math.min(doc.numPages, 3)
  for (let n = 1; n <= paginas; n++) {
    const pagina = await doc.getPage(n)
    const conteudo = await pagina.getTextContent()
    const texto = conteudo.items.map((i) => ('str' in i ? i.str : '')).join(' ')
    const achado = codigoNoTexto(texto)
    if (achado) return { codigo: achado }
  }
  // Sem a linha no texto (PDF escaneado): lê o código de barras desenhado na página.
  for (let n = 1; n <= paginas; n++) {
    const pagina = await doc.getPage(n)
    const vista = pagina.getViewport({ scale: 2.5 })
    const c = document.createElement('canvas')
    c.width = vista.width
    c.height = vista.height
    await pagina.render({ canvasContext: c.getContext('2d')!, viewport: vista }).promise
    const achado = await codigoNaImagem(c)
    if (achado) return { codigo: achado }
  }
  return { erro: 'Não achei a linha digitável nem o código de barras neste PDF. Cole a linha digitável ou leia com o celular.' }
}

/**
 * Boleto já anexado ao lançamento (o financeiro anexa o PDF do boleto junto com a nota): lê os PDFs e fotos
 * anexados, primeiro os que parecem boleto pelo nome, e devolve o primeiro código que confere.
 */
export async function lerBoletoDosAnexos(movimentoId: string): Promise<{ codigo: string; arquivo: string } | null> {
  const { listAnexos, baixarAnexo } = await import('@/features/anexos/api')
  const anexos = (await listAnexos('movimento', movimentoId)).filter((a) => /\.(pdf|jpe?g|png)$/i.test(a.nome))
  const pareceBoleto = (nome: string) => (/bol|boleto|guia|cobran|fatura|pagamento/i.test(nome) ? 0 : /nf|nota|dacte|danfe/i.test(nome) ? 2 : 1)
  for (const a of anexos.sort((x, y) => pareceBoleto(x.nome) - pareceBoleto(y.nome)).slice(0, 5)) {
    try {
      const blob = await baixarAnexo(a.id)
      const r = await lerArquivoBoleto(new File([blob], a.nome, { type: a.tipo || blob.type }))
      if ('codigo' in r) return { codigo: r.codigo, arquivo: a.nome }
    } catch {
      // anexo que não abre: tenta o próximo
    }
  }
  return null
}

export async function lerArquivoBoleto(arquivo: File): Promise<LeituraArquivo> {
  try {
    if (arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name)) return await lerPdf(arquivo)
    if (arquivo.type.startsWith('image/')) {
      const achado = await codigoNaImagem(await imagemEmCanvas(arquivo))
      return achado ? { codigo: achado } : { erro: 'Não consegui ler o código de barras na foto. Tente uma foto mais de perto, reta e com boa luz.' }
    }
    return { erro: 'Envie o boleto em PDF ou uma foto (JPG, PNG).' }
  } catch (e) {
    return { erro: `Não foi possível ler o arquivo: ${e instanceof Error ? e.message : String(e)}` }
  }
}
