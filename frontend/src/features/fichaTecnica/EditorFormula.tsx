import { useRef } from 'react'
import { Eraser } from 'lucide-react'
import { formatBRL } from '@/lib/format'
import s from './editorFormula.module.css'

interface ColunaOpcao {
  chave: string
  nome: string
}

interface Props {
  valor: string
  onChange: (formula: string) => void
  /** Colunas que podem entrar na conta (as numéricas da ficha). */
  colunas: ColunaOpcao[]
  /** Resultado da conta no 1º item (prévia). */
  previa?: { valor: number; erro?: string } | null
  placeholder?: string
}

const SINAIS: { texto: string; insere: string; titulo: string }[] = [
  { texto: '+', insere: ' + ', titulo: 'Somar' },
  { texto: '−', insere: ' - ', titulo: 'Subtrair' },
  { texto: '×', insere: ' × ', titulo: 'Multiplicar' },
  { texto: '÷', insere: ' ÷ ', titulo: 'Dividir' },
  { texto: '(', insere: '(', titulo: 'Abrir parêntese: faz esta parte antes' },
  { texto: ')', insere: ')', titulo: 'Fechar parêntese' },
]

/** A conta em português: troca as chaves pelos nomes das colunas ("Valor hora × Horas"). */
function emPortugues(formula: string, colunas: ColunaOpcao[]): string {
  const nomes = new Map(colunas.map((c) => [c.chave, c.nome]))
  return formula
    .replace(/[a-zA-Z_À-ɏ][a-zA-Z0-9_À-ɏ]*/g, (k) => nomes.get(k) ?? k)
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Monta uma conta sem precisar saber "programar": clique nas colunas e nos sinais; dá para
 * digitar também. Mostra a conta com os nomes das colunas e o resultado no 1º item, ao vivo.
 */
export function EditorFormula({ valor, onChange, colunas, previa, placeholder }: Props) {
  const campo = useRef<HTMLInputElement>(null)

  // Insere onde está o cursor (ou no fim), já com espaço para ficar legível.
  const inserir = (texto: string) => {
    const el = campo.current
    const ini = el?.selectionStart ?? valor.length
    const fim = el?.selectionEnd ?? valor.length
    const antes = valor.slice(0, ini)
    const precisaEspaco = /[a-zA-Z0-9_)]$/.test(antes) && /^[a-zA-Z0-9_(]/.test(texto)
    const novo = `${antes}${precisaEspaco ? ' ' : ''}${texto}${valor.slice(fim)}`
    onChange(novo)
    requestAnimationFrame(() => {
      const pos = (antes + (precisaEspaco ? ' ' : '') + texto).length
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  const legivel = emPortugues(valor, colunas)

  return (
    <div className={s.editor}>
      <div className={s.linha}>
        <input
          ref={campo}
          className={s.campo}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Clique nas colunas e nos sinais abaixo'}
          spellCheck={false}
        />
        {valor && (
          <button type="button" className={s.limpar} title="Limpar a conta" onClick={() => onChange('')}>
            <Eraser size={14} />
          </button>
        )}
      </div>

      <div className={s.grupo}>
        <span className={s.rotulo}>Colunas</span>
        <div className={s.chips}>
          {colunas.length === 0 && <span className={s.vazio}>Nenhuma coluna numérica nesta ficha ainda.</span>}
          {colunas.map((c) => (
            <button key={c.chave} type="button" className={s.chip} title={`Inserir ${c.nome}`} onClick={() => inserir(c.chave)}>
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      <div className={s.grupo}>
        <span className={s.rotulo}>Sinais</span>
        <div className={s.chips}>
          {SINAIS.map((x) => (
            <button key={x.texto} type="button" className={s.sinal} title={x.titulo} onClick={() => inserir(x.insere)}>
              {x.texto}
            </button>
          ))}
        </div>
      </div>

      {valor.trim() && (
        <div className={s.leitura}>
          <span>Conta:</span> <b>{legivel}</b>
          {previa &&
            (previa.erro ? (
              <div className={s.erro}>{previa.erro}</div>
            ) : (
              <div className={s.ok}>No 1º item dá <b>{formatBRL(previa.valor)}</b></div>
            ))}
        </div>
      )}
      <p className={s.ajuda}>
        Ex.: <b>Valor hora × Horas</b>. Números também valem (× 1,5 ou × 20%). Parênteses só quando uma parte deve ser feita antes, como em
        (Salário + Adicional) × 70%.
      </p>
    </div>
  )
}
