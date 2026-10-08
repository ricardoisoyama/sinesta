import type { CSSProperties, ReactNode } from 'react'
import DOMPurify from 'dompurify'
import { formatBRL, formatNumberBRL } from '@/lib/format'
import { COR_PRINCIPAL_PADRAO, type ItemPagina, type ModeloProposta, type Pagina } from '@/features/modelosProposta/types'
import type { ItemProposta, Proposta } from './types'
import s from './proposta-pdf.module.css'

/** Quem responde pela proposta: o vendedor dela (ou quem a gerou), com o contato. */
export interface ContatoProposta {
  nome: string
  email: string
  telefone: string
}

interface Props {
  pagina: Pagina
  modelo: ModeloProposta
  proposta: Proposta
  /** Logo da empresa (para fundo claro). */
  logo: string
  /** Número desta folha e total de folhas (rodapé "Página 2 de 5"). */
  numero?: number
  total?: number
  /** Responsável dinâmico; sem ele, vale o contato do modelo. */
  contato?: ContatoProposta
}

// HTML do editor rico passa pelo DOMPurify antes de entrar no DOM: um modelo malicioso (ou
// colado de fora) não executa script na sessão de quem imprime.
const html = (h: string) => ({ __html: DOMPurify.sanitize(h ?? '', { USE_PROFILES: { html: true } }) })
const dataBR = (d: string) => (/^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split('-').reverse().join('/') : d)
const doGrupo = (p: Pagina, g: string): ItemPagina[] => (p.itens ?? []).filter((i) => i.grupo === g)
const primeiro = (p: Pagina, g: string, padrao = ''): string => doGrupo(p, g)[0]?.titulo || padrao

const ICONES_APOIO = [
  <svg key="a" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="4" /></svg>,
  <svg key="b" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 12v4a2 2 0 0 0 2 2h1v-6H4" /></svg>,
  <svg key="c" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6 4 4 6-7" /><path d="M14 8h6v6" /></svg>,
]
const ICONE_OK = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
const ICONE_ATENCAO = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
const ICONE_FORA = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
const ICONE_CALENDARIO = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
const ICONE_ESCUDO = <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>

/** Linha da composição: o serviço, os dados da operação que informam o cliente e a quantidade. */
function linhaDoItem(it: ItemProposta) {
  const dados = (it.dadosOperacao ?? []).filter((d) => d.texto?.trim())
  const servico = dados.find((d) => d.chave === 'servico' || d.nome.toLowerCase() === 'serviço')?.texto ?? ''
  // Só o que informa: cliente já está na capa; custos somados não são para o cliente.
  const detalhes = dados
    .filter((d) => d.efeito === 'informativo' && d.chave !== 'cliente' && d.chave !== 'servico' && d.nome.toLowerCase() !== 'cliente' && d.nome.toLowerCase() !== 'serviço')
    .map((d) => `${d.nome}: ${d.texto}`)
  const multiplica = (it.dadosOperacao ?? []).find((d) => d.efeito === 'multiplica' && d.numero > 0)?.numero
  const fichas = it.fichas ?? []
  const qtd = multiplica ?? (fichas.length === 1 ? fichas[0].quantidade : 1)
  return { servico: servico && servico !== it.descricao ? servico : '', detalhes: detalhes.join(' · '), qtd }
}

/** Renderiza UMA folha A4 da proposta, conforme o tipo da página. */
export function PaginaView({ pagina, modelo, proposta, logo, numero, total, contato }: Props) {
  const estilo = { '--pr': modelo.corPrincipal || COR_PRINCIPAL_PADRAO, '--ac': modelo.cor || '#ff6a39' } as CSSProperties
  const responsavel: ContatoProposta = contato ?? { nome: modelo.responsavel, email: modelo.email, telefone: modelo.telefone }
  const referencia = `Proposta ${proposta.numero} · ${proposta.cliente}`
  const paginaDe = numero && total ? `Página ${numero} de ${total}` : ''
  const rodapeTexto = modelo.rodapeEmpresa || ''
  // Logo no fundo escuro: o próprio (logo da capa) ou o da empresa num selo claro.
  const logoEscuro = (largura: 'grande' | 'topo'): ReactNode =>
    modelo.logoCapa ? (
      <img className={largura === 'grande' ? s.capaLogo : s.topoLogo} src={modelo.logoCapa} alt="Logo" />
    ) : largura === 'grande' ? (
      <div className={s.capaSelo}><img src={logo} alt="Logo" /></div>
    ) : (
      <div className={s.capaSelo} style={{ padding: '6px 12px', borderRadius: 10 }}><img src={logo} alt="Logo" style={{ width: 'auto', height: 26 }} /></div>
    )

  const topo = (escura = false) => (
    <div className={s.topo}>
      {escura ? logoEscuro('topo') : <img className={s.topoLogo} src={logo} alt="Logo" />}
      <span className={s.topoRef}>{referencia}</span>
    </div>
  )
  const rodape = (texto = rodapeTexto) => (
    <div className={s.rodape}>
      <span>{texto}</span>
      <span>{paginaDe}</span>
    </div>
  )
  const abertura = (introPadrao = true) => (
    <div className={s.abre}>
      {pagina.subtitulo && <div className={s.rotulo}>{pagina.subtitulo}</div>}
      <h2 className={s.titulo}>{pagina.titulo}</h2>
      {introPadrao && pagina.conteudo && <div className={s.intro} dangerouslySetInnerHTML={html(pagina.conteudo)} />}
    </div>
  )

  if (pagina.tipo === 'capa') {
    return (
      <div className={`${s.folha} ${s.escura}`} style={estilo}>
        <div className={s.anel} style={{ right: -170, top: 150, width: 520, height: 520 }} />
        <div className={s.anel} style={{ right: -90, top: 230, width: 360, height: 360, opacity: 0.65 }} />
        <div className={s.capaTopo}>
          <span className={s.capaNumero}>Proposta {proposta.numero}</span>
          <span className={s.capaTraco} />
        </div>
        <div className={s.capaCentro}>
          {logoEscuro('grande')}
          <div className={s.capaKicker}>Proposta comercial</div>
          {pagina.titulo && <h1 className={s.capaTitulo}>{pagina.titulo}</h1>}
          {pagina.subtitulo && <p className={s.capaSub}>{pagina.subtitulo}</p>}
        </div>
        <div className={s.cresce} />
        <div className={s.capaCartao}>
          <div className={s.capaDados}>
            <div><span>Cliente</span><b>{proposta.cliente}</b></div>
            <div><span>Data</span><b>{dataBR(proposta.data)}</b></div>
            <div><span>Validade</span><b>{proposta.validade || '—'}</b></div>
            <div><span>Responsável</span><b>{responsavel.nome || '—'}</b></div>
          </div>
          {pagina.conteudo && (
            <>
              <div className={s.linhaFina} />
              <div className={s.capaObjetivo}>
                <span>Objetivo desta proposta</span>
                <div dangerouslySetInnerHTML={html(pagina.conteudo)} />
              </div>
            </>
          )}
        </div>
        <div className={s.capaRodape}>
          <span>{rodapeTexto}</span>
          <span>{paginaDe}</span>
        </div>
      </div>
    )
  }

  if (pagina.tipo === 'sobre') {
    const destaques = doGrupo(pagina, 'destaque')
    const apoio = doGrupo(pagina, 'apoio')
    const modulos = doGrupo(pagina, 'modulo')
    return (
      <div className={s.folha} style={estilo}>
        {topo()}
        {abertura()}
        {destaques.length > 0 && (
          <div className={s.destaques} style={{ gridTemplateColumns: `repeat(${Math.min(destaques.length, 3)}, minmax(0, 1fr))` }}>
            {destaques.map((d, i) => (
              <div key={i} className={s.destaque}><b>{d.titulo}</b><span>{d.texto}</span></div>
            ))}
          </div>
        )}
        {apoio.length > 0 && (
          <div className={s.bloco} style={{ paddingTop: 36 }}>
            <h3 className={s.secao}>{primeiro(pagina, 'titulo-apoio', 'Como vamos apoiar a sua operação')}</h3>
            <div className={s.cartoes}>
              {apoio.map((c, i) => (
                <div key={i} className={s.cartao}>
                  <div className={s.icone}>{ICONES_APOIO[i % ICONES_APOIO.length]}</div>
                  <div><b>{c.titulo}</b><span>{c.texto}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {modulos.length > 0 && (
          <div className={s.bloco} style={{ gap: 10 }}>
            <span className={s.miniRotulo}>{primeiro(pagina, 'titulo-modulos', 'Módulos')}</span>
            <div className={s.etiquetas}>
              {modulos.map((m, i) => <span key={i} className={s.etiqueta}>{m.titulo}</span>)}
            </div>
          </div>
        )}
        <div className={s.cresce} />
        {rodape()}
      </div>
    )
  }

  if (pagina.tipo === 'composicao') {
    const pagamento = proposta.formaPagamento
      ? `${proposta.formaPagamento}${(proposta.prazoPagamentoDias ?? 0) > 0 ? `, em ${proposta.prazoPagamentoDias} dias` : ', à vista'}`
      : 'A combinar'
    return (
      <div className={s.folha} style={estilo}>
        {topo()}
        {abertura()}
        <div className={s.tabela}>
          <div className={s.tabCab}>
            <span>Serviço</span><span>Detalhes da operação</span><span style={{ textAlign: 'right' }}>Qtd</span><span style={{ textAlign: 'right' }}>Valor</span>
          </div>
          {proposta.itens.map((it) => {
            const l = linhaDoItem(it)
            return (
              <div key={it.id} className={s.tabLinha}>
                <div className={s.tabServico}><b>{it.descricao}</b>{l.servico && <span>{l.servico}</span>}</div>
                <span className={s.tabDetalhe}>{l.detalhes || '—'}</span>
                <span className={s.num}>{formatNumberBRL(l.qtd).replace(/,00$/, '')}</span>
                <span className={s.valor}>{formatBRL(it.precoFinal)}</span>
              </div>
            )
          })}
        </div>
        <div className={s.totais}>
          <span className={s.totalNota}>{proposta.itens.length} {proposta.itens.length === 1 ? 'serviço' : 'serviços'} nesta proposta.</span>
          <div className={s.total}><span>Investimento total</span><b>{formatBRL(proposta.total)}</b></div>
        </div>
        <div className={s.bloco}>
          <h3 className={s.secao}>Condições comerciais</h3>
          <div className={s.condicoes}>
            <div><span className={s.miniRotulo}>Pagamento</span><span>{pagamento}</span></div>
            <div><span className={s.miniRotulo}>Validade</span><span>{proposta.validade || '—'}</span></div>
            {proposta.prazoEntrega && <div><span className={s.miniRotulo}>Prazo de entrega</span><span>{proposta.prazoEntrega}</span></div>}
            <div><span className={s.miniRotulo}>Tributação</span><span>{primeiro(pagina, 'tributacao', 'Sujeita às alíquotas vigentes')}</span></div>
          </div>
        </div>
        <div className={s.cresce} />
        {rodape()}
      </div>
    )
  }

  if (pagina.tipo === 'escopo') {
    const lista = (g: string) => doGrupo(pagina, g).map((x) => x.titulo).filter(Boolean)
    const validade = doGrupo(pagina, 'validade')[0]
    const faixa = doGrupo(pagina, 'faixa')[0]
    const quadro = (titulo: string, selo: string, icone: ReactNode, itens: string[]) =>
      itens.length > 0 && (
        <div className={s.quadro}>
          <div className={s.quadroTopo}><span className={`${s.selo} ${selo}`}>{icone}</span><b>{titulo}</b></div>
          <ul>{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )
    return (
      <div className={s.folha} style={estilo}>
        {topo()}
        {abertura()}
        <div className={s.quadros}>
          {quadro('Escopo contemplado', s.seloOk, ICONE_OK, lista('contemplado'))}
          {quadro('Premissas', s.seloAtencao, ICONE_ATENCAO, lista('premissa'))}
          {quadro('Fora do escopo', s.seloFora, ICONE_FORA, lista('fora'))}
          {validade && (
            <div className={s.quadro}>
              <div className={s.quadroTopo}><span className={`${s.selo} ${s.seloOk}`}>{ICONE_CALENDARIO}</span><b>{validade.titulo || 'Validade'}</b></div>
              <p>{proposta.validade ? `${proposta.validade} a partir do envio. ` : ''}{validade.texto}</p>
            </div>
          )}
        </div>
        {faixa && (
          <div className={s.faixa}>
            {ICONE_ESCUDO}
            <span><b>{faixa.titulo}</b> {faixa.texto}</span>
          </div>
        )}
        <div className={s.cresce} />
        {rodape()}
      </div>
    )
  }

  if (pagina.tipo === 'proximos') {
    const passos = doGrupo(pagina, 'passo')
    const aceite = doGrupo(pagina, 'aceite')[0]
    return (
      <div className={`${s.folha} ${s.escura}`} style={estilo}>
        <div className={s.anel} style={{ left: -200, bottom: -220, width: 560, height: 560 }} />
        {topo(true)}
        <div className={s.abre} style={{ paddingTop: 52 }}>
          {pagina.subtitulo && <div className={s.rotulo}>{pagina.subtitulo}</div>}
          <h2 className={s.titulo}>{pagina.titulo}</h2>
          {pagina.conteudo && <div className={s.intro} dangerouslySetInnerHTML={html(pagina.conteudo)} />}
        </div>
        {passos.length > 0 && (
          <div className={s.passos}>
            {passos.map((p, i) => (
              <div key={i} className={s.passo}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <div><strong>{p.titulo}</strong><span>{p.texto}</span></div>
              </div>
            ))}
          </div>
        )}
        <div className={s.fechamento} style={aceite ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className={s.contato}>
            <span>Fale com a gente</span>
            <b>{responsavel.nome ? `${responsavel.nome} · Responsável comercial` : 'Responsável comercial'}</b>
            <div>
              {[responsavel.email, responsavel.telefone, modelo.site].filter(Boolean).map((x, i) => (
                <div key={i}>{x}</div>
              ))}
            </div>
          </div>
          {aceite && (
            <div className={s.contato}>
              <span>{aceite.titulo || 'Aceite da proposta'}</span>
              <div className={s.assinatura}><i /><span>Nome e assinatura · {proposta.cliente}</span></div>
              <div className={s.assinatura} style={{ marginTop: 8 }}><i style={{ width: '50%' }} /><span>Data</span></div>
            </div>
          )}
        </div>
        <div className={s.cresce} />
        {rodape(primeiro(pagina, 'encerramento', rodapeTexto))}
      </div>
    )
  }

  // Texto livre: título e o HTML do editor rico.
  return (
    <div className={s.folha} style={estilo}>
      {topo()}
      {abertura(false)}
      <div className={s.livre} dangerouslySetInnerHTML={html(pagina.conteudo)} />
      <div className={s.cresce} />
      {rodape()}
    </div>
  )
}
