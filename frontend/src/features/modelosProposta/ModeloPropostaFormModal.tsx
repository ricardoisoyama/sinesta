import { useState, type ChangeEvent } from 'react'
import { FileText, Eye, Trash2, ChevronUp, ChevronDown, Image, Type, Table, Users, ListChecks, Footprints, Plus, X } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { RichText } from '@/features/common/RichText'
import ui from '@/features/common/ui.module.css'
import { formatTelefone } from '@/lib/format'
import { mockUnidades } from '@/features/unidades/mock'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { PropostaPdfView } from '@/features/propostas/PropostaPdfView'
import { PaginaView } from '@/features/propostas/PaginaView'
import type { Proposta } from '@/features/propostas/types'
import type { ItemPagina, ModeloProposta, Pagina, TipoPagina } from './types'
import { COR_PRINCIPAL_PADRAO, TIPOS_PAGINA, novaPagina, paginasPadrao } from './types'
import b from './builder.module.css'

interface Props {
  open: boolean
  initial?: ModeloProposta | null
  error?: string | null
  onClose: () => void
  onSave: (data: ModeloProposta) => void
}

const empresasAtivas = () => mockUnidades.filter((u) => u.status === 'ativo')
const logoDe = (empresaId: string) => mockUnidades.find((u) => u.id === empresaId)?.logo || '/sinesta-logo.png'
const tipoLabel = (tipo: TipoPagina) => TIPOS_PAGINA.find((t) => t.tipo === tipo)?.label ?? tipo

const emptyModelo = (): ModeloProposta => ({
  id: '',
  empresaId: empresasAtivas()[0]?.id ?? '',
  nome: '',
  cor: '#ff6a39',
  corPrincipal: COR_PRINCIPAL_PADRAO,
  logoCapa: '',
  rodapeEmpresa: 'Sinesta · Tecnologia para operações de serviços',
  responsavel: '',
  email: '',
  telefone: '',
  site: '',
  paginas: paginasPadrao(),
  status: 'ativo',
})

/** Proposta de exemplo (só para preview/miniaturas). */
const propostaExemplo = (empresaId: string): Proposta => ({
  id: 'preview',
  numero: 'SIN-0000',
  cliente: 'Cliente de exemplo',
  status: 'rascunho',
  data: '00/00/0000',
  validade: '15 dias',
  formaPagamento: 'Boleto',
  prazoPagamentoDias: 30,
  total: 8790,
  itens: [
    { id: '1', descricao: 'Licença da plataforma', empresaId, custoTotal: 0, lucro: 0, desconto: 0, pv: 0, precoFinal: 1890, ml: 0.08 },
    { id: '2', descricao: 'Suporte e evolução', empresaId, custoTotal: 0, lucro: 0, desconto: 0, pv: 0, precoFinal: 2400, ml: 0.1 },
    { id: '3', descricao: 'Implantação', empresaId, custoTotal: 0, lucro: 0, desconto: 0, pv: 0, precoFinal: 4500, ml: 0.1 },
  ],
})

/** Logo da capa (fundo escuro): reduzida antes de guardar, porque vai em base64 no modelo. */
function lerLogo(file: File, pronto: (dataUrl: string) => void) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new window.Image()
    img.onload = () => {
      const escala = Math.min(1, 900 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * escala))
      canvas.height = Math.max(1, Math.round(img.height * escala))
      const ctx = canvas.getContext('2d')
      if (!ctx) return pronto(String(reader.result))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      pronto(canvas.toDataURL('image/png'))
    }
    img.onerror = () => pronto(String(reader.result))
    img.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

export function ModeloPropostaFormModal({ open, initial, error, onClose, onSave }: Props) {
  const [preview, setPreview] = useState(false)
  const handleClose = () => {
    setPreview(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Modelo de Proposta"
      subtitle={initial ? 'Editar modelo' : 'Novo modelo'}
      icon={<FileText />}
      maxWidth={980}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setPreview(true)}>
            <Eye size={16} /> Preview
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={handleClose}>
            Cancelar
          </button>
          <button type="submit" form="modeloForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <ModeloForm
        key={initial?.id ?? 'new'}
        initial={initial ?? emptyModelo()}
        onSave={onSave}
        preview={preview}
        onClosePreview={() => setPreview(false)}
      />
    </Modal>
  )
}

function ModeloForm({
  initial,
  onSave,
  preview,
  onClosePreview,
}: {
  initial: ModeloProposta
  onSave: (d: ModeloProposta) => void
  preview: boolean
  onClosePreview: () => void
}) {
  const [d, setD] = useState<ModeloProposta>(initial.paginas.length ? initial : { ...initial, paginas: paginasPadrao() })
  const [sel, setSel] = useState(0)
  const set = (patch: Partial<ModeloProposta>) => setD((prev) => ({ ...prev, ...patch }))
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const logo = logoDe(d.empresaId)
  const exemplo = propostaExemplo(d.empresaId)

  const setPagina = (i: number, patch: Partial<Pagina>) =>
    setD((prev) => ({ ...prev, paginas: prev.paginas.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }))

  const addPagina = (tipo: TipoPagina) => {
    setD((prev) => ({ ...prev, paginas: [...prev.paginas, novaPagina(tipo)] }))
    setSel(d.paginas.length)
  }

  const removePagina = (i: number) => {
    setD((prev) => ({ ...prev, paginas: prev.paginas.filter((_, idx) => idx !== i) }))
    setSel((s) => Math.max(0, Math.min(s, d.paginas.length - 2)))
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= d.paginas.length) return
    setD((prev) => {
      const arr = [...prev.paginas]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...prev, paginas: arr }
    })
    setSel(j)
  }

  const pagina = d.paginas[sel] as Pagina | undefined

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!d.nome.trim()) return
    onSave(d)
  }

  return (
    <>
      <form id="modeloForm" onSubmit={submit} noValidate>
        {/* Geral */}
        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Empresa" req>
              <select value={d.empresaId} onChange={(e) => set({ empresaId: e.target.value })}>
                {!d.empresaId && (
                  <option value="" disabled>
                    {empresas.length ? 'Selecione' : 'Cadastre uma empresa primeiro'}
                  </option>
                )}
                {empresas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field className={ui.col1} label="Nome do modelo" req>
              <input value={d.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Padrão" />
            </Field>
            <Field className={ui.col1} label="Cor principal" hint="Fundo da capa, da última página e das faixas.">
              <input type="color" value={d.corPrincipal || COR_PRINCIPAL_PADRAO} onChange={(e) => set({ corPrincipal: e.target.value })} style={{ height: 36, padding: 2 }} />
            </Field>
            <Field className={ui.col1} label="Cor de destaque" hint="Rótulos, números e detalhes.">
              <input type="color" value={d.cor} onChange={(e) => set({ cor: e.target.value })} style={{ height: 36, padding: 2 }} />
            </Field>
            <Field className={ui.col2} label="Logo da capa (para fundo escuro)" hint="Versão clara do logo, que aparece grande na capa e no topo da última página. Sem ela, vai o logo da empresa num selo branco.">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {d.logoCapa ? (
                  <span style={{ background: d.corPrincipal || COR_PRINCIPAL_PADRAO, borderRadius: 8, padding: '6px 10px', display: 'inline-flex' }}>
                    <img src={d.logoCapa} alt="Logo da capa" style={{ height: 28, maxWidth: 200, objectFit: 'contain' }} />
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#9aa39b' }}>Sem logo da capa</span>
                )}
                <label className={`${ui.btn} ${ui.btnGhost}`} style={{ cursor: 'pointer' }}>
                  Enviar logo
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/webp,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const f = e.target.files?.[0]
                      if (f) lerLogo(f, (url) => set({ logoCapa: url }))
                      e.target.value = ''
                    }}
                  />
                </label>
                {d.logoCapa && (
                  <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => set({ logoCapa: '' })}>
                    Remover
                  </button>
                )}
              </div>
            </Field>
          </div>
        </section>

        {/* Rodapé / contato */}
        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Rodapé e contato padrão
            <span className={ui.fsectionHint}>o responsável da proposta é quem a gera (o vendedor dela); este contato só vale quando ele não tem e-mail ou telefone no cadastro</span>
          </div>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Texto do rodapé">
              <input value={d.rodapeEmpresa} onChange={(e) => set({ rodapeEmpresa: e.target.value })} />
            </Field>
            <Field className={ui.col2} label="Responsável padrão">
              <input value={d.responsavel} onChange={(e) => set({ responsavel: e.target.value })} />
            </Field>
            <Field className={ui.col2} label="E-mail">
              <input value={d.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field className={ui.col1} label="Telefone">
              <input
                value={d.telefone}
                onChange={(e) => set({ telefone: formatTelefone(e.target.value) })}
                placeholder="(00) 0000-0000"
                inputMode="numeric"
                maxLength={15}
              />
            </Field>
            <Field className={ui.col1} label="Site">
              <input value={d.site} onChange={(e) => set({ site: e.target.value })} />
            </Field>
          </div>
        </section>

        {/* Páginas */}
        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>Páginas ({d.paginas.length})</div>

          <div className={b.builder}>
            {/* miniaturas */}
            <div className={b.sidebar}>
              {d.paginas.map((pg, i) => (
                <div key={pg.id} className={b.thumbWrap}>
                  <div
                    className={`${b.thumb} ${i === sel ? b.thumbSel : ''}`}
                    onClick={() => setSel(i)}
                    title={pg.titulo}
                  >
                    <span className={b.thumbNum}>{i + 1}</span>
                    <div className={b.thumbScale}>
                      <PaginaView pagina={pg} modelo={d} proposta={exemplo} logo={logo} numero={i + 1} total={d.paginas.length} />
                    </div>
                  </div>
                  <div className={b.thumbLabel}>{tipoLabel(pg.tipo)}</div>
                  <div className={b.thumbActions}>
                    <button type="button" className={b.thumbBtn} onClick={() => move(i, -1)} disabled={i === 0} title="Subir">
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" className={b.thumbBtn} onClick={() => move(i, 1)} disabled={i === d.paginas.length - 1} title="Descer">
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={`${b.thumbBtn} ${b.thumbBtnDanger}`}
                      onClick={() => removePagina(i)}
                      disabled={d.paginas.length <= 1}
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className={b.addRow}>
                <span className={b.addTitle}>Adicionar</span>
                <button type="button" className={b.addBtn} onClick={() => addPagina('capa')}>
                  <Image /> Capa
                </button>
                <button type="button" className={b.addBtn} onClick={() => addPagina('sobre')}>
                  <Users /> Quem somos
                </button>
                <button type="button" className={b.addBtn} onClick={() => addPagina('composicao')}>
                  <Table /> Composição
                </button>
                <button type="button" className={b.addBtn} onClick={() => addPagina('escopo')}>
                  <ListChecks /> Escopo
                </button>
                <button type="button" className={b.addBtn} onClick={() => addPagina('proximos')}>
                  <Footprints /> Próximos passos
                </button>
                <button type="button" className={b.addBtn} onClick={() => addPagina('conteudo')}>
                  <Type /> Texto livre
                </button>
              </div>
            </div>

            {/* editor da página selecionada */}
            <div className={b.editor}>
              {!pagina ? (
                <div className={b.autoNote}>Nenhuma página. Adicione uma ao lado.</div>
              ) : (
                <EditorPagina key={pagina.id} pagina={pagina} onChange={(patch) => setPagina(sel, patch)} />
              )}
            </div>
          </div>
        </section>
      </form>

      {preview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,26,22,0.9)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* barra de topo clara e sólida */}
          <div
            style={{
              background: '#f6f5f1',
              borderBottom: '1px solid #e2ddd0',
              padding: '10px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#4a5a50', fontSize: 13, fontWeight: 600 }}>
              Preview · {d.paginas.length} páginas <span style={{ color: '#9aa39b', fontWeight: 400 }}>(dados de exemplo)</span>
            </span>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={onClosePreview}>
              Fechar preview
            </button>
          </div>

          {/* área com scroll */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }} onClick={onClosePreview}>
            <div style={{ maxWidth: 820, margin: '0 auto' }} onClick={(e) => e.stopPropagation()}>
              <PropostaPdfView modelo={d} proposta={exemplo} exemplo />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Lista de blocos de um grupo da página (indicadores, cartões, linhas, passos...), com + e ×. */
function ListaBlocos({
  pagina,
  grupo,
  titulo,
  dica,
  rotuloTitulo,
  rotuloTexto,
  onChange,
}: {
  pagina: Pagina
  grupo: string
  titulo: string
  dica?: string
  rotuloTitulo: string
  /** Sem rótulo de texto = o bloco só tem uma linha (ex.: item de lista, módulo). */
  rotuloTexto?: string
  onChange: (itens: ItemPagina[]) => void
}) {
  const todos = pagina.itens ?? []
  const meus = todos.filter((x) => x.grupo === grupo)
  // Reescreve só os blocos deste grupo, mantendo os dos outros na mesma ordem.
  const trocar = (novos: ItemPagina[]) => onChange([...todos.filter((x) => x.grupo !== grupo), ...novos])
  const upd = (i: number, patch: Partial<ItemPagina>) => trocar(meus.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className={ui.fsectionTitle} style={{ marginBottom: 0 }}>
        {titulo} {dica && <span className={ui.fsectionHint}>{dica}</span>}
      </div>
      {meus.map((x, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: rotuloTexto ? 'minmax(0, 1fr) minmax(0, 1.6fr) 32px' : 'minmax(0, 1fr) 32px', gap: 8, alignItems: 'center' }}>
          <input value={x.titulo} onChange={(e) => upd(i, { titulo: e.target.value })} placeholder={rotuloTitulo} aria-label={rotuloTitulo} />
          {rotuloTexto && <input value={x.texto} onChange={(e) => upd(i, { texto: e.target.value })} placeholder={rotuloTexto} aria-label={rotuloTexto} />}
          <button type="button" className={ui.iconBtn} title="Remover" onClick={() => trocar(meus.filter((_, j) => j !== i))}>
            <X />
          </button>
        </div>
      ))}
      <button type="button" className={`${ui.btn} ${ui.btnGhost}`} style={{ alignSelf: 'flex-start' }} onClick={() => trocar([...meus, { grupo, titulo: '', texto: '' }])}>
        <Plus /> Adicionar
      </button>
    </div>
  )
}

/** Um campo de texto único guardado como bloco (título de seção, tributação, encerramento...). */
function TextoBloco({ pagina, grupo, label, hint, onChange }: { pagina: Pagina; grupo: string; label: string; hint?: string; onChange: (itens: ItemPagina[]) => void }) {
  const todos = pagina.itens ?? []
  const atual = todos.find((x) => x.grupo === grupo)
  return (
    <div style={{ marginTop: 12 }}>
      <Field label={label} hint={hint}>
        <input
          value={atual?.titulo ?? ''}
          onChange={(e) => onChange(atual ? todos.map((x) => (x === atual ? { ...x, titulo: e.target.value } : x)) : [...todos, { grupo, titulo: e.target.value, texto: '' }])}
        />
      </Field>
    </div>
  )
}

/** Editor da página escolhida, conforme o tipo. */
function EditorPagina({ pagina, onChange }: { pagina: Pagina; onChange: (patch: Partial<Pagina>) => void }) {
  const itens = (v: ItemPagina[]) => onChange({ itens: v })
  const blocoUnico = (grupo: string) => (pagina.itens ?? []).find((x) => x.grupo === grupo)
  const setUnico = (grupo: string, patch: Partial<ItemPagina>) => {
    const todos = pagina.itens ?? []
    const atual = blocoUnico(grupo)
    itens(atual ? todos.map((x) => (x === atual ? { ...x, ...patch } : x)) : [...todos, { grupo, titulo: '', texto: '', ...patch }])
  }

  if (pagina.tipo === 'capa')
    return (
      <>
        <div className={b.autoNote}>
          A capa mostra o logo grande, o número da proposta, o cliente, a data, a validade e o <b>responsável</b> (quem gera a proposta), preenchidos na hora de gerar.
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Título">
            <input value={pagina.titulo} onChange={(e) => onChange({ titulo: e.target.value })} placeholder="Ex.: SINESTA Tecnologia" />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Subtítulo">
            <input value={pagina.subtitulo} onChange={(e) => onChange({ subtitulo: e.target.value })} />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Objetivo desta proposta">
            <textarea rows={3} value={pagina.conteudo.replace(/<[^>]+>/g, '')} onChange={(e) => onChange({ conteudo: e.target.value })} />
          </Field>
        </div>
      </>
    )

  const comuns = (
    <>
      <div className={ui.grid}>
        <Field className={ui.col1} label="Rótulo" hint="O texto pequeno acima do título (ex.: Quem somos).">
          <input value={pagina.subtitulo} onChange={(e) => onChange({ subtitulo: e.target.value })} />
        </Field>
        <Field className={ui.col3} label="Título">
          <input value={pagina.titulo} onChange={(e) => onChange({ titulo: e.target.value })} />
        </Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label={pagina.tipo === 'conteudo' ? 'Conteúdo' : 'Introdução'}>
          <RichText key={pagina.id} value={pagina.conteudo} onChange={(h) => onChange({ conteudo: h })} />
        </Field>
      </div>
    </>
  )

  if (pagina.tipo === 'sobre')
    return (
      <>
        {comuns}
        <ListaBlocos pagina={pagina} grupo="destaque" titulo="Indicadores" dica="até 3 números em destaque" rotuloTitulo="Número (ex.: 120+)" rotuloTexto="Legenda" onChange={itens} />
        <TextoBloco pagina={pagina} grupo="titulo-apoio" label="Título dos cartões" onChange={itens} />
        <ListaBlocos pagina={pagina} grupo="apoio" titulo="Cartões" rotuloTitulo="Título (ex.: Implantação)" rotuloTexto="Texto" onChange={itens} />
        <TextoBloco pagina={pagina} grupo="titulo-modulos" label="Título das etiquetas" onChange={itens} />
        <ListaBlocos pagina={pagina} grupo="modulo" titulo="Etiquetas" dica="módulos, serviços ou diferenciais" rotuloTitulo="Etiqueta" onChange={itens} />
      </>
    )

  if (pagina.tipo === 'composicao')
    return (
      <>
        <div className={b.autoNote}>
          A <b>tabela de serviços</b> (serviço, detalhes da operação, quantidade e valor), o <b>total</b> e as <b>condições comerciais</b> (pagamento, validade e prazo) saem da proposta na hora de gerar.
        </div>
        <div style={{ marginTop: 12 }}>{comuns}</div>
        <TextoBloco pagina={pagina} grupo="tributacao" label="Tributação" hint="Texto da linha Tributação nas condições comerciais." onChange={itens} />
      </>
    )

  if (pagina.tipo === 'escopo') {
    const validade = blocoUnico('validade')
    const faixa = blocoUnico('faixa')
    return (
      <>
        {comuns}
        <ListaBlocos pagina={pagina} grupo="contemplado" titulo="Escopo contemplado" rotuloTitulo="Item" onChange={itens} />
        <ListaBlocos pagina={pagina} grupo="premissa" titulo="Premissas" rotuloTitulo="Item" onChange={itens} />
        <ListaBlocos pagina={pagina} grupo="fora" titulo="Fora do escopo" rotuloTitulo="Item" onChange={itens} />
        <div style={{ marginTop: 12 }} className={ui.grid}>
          <Field className={ui.col1} label="Quadro de validade: título">
            <input value={validade?.titulo ?? ''} onChange={(e) => setUnico('validade', { titulo: e.target.value })} placeholder="Validade e reajuste" />
          </Field>
          <Field className={ui.col3} label="Texto" hint="A validade da proposta entra antes deste texto, sozinha.">
            <input value={validade?.texto ?? ''} onChange={(e) => setUnico('validade', { texto: e.target.value })} />
          </Field>
          <Field className={ui.col1} label="Faixa em destaque: título">
            <input value={faixa?.titulo ?? ''} onChange={(e) => setUnico('faixa', { titulo: e.target.value })} placeholder="Em branco = sem faixa" />
          </Field>
          <Field className={ui.col3} label="Texto">
            <input value={faixa?.texto ?? ''} onChange={(e) => setUnico('faixa', { texto: e.target.value })} />
          </Field>
        </div>
      </>
    )
  }

  if (pagina.tipo === 'proximos') {
    const aceite = blocoUnico('aceite')
    return (
      <>
        <div className={b.autoNote}>O cartão <b>Fale com a gente</b> mostra o responsável pela proposta (quem a gera), com o e-mail e o telefone do cadastro dele.</div>
        <div style={{ marginTop: 12 }}>{comuns}</div>
        <ListaBlocos pagina={pagina} grupo="passo" titulo="Passos" dica="numerados na ordem" rotuloTitulo="Passo" rotuloTexto="Explicação" onChange={itens} />
        <label className={ui.checkItem} style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            checked={!!aceite}
            onChange={(e) => itens(e.target.checked ? [...(pagina.itens ?? []), { grupo: 'aceite', titulo: 'Aceite da proposta', texto: '' }] : (pagina.itens ?? []).filter((x) => x.grupo !== 'aceite'))}
          />
          Campo de aceite (assinatura e data do cliente)
        </label>
        <TextoBloco pagina={pagina} grupo="encerramento" label="Frase do rodapé" hint="Ex.: Obrigado pelo tempo e pela análise." onChange={itens} />
      </>
    )
  }

  return comuns
}
