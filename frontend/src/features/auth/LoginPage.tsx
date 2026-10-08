import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from './login-schema'
import { useAuth } from './auth-context'
import { ApiError } from '@/lib/api'
import styles from './LoginPage.module.css'

/* ── SVG helpers ──────────────────────────────────────────────────────── */

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

/* ── EREBOR com efeito máquina de escrever ─────────────────────────────── */

const BrandWord: React.FC<{ text?: string }> = ({ text = 'Elrond' }) => {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    let timer: number
    const tick = () => {
      i += 1
      setShown(text.slice(0, i))
      if (i < text.length) timer = window.setTimeout(tick, 200)
      else setDone(true)
    }
    timer = window.setTimeout(tick, 500) // pequeno atraso antes de começar
    return () => window.clearTimeout(timer)
  }, [text])

  return (
    <h1 className={styles.brand}>
      <span className={styles.brandGhost} aria-hidden>
        {text}
      </span>
      <span className={styles.brandTyped}>
        {shown}
        {!done && <i className={styles.caret} aria-hidden />}
      </span>
    </h1>
  )
}

/* ── Efeito de partículas (fundo com parallax + sol com órbitas) ───────── */

function useParticles(
  bgRef: React.RefObject<HTMLCanvasElement | null>,
  orbitRef: React.RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const mouse = { x: -9999, y: -9999, active: false }
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true }
    const onLeave = () => { mouse.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let rafBg = 0, rafOrbit = 0, cancelled = false

    /* ===== Fundo: campo de partículas + parallax ===== */
    const bg = bgRef.current
    const bctx = bg?.getContext('2d') ?? null
    let W = 0, H = 0

    const resizeBg = () => {
      if (!bg || !bctx) return
      W = window.innerWidth; H = window.innerHeight
      bg.width = W * dpr; bg.height = H * dpr
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeBg()
    window.addEventListener('resize', resizeBg)

    const N = Math.min(140, Math.floor((W * H) / 14000))
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      z: 0.25 + Math.random() * 0.9,
      r: 0.6 + Math.random() * 1.8,
      orange: Math.random() > 0.78,
    }))

    let px = 0, py = 0
    const bgFrame = () => {
      if (bctx) {
        bctx.clearRect(0, 0, W, H)
        const tx = mouse.active ? mouse.x - W / 2 : 0
        const ty = mouse.active ? mouse.y - H / 2 : 0
        px += (tx - px) * 0.05; py += (ty - py) * 0.05

        for (const p of ps) {
          p.x += p.vx; p.y += p.vy
          if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20
          if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20
          const ox = p.x - px * p.z * 0.06
          const oy = p.y - py * p.z * 0.06
          bctx.beginPath()
          bctx.arc(ox, oy, p.r, 0, Math.PI * 2)
          bctx.fillStyle = p.orange
            ? `rgba(232,112,47,${0.25 + p.z * 0.4})`
            : `rgba(245,240,232,${0.10 + p.z * 0.28})`
          bctx.fill()
        }
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i], b = ps[j]
            const ax = a.x - px * a.z * 0.06, ay = a.y - py * a.z * 0.06
            const bx = b.x - px * b.z * 0.06, by = b.y - py * b.z * 0.06
            const dx = ax - bx, dy = ay - by, d2 = dx * dx + dy * dy
            if (d2 < 9000) {
              bctx.strokeStyle = `rgba(245,240,232,${0.05 * (1 - d2 / 9000)})`
              bctx.lineWidth = 0.5
              bctx.beginPath(); bctx.moveTo(ax, ay); bctx.lineTo(bx, by); bctx.stroke()
            }
          }
        }
      }
      rafBg = requestAnimationFrame(bgFrame)
    }
    bgFrame()

    /* ===== Sol sólido + partículas orbitando ===== */
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const canvas = orbitRef.current
      const octx = canvas?.getContext('2d') ?? null
      if (!canvas || !octx) return

      // isola o sol (pixels laranja) e seu bounding box
      const iw = img.width, ih = img.height
      const off = document.createElement('canvas')
      off.width = iw; off.height = ih
      const offctx = off.getContext('2d', { willReadFrequently: true })!
      offctx.drawImage(img, 0, 0)
      let minX = iw, minY = ih, maxX = 0, maxY = 0
      try {
        const data = offctx.getImageData(0, 0, iw, ih).data
        const step = Math.max(1, Math.round(Math.min(iw, ih) / 150))
        for (let y = 0; y < ih; y += step) {
          for (let x = 0; x < iw; x += step) {
            const i = (y * iw + x) * 4
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
            if (a > 80 && r > 140 && b < 150 && r > b + 30 && r > g) {
              if (x < minX) minX = x; if (x > maxX) maxX = x
              if (y < minY) minY = y; if (y > maxY) maxY = y
            }
          }
        }
      } catch { minX = 0; minY = 0; maxX = iw; maxY = ih }
      const bbw = maxX - minX, bbh = maxY - minY

      // canvas de órbita
      const SIZE = 220
      canvas.width = SIZE * dpr; canvas.height = SIZE * dpr
      canvas.style.width = `${SIZE}px`; canvas.style.height = `${SIZE}px`
      octx.scale(dpr, dpr)
      const C = SIZE / 2

      // sol recortado em canvas próprio
      const SS = 96
      const sun = document.createElement('canvas')
      sun.width = SS * dpr; sun.height = SS * dpr
      const sctx = sun.getContext('2d')!
      sctx.scale(dpr, dpr)
      if (bbw > 0 && bbh > 0) {
        const s = Math.min(SS / bbw, SS / bbh) * 0.96
        const dw = bbw * s, dh = bbh * s
        sctx.drawImage(img, minX, minY, bbw, bbh, (SS - dw) / 2, (SS - dh) / 2, dw, dh)
      }

      const orbit = Array.from({ length: 64 }, () => ({
        ang: Math.random() * Math.PI * 2,
        rad: 54 + Math.random() * 34,
        spd: (0.002 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
        size: 0.7 + Math.random() * 1.5,
        ro: 0,
        tint: Math.random(),
      }))

      const orbitFrame = () => {
        octx.clearRect(0, 0, SIZE, SIZE)
        const rect = canvas.getBoundingClientRect()
        const mx = mouse.active ? mouse.x - rect.left : -9999
        const my = mouse.active ? mouse.y - rect.top : -9999

        octx.save()
        octx.shadowColor = 'rgba(232,112,47,.55)'
        octx.shadowBlur = 22
        octx.drawImage(sun, C - SS / 2, C - SS / 2, SS, SS)
        octx.restore()

        for (const p of orbit) {
          p.ang += p.spd
          const r = p.rad + p.ro
          const x = C + Math.cos(p.ang) * r
          const y = C + Math.sin(p.ang) * r
          const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy
          if (d2 < 40 * 40) p.ro += 2.0
          p.ro *= 0.92
          if (p.ro > 16) p.ro = 16

          octx.beginPath()
          octx.arc(x, y, p.size, 0, Math.PI * 2)
          octx.fillStyle = p.tint > 0.6 ? 'rgba(255,178,122,.9)'
            : (p.tint > 0.3 ? 'rgba(232,112,47,.85)' : 'rgba(245,240,232,.6)')
          octx.fill()
        }
        rafOrbit = requestAnimationFrame(orbitFrame)
      }
      orbitFrame()
    }
    img.src = '/logo.png'

    return () => {
      cancelled = true
      cancelAnimationFrame(rafBg)
      cancelAnimationFrame(rafOrbit)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resizeBg)
    }
  }, [bgRef, orbitRef])
}

/* ── Componente principal ─────────────────────────────────────────────── */

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  // Veio da sessão vencida (lib/api ou o timer da sessão): avisa e, depois de entrar, volta para a tela.
  const params = new URLSearchParams(window.location.search)
  const expirou = params.get("expirou") === "1"
  const voltar = params.get("voltar") ?? ""
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const bgRef = useRef<HTMLCanvasElement>(null)
  const orbitRef = useRef<HTMLCanvasElement>(null)
  useParticles(bgRef, orbitRef)

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signIn(data, voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : undefined)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Erro ao conectar com o servidor.'
      setError('root', { message })
    }
  })

  return (
    <div className={styles.root}>
      <canvas ref={bgRef} className={styles.bg} aria-hidden />

      <div className={`${styles.corner} ${styles.tl}`} aria-hidden />
      <div className={`${styles.corner} ${styles.br}`} aria-hidden />

      {/* Hero: sol + EREBOR */}
      <div className={styles.hero}>
        <div className={styles.sunSlot}>
          <canvas ref={orbitRef} className={styles.orbitCanvas} aria-hidden />
        </div>
        <div className={styles.brandWrap}>
          <BrandWord />
        </div>
      </div>

      <div className={styles.divider} />

      {/* Card */}
      <div className={styles.card}>
        <span className={styles.label}>ACESSO AO SISTEMA</span>

        <form onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <IconUser />
            <input
              type="email"
              placeholder="E-mail"
              className={styles.input}
              autoComplete="email"
              disabled={isSubmitting}
              {...register('email')}
            />
          </div>
          {errors.email && <p className={styles.error}>{errors.email.message}</p>}

          <div className={styles.field}>
            <IconLock />
            <input
              type="password"
              placeholder="Senha"
              className={styles.input}
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register('password')}
            />
          </div>
          {errors.password && <p className={styles.error}>{errors.password.message}</p>}

          {expirou && !errors.root && (
            <div className={styles.alert} role="status">
              <IconAlert />
              <span>Sua sessão expirou. Entre novamente para continuar de onde parou.</span>
            </div>
          )}

          {errors.root && (
            <div className={styles.alert} role="alert">
              <IconAlert />
              <span>{errors.root.message}</span>
            </div>
          )}

          <button type="submit" className={styles.btn} disabled={isSubmitting}>
            {isSubmitting
              ? <span className={styles.btnLoading}><span className={styles.spinner} />Entrando…</span>
              : 'ENTRAR'}
          </button>
        </form>

        <a href="#" className={styles.forgot}>Esqueceu sua senha?</a>
      </div>

      <div className={styles.footer}>Elrond</div>
    </div>
  )
}
