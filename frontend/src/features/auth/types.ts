export interface LoginResponse {
  token: string
  email: string
  name: string
  perfil: string
  permissoes: string[]
  expiresAt: string
}

export interface CurrentUser {
  email: string
  name: string
  perfil: string
  permissoes: string[]
}
