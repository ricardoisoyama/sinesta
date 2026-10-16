import { useState } from 'react'
import { AlertTriangle, FlaskConical } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { CampoCep } from '@/features/common/CampoCep'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { gerarBoletoTeste, type Cobranca } from './api'
import s from './boleto.module.css'

const daquiA = (dias: number) => {
  const d = new Date(Date.now() + dias * 864e5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Boleto de TESTE (sem fatura): o pagador é quem está testando. Prova o ciclo inteiro (emitir,
 * consultar, PDF, cancelar). Em produção é um boleto real no banco: cancele depois do teste.
 */
export function BoletoTesteModal({ empresaId, producao, onClose, onGerado }: { empresaId: string; producao: boolean; onClose: () => void; onGerado: (c: Cobranca) => void }) {
  const [f, setF] = useState({ nome: '', documento: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', email: '', valor: 2.5, vencimento: daquiA(3) })
  const [erro, setErro] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const valido = f.nome.trim() && f.documento.replace(/\D/g, '').length >= 11 && f.rua.trim() && f.numero.trim() && f.cidade.trim() && f.uf.trim().length === 2 && f.cep.replace(/\D/g, '').length === 8 && f.valor >= 2.5

  const gerar = async () => {
    setErro(null)
    setBusy(true)
    try {
      const c = await gerarBoletoTeste({
        empresaId, nome: f.nome.trim(), documento: f.documento.replace(/\D/g, ''), rua: f.rua.trim(), numero: f.numero.trim(), complemento: f.complemento.trim(),
        bairro: f.bairro.trim(), cidade: f.cidade.trim(), uf: f.uf.trim().toUpperCase(), cep: f.cep.replace(/\D/g, ''), email: f.email.trim(), valor: f.valor, vencimento: f.vencimento,
      })
      onGerado(c)
    } catch (e) {
      setErro(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Boleto de teste"
      subtitle="Sem fatura: o pagador é você. Depois de ver o PDF, cancele na lista."
      icon={<FlaskConical />}
      maxWidth={640}
      maximizavel={false}
      error={erro}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valido || busy} onClick={gerar}>Gerar boleto de teste</button>
        </>
      }
    >
      {producao && (
        <div className={s.avisoProducao}>
          <AlertTriangle size={16} />
          <span><b>Produção:</b> este é um boleto REAL no Inter, registrado contra o CPF/CNPJ informado. Use o valor mínimo e cancele depois do teste.</span>
        </div>
      )}
      <div className={s.formTeste}>
        <label className={s.largo}>Nome do pagador<input value={f.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="O seu nome" /></label>
        <label>CPF ou CNPJ<input value={f.documento} onChange={(e) => set({ documento: e.target.value })} inputMode="numeric" /></label>
        <label>
          CEP
          <CampoCep value={f.cep} onChange={(cep) => set({ cep })} onEncontrado={(c) => set({ rua: c.logradouro || f.rua, bairro: c.bairro || f.bairro, cidade: c.cidade || f.cidade, uf: c.uf || f.uf })} />
        </label>
        <label className={s.largo}>Rua<input value={f.rua} onChange={(e) => set({ rua: e.target.value })} /></label>
        <label>Número<input value={f.numero} onChange={(e) => set({ numero: e.target.value })} /></label>
        <label>Complemento<input value={f.complemento} onChange={(e) => set({ complemento: e.target.value })} /></label>
        <label>Bairro<input value={f.bairro} onChange={(e) => set({ bairro: e.target.value })} /></label>
        <label>Cidade<input value={f.cidade} onChange={(e) => set({ cidade: e.target.value })} /></label>
        <label>UF<input value={f.uf} maxLength={2} onChange={(e) => set({ uf: e.target.value.toUpperCase() })} /></label>
        <label>E-mail (opcional)<input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></label>
        <label>Valor (R$)<input type="number" min={2.5} max={50} step="0.01" value={f.valor} onChange={(e) => set({ valor: Number(e.target.value) })} /></label>
        <label>Vencimento<input type="date" min={daquiA(0)} value={f.vencimento} onChange={(e) => set({ vencimento: e.target.value })} /></label>
      </div>
      <p className={s.notaTeste}>O valor mínimo do Inter é R$ 2,50. Os dados do pagador vão só para o banco; não ficam salvos em cadastro nenhum do ELROND (só no próprio boleto).</p>
    </Modal>
  )
}
