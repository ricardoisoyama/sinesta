import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useParticleField, type ParticleOptions } from './use-particles'
import { GlobalSearch } from './GlobalSearch'
import styles from './AppLayout.module.css'

const TOPBAR_PARTICLES: ParticleOptions = {
  count: 26, speed: 0.001, rmin: 0.7, rrange: 1.7, par: 22, oa: 0.36, ca: 0.22,
}

export function Header() {
  const { user, signOut } = useAuth()
  const topbarRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useParticleField(bgRef, topbarRef, TOPBAR_PARTICLES)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const name = user?.name ?? 'Usuário'
  const role = user?.perfil ?? ''

  return (
    <header className={styles.topbar} ref={topbarRef}>
      <canvas ref={bgRef} className={styles.topbarBg} aria-hidden />

      <GlobalSearch />
      <div className={styles.spacer} />

      <div className={styles.usermenu} ref={menuRef}>
        <div className={styles.userChip} onClick={() => setOpen((o) => !o)}>
          <div className={styles.av}><img src="/sun.png" alt="" className={styles.avImg} /></div>
          <div className={styles.meta}>
            <b>{name}</b>
            <span>{role}</span>
          </div>
          <ChevronDown className={styles.cv} />
        </div>
        <div className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}>
          <div className={styles.duHead}>
            <b>{name}</b>
            <span>{user?.email ?? ''}</span>
          </div>
          <div className={styles.sep} />
          <div className={`${styles.du} ${styles.duDanger}`} onClick={signOut}>
            <LogOut /> Sair do sistema
          </div>
        </div>
      </div>
    </header>
  )
}
