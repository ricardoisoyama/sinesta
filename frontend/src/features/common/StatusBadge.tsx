import ui from './ui.module.css'

export type Status = 'ativo' | 'inativo' | 'a_vencer'

const MAP: Record<Status, { label: string; cls: string }> = {
  ativo: { label: 'Ativo', cls: ui.badgeOk },
  // Inativo em vermelho: precisa saltar aos olhos numa lista longa.
  inativo: { label: 'Inativo', cls: ui.badgeErr },
  a_vencer: { label: 'A vencer', cls: ui.badgeWarn },
}

export function StatusBadge({ status }: { status: Status }) {
  const m = MAP[status]
  return <span className={`${ui.badge} ${m.cls}`}>{m.label}</span>
}
