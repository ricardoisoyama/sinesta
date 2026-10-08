import { useMemo, useState } from 'react'

/** Estado/ações genéricos para uma lista CRUD em memória (mock). */
export function useCrud<T extends { id: string }>(
  initial: T[],
  searchFn: (item: T, q: string) => boolean,
  pageSize = 8,
) {
  const [items, setItems] = useState<T[]>(initial)
  const [query, setQueryRaw] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<T | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const setQuery = (v: string) => { setQueryRaw(v); setPage(1) }

  // Sempre aplica searchFn (com q vazio, searchFn deve aceitar todos), assim
  // filtros adicionais embutidos na searchFn valem mesmo sem texto de busca.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => searchFn(i, q))
  }, [items, query, searchFn])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize)

  return {
    items,
    /** Todas as linhas que passam na busca (o CrudList pagina e filtra por coluna). */
    filtered,
    query,
    setQuery,
    page: current,
    setPage,
    totalPages,
    total: filtered.length,
    paged,
    editing,
    modalOpen,
    openNew: () => { setEditing(null); setModalOpen(true) },
    openEdit: (it: T) => { setEditing(it); setModalOpen(true) },
    close: () => { setEditing(null); setModalOpen(false) },
    /** Substitui a lista (ex.: dados vindos da API). */
    reset: (list: T[]) => { setItems(list); setPage(1) },
    add: (it: T) => setItems((l) => [it, ...l]),
    update: (id: string, patch: Partial<T>) =>
      setItems((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    remove: (it: T) => {
      if (window.confirm('Remover este registro?')) setItems((l) => l.filter((x) => x.id !== it.id))
    },
  }
}
