import { useState, type ChangeEvent } from 'react'
import readXlsxFile from 'read-excel-file/browser'
import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Modal } from './Modal'
import { lerLinhas, texto, type ColunaImport, type LinhaMapeada, type Prevista } from './importador'
import ui from './ui.module.css'
import s from './importador.module.css'

interface Props<T> {
  open: boolean
  titulo: string
  descricao: string
  colunas: ColunaImport[]
  /** Nome do arquivo modelo baixado (ex.: "modelo-custos-fixos.xlsx"). */
  nomeArquivo: string
  mapear: (linha: Record<string, string>) => LinhaMapeada<T>
  onImportar: (itens: T[]) => Promise<void>
  onClose: () => void
}

/**
 * Importação de planilha em 3 passos: baixar o modelo, subir o arquivo preenchido
 * e conferir a prévia (linha a linha) antes de gravar. Reutilizável por qualquer
 * cadastro: quem usa só descreve as colunas e como mapear cada linha.
 */
export function ImportadorXlsx<T>({
  open,
  titulo,
  descricao,
  colunas,
  nomeArquivo,
  mapear,
  onImportar,
  onClose,
}: Props<T>) {
  const [linhas, setLinhas] = useState<Prevista<T>[]>([])
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const validas = linhas.filter((l) => l.item !== undefined)
  const invalidas = linhas.filter((l) => l.erro)

  const limpar = () => {
    setLinhas([])
    setArquivo('')
    setErro(null)
  }

  const baixarModelo = async () => {
    const cabecalho = colunas.map((c) => ({
      value: c.obrigatoria ? `${c.titulo} *` : c.titulo,
      fontWeight: 'bold' as const,
    }))
    const exemplo = colunas.map((c) => ({ value: texto(c.exemplo), type: String }))
    const dados: SheetData = [cabecalho, exemplo]
    const larguras = { columns: colunas.map(() => ({ width: 26 })) }
    await writeXlsxFile(dados, larguras).toFile(nomeArquivo)
  }

  const escolher = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setErro(null)
    setArquivo(file.name)

    try {
      const rows = (await readXlsxFile(file)) as unknown as unknown[][]
      const res = lerLinhas(rows, colunas, mapear)
      if ('erro' in res) {
        setLinhas([])
        setErro(res.erro)
        return
      }
      setLinhas(res.linhas)
    } catch {
      setLinhas([])
      setErro('Não foi possível ler o arquivo. Envie um .xlsx gerado a partir do modelo.')
    }
  }

  const importar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      await onImportar(validas.map((l) => l.item as T))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao importar.')
      setSalvando(false)
      return
    }
    setSalvando(false)
    limpar()
    onClose()
  }

  const fechar = () => {
    limpar()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={titulo}
      subtitle="Importar planilha"
      icon={<FileSpreadsheet />}
      maxWidth={860}
      error={erro}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={fechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            onClick={importar}
            disabled={validas.length === 0 || salvando}
          >
            {salvando ? 'Importando...' : `Importar ${validas.length} linha(s)`}
          </button>
        </>
      }
    >
      <p className={s.desc}>{descricao}</p>

      <div className={s.passos}>
        <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={baixarModelo}>
          <Download /> Baixar planilha modelo
        </button>
        <label className={s.upload}>
          <Upload />
          <span>{arquivo || 'Selecionar planilha preenchida (.xlsx)'}</span>
          <input type="file" accept=".xlsx" onChange={escolher} />
        </label>
      </div>

      {linhas.length > 0 && (
        <div className={s.previa}>
          <div className={s.previaTopo}>
            <span>
              <strong>{validas.length}</strong> linha(s) prontas
            </span>
            {invalidas.length > 0 && (
              <span className={s.comErro}>
                <strong>{invalidas.length}</strong> com problema (serão ignoradas)
              </span>
            )}
          </div>
          <div className={s.previaLista}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Conteúdo</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.linha}>
                    <td className={ui.cellMut}>{l.linha}</td>
                    <td className={ui.cellStrong}>{l.resumo}</td>
                    <td className={l.erro ? s.erroCell : s.okCell}>{l.erro ?? 'Pronta para importar'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
