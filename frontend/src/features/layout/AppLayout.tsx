import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CadastrosSync } from '@/features/cadastros/CadastrosSync'
import { RotaPermitida } from '@/features/auth/RotaPermitida'
import { SuporteWidget } from '@/features/suporte/SuporteWidget'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`${styles.app} ${collapsed ? styles.collapsed : ''}`}>
      <CadastrosSync />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <RotaPermitida>
            <Outlet />
          </RotaPermitida>
        </main>
      </div>
      <SuporteWidget />
    </div>
  )
}
