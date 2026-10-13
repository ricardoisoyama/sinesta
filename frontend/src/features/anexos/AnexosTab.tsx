import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Eye, Download, Trash2, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { confirmar } from '@/features/common/dialogo/dialogo'
import {
  EXTENSOES_ANEXO,
  TAMANHO_MAXIMO_ANEXO,
  baixarAnexo,
  enviarAnexo,
  excluirAnexo,
  listAnexos,
  type Anexo,
  type EntidadeAnexo,
} from './api'
import s from './anexos.module.css'

interface Props {
  entidade: EntidadeAnexo
  /** Id do registro dono. Vazio = cadastro ainda não salvo. */
  entidadeId: string
}

const tamanhoLegivel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

const dataHora = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const Icone = ({ tipo }: { tipo: string }) => {
  if (tipo.startsWith('image/')) return <ImageIcon />
  if (tipo === 'application/pdf') return <FileText />
  if (tipo.includes('sheet') || tipo.includes('excel')) return <FileSpreadsheet />
  return <FileIcon />
}

/** Aba "Documentos": lista, envia (PDF, Word, Excel, JPG até 12 MB), abre e exclui anexos. */
export function AnexosTab({ entidade, entidadeId }: Props) {
  const qc = useQueryClient()
  const chave = ['anexos', entidade, entidadeId]
  const { data, isLoading } = useQuery({ queryKey: chave, queryFn: () => listAnexos(entidade, entidadeId), enabled: !!entidadeId })
  const anexos = data ?? []
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!entidadeId)
    return (
      <div className={s.aviso}>
        Salve o cadastro primeiro. Depois é só reabrir e anexar os documentos aqui.
      </div>
    )

  const escolher = async (ev: ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(ev.target.files ?? [])
    ev.target.value = ''
    if (arquivos.length === 0) return
    setErro(null)
    setEnviando(true)
    try {
      for (const f of arquivos) {
        const ext = `.${f.name.split('.').pop()?.toLowerCase() ?? ''}`
        if (!EXTENSOES_ANEXO.includes(ext)) throw new Error(`"${f.name}": tipo não aceito. Envie PDF, Word, Excel ou JPG.`)
        if (f.size > TAMANHO_MAXIMO_ANEXO) throw new Error(`"${f.name}" passa de 12 MB.`)
        await enviarAnexo(entidade, entidadeId, f)
      }
      await qc.invalidateQueries({ queryKey: chave })
    } catch (err) {
      setErro(err instanceof Error && !('status' in err) ? err.message : getErrorMessage(err))
    } finally {
      setEnviando(false)
    }
  }

  const abrir = async (a: Anexo, salvar: boolean) => {
    setErro(null)
    try {
      const blob = await baixarAnexo(a.id)
      const url = URL.createObjectURL(blob)
      if (salvar) {
        const link = document.createElement('a')
        link.href = url
        link.download = a.nome
        link.click()
      } else {
        window.open(url, '_blank', 'noopener')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const excluir = async (a: Anexo) => {
    const ok = await confirmar({
      titulo: 'Excluir documento',
      mensagem: `Excluir o documento "${a.nome}"? Ele sai da lista; o arquivo fica guardado no servidor com o registro de quem excluiu.`,
      confirmar: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    setErro(null)
    try {
      await excluirAnexo(a.id)
      await qc.invalidateQueries({ queryKey: chave })
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const visualizavel = (a: Anexo) => a.tipo.startsWith('image/') || a.tipo === 'application/pdf'

  return (
    <div>
      <div className={s.topo}>
        <span className={s.dica}>PDF, Word, Excel ou JPG, até 12 MB por arquivo.</span>
        <input ref={inputRef} type="file" accept={EXTENSOES_ANEXO.join(',')} multiple onChange={escolher} hidden />
        <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => inputRef.current?.click()} disabled={enviando}>
          <Upload /> {enviando ? 'Enviando...' : 'Anexar documento'}
        </button>
      </div>

      {erro && <div className={s.erro}>{erro}</div>}

      {isLoading ? (
        <div className={s.aviso}>Carregando...</div>
      ) : anexos.length === 0 ? (
        <div className={s.aviso}>Nenhum documento anexado.</div>
      ) : (
        <ul className={s.lista}>
          {anexos.map((a) => (
            <li key={a.id} className={s.item}>
              <span className={s.icone}>
                <Icone tipo={a.tipo} />
              </span>
              <span className={s.nome} title={a.nome}>
                {a.nome}
              </span>
              <span className={s.meta}>
                {tamanhoLegivel(a.tamanho)} · {a.enviadoPor || 'sem autor'} · {dataHora(a.em)}
              </span>
              <span className={s.acoes}>
                {visualizavel(a) && (
                  <button type="button" className={ui.iconBtn} title="Visualizar" onClick={() => abrir(a, false)}>
                    <Eye />
                  </button>
                )}
                <button type="button" className={ui.iconBtn} title="Baixar" onClick={() => abrir(a, true)}>
                  <Download />
                </button>
                <button type="button" className={`${ui.iconBtn} ${ui.danger}`} title="Excluir" onClick={() => excluir(a)}>
                  <Trash2 />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
