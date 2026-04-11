import { layout, layoutWithLines, prepare, prepareWithSegments } from '@chenglou/pretext'
import { mountNetworkCanvas } from './network-canvas.ts'
import './style.css'

const schedule = [
  { time: '9:00', title: 'Doors' },
  { time: '10:00', title: 'Solo round (2hr)' },
  { time: '12:15', title: 'Lunch' },
  { time: '1:30', title: 'Team round (2hr)' },
  { time: '4:00', title: 'Done by 5' }
] as const

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

app.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="EXIT home">
        <span class="brand-mark">EXIT</span>
        <span class="brand-copy">
          <strong>Exeter Informatics Tournament</strong>
          <span>PEA · Exeter, NH</span>
        </span>
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="#format">Format</a>
        <a href="#schedule">Day-of</a>
        <a href="#hosts">ECC</a>
      </nav>
    </header>

    <main class="page-content">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">May 10 · 9–5</p>
          <h1>Big Red bytes.</h1>
          <p class="hero-tag">Informatics @ Exeter — ECC</p>
          <ul class="chips" aria-label="Quick facts">
            <li>MS + HS</li>
            <li>2×2hr</li>
            <li>solo → team</li>
          </ul>
          <div class="hero-actions">
            <a class="button button-primary" href="#schedule">day-of</a>
            <a class="button button-secondary" href="#hosts">ECC</a>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="viz-frame">
            <canvas id="hero-viz" width="600" height="400"></canvas>
            <span class="viz-cursor" aria-hidden="true"></span>
            <span class="viz-caption">// live graph · Exeter red on paper</span>
          </div>
          <div class="poster-stage">
            <svg
              id="hero-poster"
              class="hero-poster"
              role="img"
              aria-labelledby="poster-title poster-description"
            >
              <title id="poster-title">EXIT summary</title>
              <desc id="poster-description">Title line breaks from pretext.</desc>
            </svg>
          </div>
        </div>
      </section>

      <section id="format" class="panel panel-feature">
        <p class="panel-kicker">Format</p>
        <h2>Solo grind, then team sprint.</h2>
        <p class="punch">Same day. Same building. Different energy each block.</p>
      </section>

      <section id="schedule" class="panel timeline-panel">
        <p class="panel-kicker">Day-of</p>
        <h2>Rough clock</h2>
        <div class="timeline compact">
          ${schedule
            .map(
              row => `
            <div class="timeline-row">
              <span class="timeline-time">${row.time}</span>
              <span class="timeline-title">${row.title}</span>
            </div>`
            )
            .join('')}
        </div>
      </section>

      <section id="hosts" class="panel panel-accent">
        <p class="panel-kicker">Hosts</p>
        <h2>Exeter Computing Club</h2>
        <p class="punch">Student-run on campus. Regs + logistics TBA.</p>
      </section>
    </main>
  </div>
`

const viz = document.querySelector<HTMLCanvasElement>('#hero-viz')
if (viz) {
  mountNetworkCanvas(viz)
}

const posterRoot = document.querySelector<SVGSVGElement>('#hero-poster')

if (!posterRoot) {
  throw new Error('Poster root not found')
}

const poster = posterRoot

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function pickBalancedLayout(
  text: string,
  font: string,
  lineHeight: number,
  widthRange: [number, number],
  idealLineCount: number
) {
  const prepared = prepareWithSegments(text, font)
  const [minWidth, maxWidth] = widthRange

  let best = layoutWithLines(prepared, maxWidth, lineHeight)
  let bestScore = Number.POSITIVE_INFINITY

  for (let width = minWidth; width <= maxWidth; width += 8) {
    const candidate = layoutWithLines(prepared, width, lineHeight)
    const lineWidths = candidate.lines.map(line => line.width)
    const widestLine = Math.max(...lineWidths)
    const narrowestLine = Math.min(...lineWidths)
    const raggedness = widestLine - narrowestLine
    const linePenalty = Math.abs(candidate.lineCount - idealLineCount) * 72
    const widthPenalty = Math.abs(width - maxWidth) * 0.12
    const score = raggedness + linePenalty + widthPenalty

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}

function renderSvgLines(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  className: string
): string {
  return lines
    .map(
      (line, index) =>
        `<text class="${className}" x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</text>`
    )
    .join('')
}

function renderPoster() {
  const posterWidth = Math.max(280, Math.min(520, poster.clientWidth || 400))
  const innerWidth = posterWidth - 56

  const titleLayout = pickBalancedLayout(
    'Exeter Informatics Tournament',
    '700 32px "Source Serif 4"',
    38,
    [Math.max(200, innerWidth - 80), innerWidth],
    2
  )

  const detailText = 'May 10 · 9–5 · MS/HS · solo + team · PEA · ECC'
  const detailPrepared = prepare(detailText, '600 13px "Source Sans 3"')
  const detailHeight = layout(detailPrepared, innerWidth, 20).height

  const titleLineStep = 38
  const titleBlockHeight = titleLayout.lineCount * titleLineStep
  const footerY = 118 + titleBlockHeight
  const posterHeight = Math.max(200, footerY + detailHeight + 56)

  poster.setAttribute('viewBox', `0 0 ${posterWidth} ${posterHeight}`)

  poster.innerHTML = `
    <defs>
      <clipPath id="poster-clip">
        <rect x="8" y="8" width="${posterWidth - 16}" height="${posterHeight - 16}" rx="2" />
      </clipPath>
    </defs>

    <g clip-path="url(#poster-clip)">
      <rect x="8" y="8" width="${posterWidth - 16}" height="${posterHeight - 16}" rx="2" fill="#fff" stroke="#e7e5e0" />
      <rect x="8" y="8" width="5" height="${posterHeight - 16}" fill="#9d2235" />
    </g>
    <path d="M24 72 H${posterWidth - 24}" stroke="#9d2235" stroke-width="1" opacity="0.35" />

    <text class="poster-label" x="24" y="40">EXIT</text>
    <text class="poster-meta-copy" x="${posterWidth - 24}" y="40" text-anchor="end">ECC</text>

    ${renderSvgLines(
      titleLayout.lines.map(line => line.text),
      24,
      100,
      titleLineStep,
      'poster-title'
    )}

    <foreignObject x="24" y="${footerY}" width="${innerWidth}" height="${detailHeight + 8}">
      <div xmlns="http://www.w3.org/1999/xhtml" class="poster-detail">
        ${escapeXml(detailText)}
      </div>
    </foreignObject>
  `
}

let resizeFrame = 0

function schedulePosterRender() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(renderPoster)
}

if ('fonts' in document) {
  void document.fonts.ready.then(renderPoster)
} else {
  renderPoster()
}

window.addEventListener('resize', schedulePosterRender)
