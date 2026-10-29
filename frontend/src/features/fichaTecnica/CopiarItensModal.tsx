import { useState } from 'react'
import { AlertTriangle, FolderInput } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { Modal } from '@/features/common/Modal'
import { formatBRL } from '@/lib/format'
import { calcularFicha } from './calculo'
import { copiarParaFichas, type ModoRepetido, type PlanoCopia } from './copiar'
import type { ColunaFicha, FichaTecnica, GradeFichas } from './types'
import css from './fichaTecnica.module.css'

interface Props {
  grade: GradeFichas
  /** Ficha de onde saem os itens (fica fora da lista de destinos). */
  origemId: string
  origemNome: string
  /** Colunas ativas e itens ativos da ficha de origem, como a tela mostra. */
  colunas: ColunaFicha[]
  itens: FichaTecnica[]
  formulaTotal: string
  /** Item em que a pessoa clicou: já vem marcado. */
  marcado: string
  onClose: () => void
  onCopiar: (grade: GradeFichas, planos: PlanoCopia[], itens: number) => void
}

/** Marca itens da ficha aberta e as fichas de destino; mostra o que vai acontecer em cada uma antes de gravar. */
export function CopiarItensModal({
  grade,
  origemId,
  origemNome,
  colunas,
  itens,
  formulaTotal,
  marcado,
  onClose,
  onCopiar,
}: Props) {
  const [sel, setSel] = useState<string[]>(marcado ? [marcado] : [])
  const [destinos, setDestinos] = useState<string[]>([])
  const [modo, setModo] = useState<ModoRepetido>('substituir')
  const fichasDestino = grade.grupos.filter((g) => g.status === 'ativo' && g.id !== origemId)
  const escolhidos = itens.filter((f) => sel.includes(f.id))
  const alternar = (lista: string[], id: string) =>
    lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]

  const r = copiarParaFichas(grade, colunas, escolhidos, destinos, modo)
  const temRepetido = r.planos.some((p) => p.repetidos.length > 0)
  const nomeDe = (id: string) => grade.grupos.find((g) => g.id === id)?.nome || 'Sem nome'
  const pode = escolhidos.length > 0 && destinos.length > 0

  return (
    <Modal
      open
      onClose={onClose}
      title="Copiar para outra ficha"
      subtitle={`Os itens marcados de ${origemNome} vão com os seus custos. Nada sai daqui, e o que for copiado fica independente.`}
      icon={<FolderInput />}
      maxWidth={720}
      maximizavel={false}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            disabled={!pode}
            onClick={() => onCopiar(r.grade, r.planos, escolhidos.length)}
          >
            {escolhidos.length === 1 ? 'Copiar 1 item' : `Copiar ${escolhidos.length} itens`}
          </button>
        </>
      }
    >
      <div className={css.copiar}>
        <section>
          <div className={css.copiarTitulo}>
            Itens de {origemNome}
            {itens.length > 1 && (
              <button
                type="button"
                className={css.copiarTodos}
                onClick={() => setSel(sel.length === itens.length ? [] : itens.map((f) => f.id))}
              >
                {sel.length === itens.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            )}
          </div>
          <div className={css.copiarLista}>
            {itens.map((f) => (
              <label key={f.id} className={css.copiarOpcao}>
                <input
                  type="checkbox"
                  checked={sel.includes(f.id)}
                  onChange={() => setSel(alternar(sel, f.id))}
                />
                <span>{f.nome || 'Sem nome'}</span>
                <small>{formatBRL(calcularFicha(colunas, f.valores, formulaTotal).total)}</small>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className={css.copiarTitulo}>Para a ficha</div>
          {fichasDestino.length === 0 ? (
            <p className={css.copiarNota}>
              Não há outra ficha ativa. Crie uma em <b>+ Nova ficha</b>, ou use{' '}
              <b>Duplicar ficha</b>.
            </p>
          ) : (
            <div className={css.copiarLista}>
              {fichasDestino.map((g) => (
                <label key={g.id} className={css.copiarOpcao}>
                  <input
                    type="checkbox"
                    checked={destinos.includes(g.id)}
                    onChange={() => setDestinos(alternar(destinos, g.id))}
                  />
                  <span>{g.nome || 'Sem nome'}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {temRepetido && (
          <section>
            <div className={css.copiarTitulo}>Item com o mesmo nome no destino</div>
            <label className={css.copiarOpcao}>
              <input
                type="radio"
                name="modo-copia"
                checked={modo === 'substituir'}
                onChange={() => setModo('substituir')}
              />
              <span>Substituir os valores do item que já está lá</span>
            </label>
            <label className={css.copiarOpcao}>
              <input
                type="radio"
                name="modo-copia"
                checked={modo === 'novo'}
                onChange={() => setModo('novo')}
              />
              <span>Criar outro item, com "(cópia)" no nome</span>
            </label>
          </section>
        )}

        {pode && (
          <section className={css.copiarResumo}>
            <div className={css.copiarTitulo}>O que vai acontecer</div>
            {r.planos.map((p) => (
              <div key={p.grupoId} className={css.copiarDestino}>
                <b>{nomeDe(p.grupoId)}</b>
                <ul>
                  {p.novos > 0 && (
                    <li>{p.novos === 1 ? '1 item novo' : `${p.novos} itens novos`}</li>
                  )}
                  {modo === 'substituir' && p.repetidos.length > 0 && (
                    <li>Valores substituídos em: {p.repetidos.join(', ')}</li>
                  )}
                  {p.colunasNovas.length > 0 && (
                    <li>
                      Colunas criadas (iguais às de {origemNome}): {p.colunasNovas.join(', ')}
                    </li>
                  )}
                  {p.tipoDiferente.length > 0 && (
                    <li className={css.copiarAviso}>
                      <AlertTriangle size={13} /> Existem lá com outro tipo e o valor não vai:{' '}
                      {p.tipoDiferente.join(', ')}
                    </li>
                  )}
                  {p.mudamTotal > 0 && (
                    <li className={css.copiarAviso}>
                      <AlertTriangle size={13} />{' '}
                      {p.mudamTotal === 1
                        ? '1 item que já estava lá muda'
                        : `${p.mudamTotal} itens que já estavam lá mudam`}{' '}
                      de total por causa das colunas novas
                    </li>
                  )}
                  {p.totalPorFormula && (
                    <li className={css.copiarAviso}>
                      <AlertTriangle size={13} /> O total desta ficha sai de uma fórmula: confira se
                      as colunas novas devem entrar nela
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </Modal>
  )
}
