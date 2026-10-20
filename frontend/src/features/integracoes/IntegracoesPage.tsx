import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plug, Settings2, ShieldAlert } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { DataTable, type Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { listEmpresas } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { carteiraDaEmpresa } from '@/features/financeiro/types'
import { formatCnpj } from '@/lib/format'
import { listBancos, listIntegracoes, ROTULO_RECURSO, type Integracao } from './api'
import { diasAteVencer } from './regras'
import { IntegracaoModal } from './IntegracaoModal'
import s from './integracoes.module.css'

/** Uma linha do grid: a empresa com uma integração dela, ou sem nenhuma ainda. */
interface Linha {
  chave: string
  empresa: { id: string; nome: string; cnpj: string }
  integracao: Integracao | null
}

const hoje = () => new Date()
const dataBR = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

/**
 * Administrativo › Integrações (só o perfil Suporte, a equipe ELROND): o banco de cada empresa
 * (CNPJ), com ambiente, credenciais, certificado e os padrões dos boletos. Nasce desligada;
 * ligamos a pedido do cliente.
 */
export function IntegracoesPage() {
  const qc = useQueryClient()
  const empresasQ = useQuery({ queryKey: ['empresas'], queryFn: listEmpresas })
  const integracoesQ = useQuery({ queryKey: ['integracoes'], queryFn: listIntegracoes })
  const bancosQ = useQuery({ queryKey: ['integracoes', 'bancos'], queryFn: listBancos })
  const carteirasQ = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const [aberta, setAberta] = useState<Linha | null>(null)

  const bancos = useMemo(() => bancosQ.data ?? [], [bancosQ.data])
  const nomeBanco = (codigo: string) => bancos.find((b) => b.codigo === codigo)?.nome ?? codigo
  const carteiras = carteirasQ.data ?? []

  const linhas = useMemo<Linha[]>(() => {
    const integracoes = integracoesQ.data ?? []
    return (empresasQ.data ?? [])
      .filter((e) => e.status !== 'inativo')
      .flatMap((e): Linha[] => {
        const empresa = { id: e.id, nome: e.nome, cnpj: e.cnpj }
        const daEmpresa = integracoes.filter((i) => i.empresaId === e.id)
        return daEmpresa.length
          ? daEmpresa.map((i) => ({ chave: i.id, empresa, integracao: i }))
          : [{ chave: `sem-${e.id}`, empresa, integracao: null }]
      })
  }, [empresasQ.data, integracoesQ.data])

  const ligadas = linhas.filter((l) => l.integracao?.ativa).length
  const vencendo = linhas.filter((l) => {
    const d = l.integracao ? diasAteVencer(l.integracao.certificadoValidoAte, hoje()) : null
    return d !== null && d <= 30
  })

  const columns: Column<Linha>[] = [
    {
      header: 'Empresa',
      fixa: true,
      valor: (l) => `${l.empresa.nome} ${l.empresa.cnpj}`,
      cell: (l) => (
        <div>
          <div className={ui.cellStrong}>{l.empresa.nome}</div>
          <div className={ui.cellMut}>{l.empresa.cnpj ? formatCnpj(l.empresa.cnpj) : 'Sem CNPJ'}</div>
        </div>
      ),
    },
    {
      header: 'Banco',
      largura: LARGURA.media,
      valor: (l) => (l.integracao ? nomeBanco(l.integracao.banco) : ''),
      cell: (l) => (l.integracao ? <span>{nomeBanco(l.integracao.banco)}</span> : <span className={ui.cellMut}>Sem integração</span>),
    },
    // Logo depois do banco: é o que diz se a integração funciona (não fica escondida na rolagem).
    {
      header: 'Situação',
      largura: LARGURA.status,
      valor: (l) => (l.integracao?.ativa ? 'Ligada' : l.integracao ? 'Desligada' : ''),
      cell: (l) =>
        l.integracao ? (
          <span className={`${ui.badge} ${l.integracao.ativa ? ui.badgeOk : ui.badgeOff}`}>{l.integracao.ativa ? 'Ligada' : 'Desligada'}</span>
        ) : (
          <span className={ui.cellMut}>—</span>
        ),
    },
    {
      header: 'Ambiente',
      largura: LARGURA.curta,
      valor: (l) => l.integracao?.ambiente ?? '',
      cell: (l) =>
        l.integracao ? (
          <span className={`${ui.badge} ${l.integracao.ambiente === 'producao' ? s.badgeProducao : ui.badgeOff}`}>
            {l.integracao.ambiente === 'producao' ? 'Produção' : 'Sandbox'}
          </span>
        ) : (
          <span className={ui.cellMut}>—</span>
        ),
    },
    {
      header: 'Recursos',
      largura: LARGURA.longa,
      valor: (l) => l.integracao?.recursos.map((r) => ROTULO_RECURSO[r]).join(', ') ?? '',
      cell: (l) => <span className={ui.cellMut}>{l.integracao?.recursos.map((r) => ROTULO_RECURSO[r]).join(' · ') || '—'}</span>,
    },
    {
      header: 'Certificado',
      largura: LARGURA.data,
      valor: (l) => l.integracao?.certificadoValidoAte ?? '',
      cell: (l) => {
        if (!l.integracao) return <span className={ui.cellMut}>—</span>
        const d = diasAteVencer(l.integracao.certificadoValidoAte, hoje())
        const alerta = d !== null && d <= 30
        return (
          <span className={alerta ? s.textoAlerta : ui.cellMut} title={alerta ? (d! < 0 ? 'Vencido' : `Faltam ${d} dias`) : undefined}>
            {alerta && <ShieldAlert size={13} />} até {dataBR(l.integracao.certificadoValidoAte)}
          </span>
        )
      },
    },
    {
      header: 'Conta no Caixa',
      largura: LARGURA.media,
      valor: (l) => carteiras.find((c) => c.id === l.integracao?.carteiraId)?.nome ?? '',
      cell: (l) => {
        const c = carteiras.find((x) => x.id === l.integracao?.carteiraId)
        return c ? <span>{c.nome}</span> : <span className={ui.cellMut}>{l.integracao ? 'Nenhuma conta' : '—'}</span>
      },
    },
    {
      header: 'Ações',
      fixa: true,
      largura: 132,
      className: ui.colActions,
      cell: (l) => (
        <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnLinha}`} onClick={() => setAberta(l)}>
          <Settings2 /> {l.integracao ? 'Configurar' : 'Integrar'}
        </button>
      ),
    },
  ]

  const carregando = empresasQ.isLoading || integracoesQ.isLoading || bancosQ.isLoading

  return (
    <div>
      <PageHeader
        breadcrumb="Administrativo"
        title="Integrações Bancárias"
        subtitle="O banco de cada empresa (CNPJ): ambiente, credenciais, certificado e os padrões dos boletos. Só a equipe ELROND vê esta tela."
      />

      <div className={s.resumo}>
        <span><Plug size={15} /> {ligadas} {ligadas === 1 ? 'integração ligada' : 'integrações ligadas'}</span>
        {vencendo.length > 0 && (
          <span className={s.textoAlerta}>
            <ShieldAlert size={15} /> Certificado vencendo: {vencendo.map((l) => l.empresa.nome).join(', ')}
          </span>
        )}
      </div>

      <div className={ui.card}>
        {carregando ? (
          <div className={ui.empty}>Carregando...</div>
        ) : (
          <DataTable columns={columns} rows={linhas} getKey={(l) => l.chave} empty="Nenhuma empresa ativa." />
        )}
      </div>

      {aberta && (
        <IntegracaoModal
          key={aberta.chave}
          empresa={aberta.empresa}
          integracao={aberta.integracao}
          bancos={bancos}
          carteiras={carteiras.filter((c) => c.tipo === 'banco' && c.status !== 'inativo' && carteiraDaEmpresa(c, aberta.empresa.id))}
          onClose={() => setAberta(null)}
          onSaved={() => {
            setAberta(null)
            void qc.invalidateQueries({ queryKey: ['integracoes'] })
          }}
        />
      )}
    </div>
  )
}
