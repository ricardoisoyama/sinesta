import { useEffect, type RefObject } from 'react'

export interface ParticleOptions {
  count: number
  speed: number
  rmin: number
  rrange: number
  par: number
  oa: number
  ca: number
}

/** Campo de partículas sutil sobre uma área verde (sidebar/topbar), com parallax no mouse. */
export function useParticleField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  hostRef: RefObject<HTMLElement | null>,
  opts: ParticleOptions,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !host || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, H = 0, raf = 0
    const P = Array.from({ length: opts.count }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * opts.speed, vy: (Math.random() - 0.5) * opts.speed,
      r: opts.rmin + Math.random() * opts.rrange, orange: Math.random() > 0.74,
    }))
    const m = { x: 0, y: 0, a: false }
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect()
      m.x = (e.clientX - r.left) / r.width - 0.5
      m.y = (e.clientY - r.top) / r.height - 0.5
      m.a = true
    }
    const onLeave = () => { m.a = false }
    host.addEventListener('mousemove', onMove)
    host.addEventListener('mouseleave', onLeave)

    let px = 0, py = 0
    const size = () => {
      const r = host.getBoundingClientRect()
      if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) {
        W = r.width; H = r.height
        canvas.width = W * dpr; canvas.height = H * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    const loop = () => {
      size()
      ctx.clearRect(0, 0, W, H)
      px += ((m.a ? m.x : 0) - px) * 0.05
      py += ((m.a ? m.y : 0) - py) * 0.05
      for (const p of P) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
        const x = p.x * W - px * p.r * opts.par
        const y = p.y * H - py * p.r * opts.par
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.orange ? `rgba(232,112,47,${opts.oa})` : `rgba(245,240,232,${opts.ca})`
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      host.removeEventListener('mousemove', onMove)
      host.removeEventListener('mouseleave', onLeave)
    }
  }, [canvasRef, hostRef, opts])
}

/** Sol da marca (sun.png) com partículas orbitando, igual ao login. */
export function useSunOrbit(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  src = '/sun.png',
  size = 46,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr; canvas.height = size * dpr
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const C = size / 2
    const orbit = Array.from({ length: 13 }, () => ({
      a: Math.random() * 6.28,
      rad: size * 0.34 + Math.random() * 5,
      sp: (0.004 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
      s: 0.6 + Math.random() * 1.1,
      t: Math.random(),
    }))
    let raf = 0, cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const loop = () => {
        ctx.clearRect(0, 0, size, size)
        const d = size * 0.65
        ctx.save()
        ctx.shadowColor = 'rgba(232,112,47,.65)'
        ctx.shadowBlur = 11
        ctx.drawImage(img, C - d / 2, C - d / 2, d, d)
        ctx.restore()
        for (const p of orbit) {
          p.a += p.sp
          const x = C + Math.cos(p.a) * p.rad
          const y = C + Math.sin(p.a) * p.rad
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, Math.PI * 2)
          ctx.fillStyle = p.t > 0.5 ? 'rgba(255,178,122,.95)' : 'rgba(245,240,232,.7)'
          ctx.fill()
        }
        raf = requestAnimationFrame(loop)
      }
      loop()
    }
    img.src = src

    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [canvasRef, src, size])
}
