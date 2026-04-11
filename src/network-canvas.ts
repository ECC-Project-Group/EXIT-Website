type Node = {
  x: number
  y: number
  z: number
  zBase: number
  px: number
  py: number
  phase: number
}

const NODE_NEAR = 'rgba(125, 40, 56, 0.94)'
const NODE_FAR = 'rgba(92, 54, 63, 0.64)'
const EDGE_NEAR = '122, 52, 64'
const EDGE_FAR = '88, 58, 66'
const EDGE_SIGNAL = '176, 82, 98'
const NODE_GLYPH = 'rgba(144, 62, 78, 0.72)'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Projected = { x: number; y: number; wz: number; near: number }

function attachNetworkAnimation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): () => void {
  const foundRoot = canvas.closest('#app')
  if (!(foundRoot instanceof HTMLElement)) {
    throw new Error('Network canvas must be inside #app')
  }
  const layoutRoot: HTMLElement = foundRoot

  let nodes: Node[] = []
  let width = 0
  let height = 0
  let dpr = 1
  let frame = 0
  let running = true
  const reduced = prefersReducedMotion()
  let mouseX = 0
  let mouseY = 0
  let targetMx = 0
  let targetMy = 0

  function readLayoutSize(): { w: number; h: number } {
    const w = Math.max(1, Math.floor(layoutRoot.clientWidth))
    const docH = Math.max(1, Math.floor(layoutRoot.offsetHeight))
    const minH = Math.max(docH, Math.floor(window.innerHeight))
    return { w, h: minH }
  }

  function syncSize() {
    dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    const { w, h } = readLayoutSize()
    width = w
    height = h
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    seedNodes()
  }

  function seedNodes() {
    const area = width * height
    const count = Math.round(58 + area / 12500)
    nodes = []
    for (let i = 0; i < count; i++) {
      const zBase = Math.random()
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: zBase,
        zBase,
        px: (Math.random() - 0.5) * 0.38,
        py: (Math.random() - 0.5) * 0.38,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  function depthToDistance(z: number): number {
    return 1.05 + z * 1.65
  }

  function project(n: Node, t: number): Projected {
    const wz = depthToDistance(n.z)
    const near = 1 - n.z
    const yaw = 0.052 + Math.sin(t * 0.000042) * 0.012
    const nx = (n.x - width * 0.5) / width
    const ny = (n.y - height * 0.5) / height
    const rx = nx * Math.cos(yaw) + ny * Math.sin(yaw) * 0.18
    const ry = ny * Math.cos(yaw * 0.55) - nx * Math.sin(yaw) * 0.09
    const parallaxX = reduced ? 0 : mouseX * width * (0.012 + near * 0.016)
    const parallaxY = reduced ? 0 : mouseY * height * (0.009 + near * 0.012)
    const depthSpreadX = width * (0.028 + near * 0.052)
    const depthSpreadY = height * (0.02 + near * 0.038)
    return {
      x: n.x + rx * depthSpreadX + parallaxX,
      y: n.y + ry * depthSpreadY + parallaxY,
      wz,
      near
    }
  }

  function linkDistWorld(): number {
    return Math.min(width, height) * 0.13 + 56
  }

  function drawVignette() {
    const v = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      Math.min(width, height) * 0.12,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72
    )
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(0.55, 'rgba(12,10,8,0.05)')
    v.addColorStop(1, 'rgba(18,14,12,0.2)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, width, height)
  }

  function drawTechNode(idx: number, p: Projected, t: number) {
    const r = 0.9 + p.near * 1.35
    const nodeColor = p.near > 0.5 ? NODE_NEAR : NODE_FAR
    const haloAlpha = 0.018 + p.near * 0.03

    ctx.beginPath()
    ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(125, 40, 56, ${haloAlpha})`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = nodeColor
    ctx.globalAlpha = 0.62 + p.near * 0.28
    ctx.fill()
    ctx.globalAlpha = 1

    if (idx % 9 !== 0 && p.near < 0.72) {
      return
    }

    const glyphR = r * (2.2 + p.near * 0.55)
    const pulse = 0.82 + Math.sin(t * 0.0012 + idx * 0.7) * 0.08

    ctx.strokeStyle = NODE_GLYPH
    ctx.lineWidth = 0.65
    ctx.globalAlpha = 0.28 + p.near * 0.18
    ctx.strokeRect(p.x - glyphR * pulse, p.y - glyphR * pulse, glyphR * 2 * pulse, glyphR * 2 * pulse)

    ctx.beginPath()
    ctx.moveTo(p.x - glyphR * 1.45, p.y)
    ctx.lineTo(p.x - glyphR * 0.62, p.y)
    ctx.moveTo(p.x + glyphR * 0.62, p.y)
    ctx.lineTo(p.x + glyphR * 1.45, p.y)
    ctx.moveTo(p.x, p.y - glyphR * 1.45)
    ctx.lineTo(p.x, p.y - glyphR * 0.62)
    ctx.moveTo(p.x, p.y + glyphR * 0.62)
    ctx.lineTo(p.x, p.y + glyphR * 1.45)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function lerpMotion() {
    if (reduced) {
      return
    }
    mouseX += (targetMx - mouseX) * 0.05
    mouseY += (targetMy - mouseY) * 0.05
  }

  function step(t: number) {
    if (!running) {
      return
    }

    lerpMotion()
    ctx.clearRect(0, 0, width, height)

    const bg = ctx.createLinearGradient(0, 0, width, height * 1.05)
    bg.addColorStop(0, '#ebe6dc')
    bg.addColorStop(0.35, '#f7f4ed')
    bg.addColorStop(0.65, '#fbfaf7')
    bg.addColorStop(1, '#e8dfd4')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const dt = reduced ? 0 : t * 0.00028
    const connect = linkDistWorld()

    for (const n of nodes) {
      if (!reduced) {
        n.x += n.px + Math.sin(dt + n.phase) * 0.18
        n.y += n.py + Math.cos(dt * 0.83 + n.phase * 1.2) * 0.16
        const zWave =
          Math.sin(dt * 0.42 + n.phase * 1.7) * 0.09 +
          Math.sin(dt * 0.19 + n.phase * 0.6) * 0.05
        n.z = Math.min(1, Math.max(0, n.zBase + zWave))
      }
      if (n.x < -12) {
        n.x = width + 12
      }
      if (n.x > width + 12) {
        n.x = -12
      }
      if (n.y < -12) {
        n.y = height + 12
      }
      if (n.y > height + 12) {
        n.y = -12
      }
    }

    type Edge = { i: number; j: number; depth: number; a: Projected; b: Projected }
    const edges: Edge[] = []

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!
        const b = nodes[j]!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.hypot(dx, dy)
        if (d < connect) {
          const pa = project(a, t)
          const pb = project(b, t)
          const depth = Math.max(pa.wz, pb.wz)
          edges.push({ i, j, depth, a: pa, b: pb })
        }
      }
    }

    edges.sort((u, v) => v.depth - u.depth)

    for (const e of edges) {
      const midNear = (e.a.near + e.b.near) / 2
      const edgeRgb = midNear > 0.52 ? EDGE_NEAR : EDGE_FAR
      const depthFade = Math.max(0.25, 1 - (e.depth - 1.05) / 1.65)
      const alpha = (0.055 + midNear * 0.11) * depthFade
      ctx.strokeStyle = `rgba(${edgeRgb}, ${Math.min(0.18, alpha)})`
      ctx.lineWidth = 0.45 + midNear * 0.38
      ctx.beginPath()
      ctx.moveTo(e.a.x, e.a.y)
      ctx.lineTo(e.b.x, e.b.y)
      ctx.stroke()

      if (midNear < 0.42) {
        continue
      }

      ctx.save()
      ctx.strokeStyle = `rgba(${EDGE_SIGNAL}, ${0.06 + midNear * 0.08})`
      ctx.lineWidth = 0.3 + midNear * 0.18
      ctx.setLineDash([2.5 + midNear * 2, 7 + (1 - midNear) * 8])
      ctx.lineDashOffset = -(t * 0.018 + e.i * 1.7 + e.j * 0.9)
      ctx.beginPath()
      ctx.moveTo(e.a.x, e.a.y)
      ctx.lineTo(e.b.x, e.b.y)
      ctx.stroke()
      ctx.restore()
    }

    const projected = nodes.map((n, idx) => ({ idx, p: project(n, t) }))
    projected.sort((u, v) => v.p.wz - u.p.wz)

    for (const { idx, p } of projected) {
      drawTechNode(idx, p, t)
    }

    drawVignette()

    frame = requestAnimationFrame(step)
  }

  syncSize()

  const onResize = () => {
    syncSize()
  }
  window.addEventListener('resize', onResize)

  const ro =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          syncSize()
        })
      : null
  ro?.observe(layoutRoot)

  const onMove = (ev: MouseEvent) => {
    if (reduced) {
      return
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    targetMx = ev.clientX / vw - 0.5
    targetMy = ev.clientY / vh - 0.5
  }
  window.addEventListener('mousemove', onMove, { passive: true })

  frame = requestAnimationFrame(step)

  return () => {
    running = false
    cancelAnimationFrame(frame)
    ro?.disconnect()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mousemove', onMove)
  }
}

export function mountNetworkCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    throw new Error('2d context unavailable')
  }
  return attachNetworkAnimation(canvas, ctx)
}
