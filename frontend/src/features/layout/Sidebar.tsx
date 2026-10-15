import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronsLeft, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { apiFetch } from '@/lib/api'
import { visibleGroups, type NavGroup } from './nav'
import { abrirSuporte } from '@/features/suporte/eventos'
import { useParticleField, useSunOrbit, type ParticleOptions } from './use-particles'
import styles from './AppLayout.module.css'

const SIDEBAR_PARTICLES: ParticleOptions = {
  count: 44, speed: 0.0008, rmin: 0.7, rrange: 1.9, par: 16, oa: 0.38, ca: 0.24,
}

/** Chave antiga da memória de grupos abertos: limpa para quem ainda a tem no navegador. */
const ABERTOS_KEY_ANTIGA = 'elrond.menu.abertos'

/** Grupo que contém a rota atual (para abrir sozinho ao navegar). */
const grupoDaRota = (groups: NavGroup[], path: string): string | undefined =>
  groups.find((g) => g.label && g.items.some((it) => path.startsWith(it.path)))?.label

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const asideRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const sunRef = useRef<HTMLCanvasElement>(null)

  useParticleField(bgRef, asideRef, SIDEBAR_PARTICLES)
  useSunOrbit(sunRef)

  const groups = visibleGroups(user?.permissoes)
  // Versão publicada neste ambiente (a mesma que o deploy confere em todos os ambientes).
  const { data: saude } = useQuery({
    queryKey: ['saude'],
    queryFn: () => apiFetch<{ versao: string }>('/saude'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  // Sanfona: um grupo aberto por vez. Ao navegar, abre o grupo da tela; trocar de tela dentro
  // do mesmo grupo não mexe em nada; abrir outro grupo fecha o anterior. Nada fica gravado.
  const ativo = grupoDaRota(groups, pathname)
  const [aberto, setAberto] = useState<string | undefined>(ativo)
  const [rotaVista, setRotaVista] = useState(ativo)
  if (ativo !== rotaVista) {
    setRotaVista(ativo)
    if (ativo) setAberto(ativo)
  }
  const estaAberto = (label: string) => aberto === label

  useEffect(() => {
    try {
      localStorage.removeItem(ABERTOS_KEY_ANTIGA)
    } catch {
      // storage indisponível: nada a limpar
    }
  }, [])

  const alternar = (label: string) => setAberto((a) => (a === label ? undefined : label))

  return (
    <aside className={styles.sidebar} ref={asideRef}>
      <canvas ref={bgRef} className={styles.sidebarBg} aria-hidden />

      <div className={styles.brand}>
        <div className={styles.sun}>
          <canvas ref={sunRef} aria-hidden />
        </div>
        <span className={styles.brandName}>Elrond</span>
      </div>

      <nav className={styles.nav}>
        {groups.map((g, i) => {
          // Recolhido ou não, a sanfona é a mesma: só os grupos e, abaixo do grupo aberto, as telas
          // dele (recolhido, só os ícones). Assim o menu não vira uma coluna de ícones sem fim.
          const aberto = !g.label || estaAberto(g.label)
          return (
            <div key={g.label ?? `g${i}`} className={g.label && aberto ? styles.navGrupoAberto : undefined}>
              {g.label && (
                <button
                  type="button"
                  className={`${styles.navGroupBtn} ${aberto ? styles.navGroupOpen : ''} ${g.label === ativo ? styles.navGroupAtivo : ''}`}
                  onClick={() => alternar(g.label!)}
                  title={collapsed ? g.label : undefined}
                  aria-expanded={aberto}
                >
                  {g.icon && <g.icon />}
                  <span>{g.label}</span>
                  <ChevronDown className={styles.navChevron} />
                </button>
              )}
              {aberto &&
                g.items.map((it) =>
                  it.acao === 'suporte' ? (
                    <button
                      key={it.path}
                      type="button"
                      onClick={abrirSuporte}
                      title={collapsed ? it.label : undefined}
                      className={`${styles.navItem} ${g.label ? styles.navItemSub : ''} ${styles.navItemAcao}`}
                    >
                      <it.icon />
                      <span>{it.label}</span>
                    </button>
                  ) : (
                  <NavLink
                    key={it.path}
                    to={it.path}
                    end
                    title={collapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      `${styles.navItem} ${g.label ? styles.navItemSub : ''} ${isActive ? styles.navItemActive : ''}`
                    }
                  >
                    <it.icon />
                    <span>{it.label}</span>
                  </NavLink>
                  ),
                )}
            </div>
          )
        })}
      </nav>

      <div className={styles.sbFoot}>
        <button className={styles.collapseBtn} onClick={onToggle}>
          <ChevronsLeft />
          <span>Recolher menu</span>
        </button>
        {!collapsed && saude?.versao && <span className={styles.sbVersao}>versão {saude.versao}</span>}
      </div>
    </aside>
  )
}
