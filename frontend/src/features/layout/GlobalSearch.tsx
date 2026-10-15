import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { visibleGroups } from './nav'
import { useAuth } from '@/features/auth/auth-context'
import { abrirSuporte } from '@/features/suporte/eventos'
import styles from './AppLayout.module.css'

export function GlobalSearch() {
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Só as telas que o usuário pode abrir (as mesmas do menu).
  const { user } = useAuth()
  const items = useMemo(
    () => visibleGroups(user?.permissoes).flatMap((g) => g.items.map((it) => ({ ...it, grupo: g.label ?? 'Geral' }))),
    [user?.permissoes],
  )

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return items.filter((it) => it.label.toLowerCase().includes(q)).slice(0, 12)
  }, [query, items])

  const go = (path: string, acao?: string) => {
    if (acao === 'suporte') abrirSuporte()
    else navigate(path)
    setQuery('')
    setOpen(false)
  }

  const showResults = open && query.trim().length >= 2

  return (
    <div className={styles.searchWrap} ref={wrapRef}>
      <div className={styles.search}>
        <Search />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar telas do sistema..."
        />
      </div>
      {showResults && (
        <div className={styles.searchResults}>
          {hits.length === 0 ? (
            <div className={styles.searchEmpty}>Nada encontrado para “{query}”.</div>
          ) : (
            hits.map((h) => (
              <div key={h.path} className={styles.searchItem} onClick={() => go(h.path, h.acao)}>
                <span className={styles.searchIcon}>
                  <h.icon />
                </span>
                <div className={styles.searchMain}>
                  <div className={styles.searchTitle}>{h.label}</div>
                  <div className={styles.searchSub}>{h.grupo}</div>
                </div>
                <span className={styles.searchTag}>{h.acao ? 'Abrir' : 'Tela'}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
