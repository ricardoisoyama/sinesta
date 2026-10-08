import type { ReactNode } from 'react'
import ui from './ui.module.css'

interface PageHeaderProps {
  breadcrumb: string
  title: string
  subtitle: string
  action?: ReactNode
  /** Cabeçalho enxuto: o caminho vira o título e o subtítulo fica na mesma linha (telas densas). */
  compacto?: boolean
}

export function PageHeader({ breadcrumb, title, subtitle, action, compacto }: PageHeaderProps) {
  if (compacto)
    return (
      <div className={`${ui.pageHead} ${ui.pageHeadCompacto}`}>
        <div className={ui.pageHeadLinha}>
          <div className={ui.breadcrumb}>
            {breadcrumb} <span>›</span> <b className={ui.breadcrumbTitulo}>{title}</b>
          </div>
          <div className={ui.pageSub}>{subtitle}</div>
        </div>
        {action}
      </div>
    )

  return (
    <div className={ui.pageHead}>
      <div>
        <div className={ui.breadcrumb}>{breadcrumb} <span>›</span> <b>{title}</b></div>
        <div className={ui.pageTitle}>{title}</div>
        <div className={ui.pageSub}>{subtitle}</div>
      </div>
      {action}
    </div>
  )
}
