import ui from './ui.module.css'

/** Toggle Ativo/Inativo (switch). */
export function StatusToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={ui.switchWrap} onClick={() => onChange(!value)}>
      <span className={`${ui.switch} ${value ? ui.switchOn : ''}`}><span className={ui.switchDot} /></span>
      <span className={ui.switchLbl}>{value ? 'Ativo' : 'Inativo'}</span>
    </button>
  )
}
