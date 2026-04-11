import eccLogoUrl from '../ECC Logo with E.svg'
import { mountNetworkCanvas } from './network-canvas.ts'
import './style.css'

type Route = '/' | '/schedule' | '/about' | '/register'

type ScheduleRow = {
  time: string
  title: string
  detail: string
  location: string
}

const eventSummary = {
  name: 'Exeter Informatics Tournament',
  shortName: 'EXIT',
  date: 'May 10, 2026',
  venue: 'Online',
  city: 'Hosted by ECC'
} as const

const schedule: readonly ScheduleRow[] = [
  {
    time: '8:30 - 9:00',
    title: 'Check-in',
    detail: 'Platform check, account access, and final setup.',
    location: 'Online'
  },
  {
    time: '9:00 - 9:20',
    title: 'Welcome + rules',
    detail: 'Opening remarks, format overview, and contest logistics.',
    location: 'Livestream'
  },
  {
    time: '9:30 - 10:45',
    title: 'Individual round',
    detail: '6 problems solved solo.',
    location: 'Contest platform'
  },
  {
    time: '10:45 - 11:00',
    title: 'Break',
    detail: 'Short reset before the team round begins.',
    location: 'Online'
  },
  {
    time: '11:00 - 12:30',
    title: 'Team round',
    detail: '8 problems solved collaboratively.',
    location: 'Contest platform'
  },
  {
    time: '12:30 - 1:15',
    title: 'Break + judging',
    detail: 'Short intermission while submissions are reviewed.',
    location: 'Online'
  },
  {
    time: '1:15 - 2:00',
    title: 'Community session',
    detail: 'Optional post-contest discussion and closing announcements.',
    location: 'Livestream'
  },
  {
    time: '2:15 - 3:00',
    title: 'Awards + closing',
    detail: 'Team and individual recognition, then wrap-up.',
    location: 'Livestream'
  }
] as const

const homeSections = [
  {
    label: 'General Information',
    title: 'Online and accessible.',
    body:
      'EXIT will be run online. Competitors can participate remotely, and all contest communication, announcements, and logistics will happen through the online event platform and organizer channels.',
    items: [
      'Open to middle and high school competitors',
      'Hosted by the Exeter Computing Club',
      'All times and announcements will be posted online'
    ]
  },
  {
    label: 'Format',
    title: 'Two rounds.',
    body:
      'The contest has one individual round followed by one team round. The individual round is solved alone; the team round is solved collaboratively with your registered teammates.',
    items: ['Individual round: 6 problems', 'Team round: 8 problems', 'Awards and closing after judging']
  },
  {
    label: 'Scoring',
    title: 'Scoring is still being finalized.',
    body:
      'The exact scoring system is TBD. We will publish the final scoring details before the contest begins so competitors know how individual and team standings will be determined.',
    items: ['Scoring: TBD', 'Final details will be announced before the contest', 'Separate individual and team recognition is expected']
  },
  {
    label: 'Rules',
    title: 'Standard contest expectations.',
    body:
      'The rules will follow standard competitive programming norms, similar in spirit to Codeforces-style contests, with a few important basics highlighted below.',
    items: [
      'No AI tools, code generation tools, or outside assistance',
      'No collaboration during the individual round',
      'During the team round, work only with your registered teammates',
      'Do not share problems, solutions, or live contest details publicly during the event',
      'Organizer decisions on rules and scoring are final'
    ]
  }
] as const

const directors = [
  { name: 'Aryan Patel', email: 'apatel@exeter.edu' },
  { name: 'Chris Spencer', email: 'cspencer1@exeter.edu' },
  { name: 'Maya Shah', email: 'mnshah@exeter.edu' },
  { name: 'Robert Joo', email: 'sjoo@exeter.edu' }
] as const

const registrationEmail = directors[0].email

const appRoot = document.querySelector<HTMLDivElement>('#app')

if (!appRoot) {
  throw new Error('App root not found')
}

const app = appRoot
let cleanupCanvas: (() => void) | null = null

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '')

  if (hash === '/schedule' || hash === '/about' || hash === '/register') {
    return hash
  }

  return '/'
}

function navLink(route: Route, label: string, currentRoute: Route): string {
  const isActive = route === currentRoute ? ' is-active' : ''
  return `<a class="nav-link${isActive}" href="#${route}">${label}</a>`
}

function renderScheduleTable(): string {
  return schedule
    .map(
      row => `
        <div class="schedule-table-row">
          <div class="schedule-time">${escapeHtml(row.time)}</div>
          <div class="schedule-event">${escapeHtml(row.title)}</div>
          <div class="schedule-detail">${escapeHtml(row.detail)}</div>
          <div class="schedule-location">${escapeHtml(row.location)}</div>
        </div>`
    )
    .join('')
}

function renderDirectors(): string {
  return directors
    .map(
      director => `
        <article class="person-card">
          <h3>${escapeHtml(director.name)}</h3>
          <a class="person-email" href="mailto:${escapeHtml(director.email)}">${escapeHtml(director.email)}</a>
        </article>`
    )
    .join('')
}

function renderHomeSections(): string {
  return homeSections
    .map(
      section => `
        <article class="panel home-section-card">
          <p class="section-label">${escapeHtml(section.label)}</p>
          <h2>${escapeHtml(section.title)}</h2>
          <p class="punch">${escapeHtml(section.body)}</p>
          <ul class="fact-list">
            ${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>`
    )
    .join('')
}

function renderHomePage(): string {
  return `
    <section class="hero-banner panel panel-feature">
      <p class="section-label">Contest</p>
      <h1>${escapeHtml(eventSummary.name)}</h1>
      <p class="hero-lead">
        A student-run online informatics competition for middle and high school students.
      </p>
      <p class="hero-meta">
        ${escapeHtml(eventSummary.date)} · ${escapeHtml(eventSummary.venue)} · ${escapeHtml(eventSummary.city)}
      </p>
      <div class="hero-actions">
        <a class="button button-primary" href="#/schedule">View Schedule</a>
        <a class="button button-secondary" href="#/register">Register</a>
      </div>
    </section>

    <section class="home-sections-grid" aria-label="Contest details">
      ${renderHomeSections()}
    </section>
  `
}

function renderSchedulePage(): string {
  return `
    <section class="page-intro">
      <p class="section-label">Schedule</p>
      <h1>Schedule</h1>
      <p class="page-copy">
        The day is organized around two online competition rounds, a short break, and a closing session once judging is complete.
      </p>
    </section>

    <section class="panel schedule-card">
      <div class="schedule-table">
        <div class="schedule-table-head">
          <div>Time</div>
          <div>Session</div>
          <div>Notes</div>
          <div>Location</div>
        </div>
        ${renderScheduleTable()}
      </div>
    </section>
  `
}

function renderAboutPage(): string {
  return `
    <section class="page-intro">
      <p class="section-label">About Us</p>
      <h1>About Us</h1>
      <p class="page-copy">
        Exeter Computing Club runs EXIT as a student-led competition that aims to feel welcoming, thoughtful, and technically serious.
      </p>
    </section>

    <section class="detail-grid">
      <section class="panel panel-accent">
        <p class="section-label">Organization</p>
        <h2>What we are building.</h2>
        <p class="punch">
          We want EXIT to be a clean, well-run informatics event: approachable for first-time competitors,
          but still interesting for students who already enjoy algorithms and contest math.
        </p>
      </section>

      <section class="panel">
        <p class="section-label">Directors</p>
        <h2>Tournament directors</h2>
        <div class="people-grid">
          ${renderDirectors()}
        </div>
      </section>
    </section>
  `
}

function renderRegisterPage(): string {
  return `
    <section class="page-intro">
      <p class="section-label">Register</p>
      <h1>Register</h1>
      <p class="page-copy">
        Registration is being coordinated directly with the organizing team for this year's online event.
      </p>
    </section>

    <section class="register-grid">
      <section class="panel">
        <p class="section-label">How it works</p>
        <h2>What to send us.</h2>
        <ul class="fact-list">
          <li>School or organization name</li>
          <li>Primary coach or adult contact</li>
          <li>Estimated number of students or teams</li>
          <li>Any questions about eligibility, timing, or logistics</li>
        </ul>
      </section>

      <section class="panel panel-accent">
        <p class="section-label">Contact</p>
        <h2>Reach the team.</h2>
        <p class="punch">
          Email us to express interest and we will reply with next steps, timing, and any additional event details.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href="mailto:${escapeHtml(registrationEmail)}">Email to Register</a>
          <a class="button button-secondary" href="#/about">View Organizers</a>
        </div>
      </section>
    </section>
  `
}

function renderApp() {
  const currentRoute = getRoute()
  const hasGraph = currentRoute === '/'
  const page =
    currentRoute === '/schedule'
      ? renderSchedulePage()
      : currentRoute === '/about'
        ? renderAboutPage()
        : currentRoute === '/register'
          ? renderRegisterPage()
          : renderHomePage()

  cleanupCanvas?.()
  cleanupCanvas = null

  app.innerHTML = `
    ${hasGraph ? '<div class="page-bg" aria-hidden="true"><canvas id="hero-viz" width="800" height="600"></canvas></div>' : ''}
    <div class="page-shell${hasGraph ? ' has-graph' : ''}">
      <header class="site-header">
        <a class="brand" href="#/" aria-label="EXIT contest page">
          <img class="brand-mark" src="${eccLogoUrl}" alt="Exeter Computing Club logo" />
          <span class="brand-copy">
            <strong>${escapeHtml(eventSummary.name)}</strong>
            <span>${escapeHtml(eventSummary.venue)} · ${escapeHtml(eventSummary.city)}</span>
          </span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          ${navLink('/', 'Contest', currentRoute)}
          ${navLink('/schedule', 'Schedule', currentRoute)}
          ${navLink('/about', 'About Us', currentRoute)}
          ${navLink('/register', 'Register', currentRoute)}
        </nav>
      </header>

      <main class="page-content">
        ${page}
      </main>
    </div>
  `

  if (hasGraph) {
    const viz = document.querySelector<HTMLCanvasElement>('#hero-viz')
    if (viz) {
      cleanupCanvas = mountNetworkCanvas(viz)
    }
  }
}

renderApp()
window.addEventListener('hashchange', renderApp)
