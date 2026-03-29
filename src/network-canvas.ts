type Node = {
  x: number
  y: number
  px: number
  py: number
  phase: number
}

const INK = 'rgba(28, 25, 23, 0.08)'
const NODE = 'rgba(157, 34, 53, 0.9)'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function mountNetworkCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    throw new Error('2d context unavailable')
  }

  let nodes: Node[] = []
  let width = 0
  let height = 0
  let dpr = 1
  let frame = 0
  let running = true
  const reduced = prefersReducedMotion()

  function syncSize() {
    const parent = canvas.parentElement
    const w = parent?.clientWidth ?? canvas.clientWidth
    const h = parent?.clientHeight ?? canvas.clientHeight
    dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    width = Math.max(1, Math.floor(w))
    height = Math.max(1, Math.floor(h))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    seedNodes()
  }

  function seedNodes() {
    const count = Math.round(32 + (width * height) / 12000)
    nodes = []
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        px: (Math.random() - 0.5) * 0.6,
        py: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  const linkDist = () => Math.min(width, height) * 0.14 + 42

  function step(t: number) {
    if (!running) {
      return
    }

    ctx.clearRect(0, 0, width, height)

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#f3f0e8')
    bg.addColorStop(0.55, '#fbfaf7')
    bg.addColorStop(1, '#efe8e0')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const dt = reduced ? 0 : t * 0.00035
    const connect = linkDist()

    for (const n of nodes) {
      if (!reduced) {
        n.x += n.px + Math.sin(dt + n.phase) * 0.35
        n.y += n.py + Math.cos(dt * 0.87 + n.phase * 1.3) * 0.35
      }
      if (n.x < -8) {
        n.x = width + 8
      }
      if (n.x > width + 8) {
        n.x = -8
      }
      if (n.y < -8) {
        n.y = height + 8
      }
      if (n.y > height + 8) {
        n.y = -8
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!
        const b = nodes[j]!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const d = Math.hypot(dx, dy)
        if (d < connect) {
          const alpha = (1 - d / connect) * 0.55
          ctx.strokeStyle = `rgba(157, 34, 53, ${alpha * 0.35})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2)
      ctx.fillStyle = NODE
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'
      ctx.lineWidth = 0.6
      ctx.stroke()
    }

    ctx.strokeStyle = INK
    ctx.lineWidth = 1
    const stepGrid = 48
    for (let x = 0; x < width; x += stepGrid) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += stepGrid) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
      ctx.stroke()
    }

    frame = requestAnimationFrame(step)
  }

  syncSize()

  const ro = new ResizeObserver(() => {
    syncSize()
  })
  ro.observe(canvas.parentElement ?? canvas)

  frame = requestAnimationFrame(step)

  return () => {
    running = false
    cancelAnimationFrame(frame)
    ro.disconnect()
  }
}
