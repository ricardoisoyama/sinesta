import { z } from 'zod'
import { placaValida } from './types'

const placa = (obrigatoria: boolean) =>
  z.string().refine((p) => (!p ? !obrigatoria : placaValida(p)), { message: obrigatoria ? 'Informe uma placa válida (ABC-1234 ou ABC1D23)' : 'Placa inválida (ABC-1234 ou ABC1D23)' })

export const veiculoSchema = z.object({
  status: z.enum(['ativo', 'inativo']),
  placaTracao: placa(true),
  placaReboque: placa(false),
  renavam: z.string().refine((r) => !r || [9, 11].includes(r.replace(/\D/g, '').length), { message: 'O Renavam tem 11 dígitos (os antigos, 9)' }),
  chassi: z.string(),
  antt: z.string(),
  tipoVeiculo: z.string().min(1, 'Escolha o tipo de veículo'),
  tipoCarroceria: z.string(),
  tecnologia: z.string(),
  travaQuintaRoda: z.string(),
  blindado: z.string(),
  marca: z.string(),
  modelo: z.string(),
  cor: z.string(),
  perfil: z.string(),
  cpfCnpj: z.string(),
  nomeProprietario: z.string(),
  dataNascimento: z.string(),
  rg: z.string(),
  ufRg: z.string(),
  nomeMae: z.string(),
  telefone: z.string(),
})

export type VeiculoForm = z.infer<typeof veiculoSchema>

export const emptyVeiculo: VeiculoForm = {
  status: 'ativo',
  placaTracao: '', placaReboque: '', renavam: '', chassi: '', antt: '',
  tipoVeiculo: '', tipoCarroceria: '', tecnologia: '', travaQuintaRoda: '', blindado: '',
  marca: '', modelo: '', cor: '', perfil: '',
  cpfCnpj: '', nomeProprietario: '', dataNascimento: '', rg: '', ufRg: '', nomeMae: '', telefone: '',
}
