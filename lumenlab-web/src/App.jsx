import heroImg from './assets/hero.png'
import './App.css'

const featureGroups = [
  {
    title: 'Generate',
    items: ['Fibonacci', 'Voronoi', 'Grid', 'Liquid', 'Plasma', 'Fractal'],
  },
  {
    title: 'Shape',
    items: ['Kaleidoscope', 'Mirror X/Y', 'Polar warp', 'Projection masks'],
  },
  {
    title: 'Perform',
    items: ['Mic input', 'MIDI learn', 'Gamepad', 'Drift mode'],
  },
]

const platformCards = [
  {
    label: 'Desktop',
    status: 'Available for Windows',
    copy: 'The full Electron performance rig with projection mapping, capture, presets, and hardware control.',
  },
  {
    label: 'Web',
    status: 'Product home',
    copy: 'Downloads, beta news, and a showcase for the living visuals you can shape across Lumen Lab.',
  },
  {
    label: 'Mobile',
    status: 'Android beta in development',
    copy: 'A standalone visual toy: touch, tilt, mutate, and export seamless four-second loops. No desktop required.',
  },
]

const workflowSteps = [
  'Start with a generator, image, or video.',
  'Bend it through symmetry, warp, bloom, color, and noise.',
  'Map the output to screens, fabric, walls, or projection surfaces.',
  'Capture WebM clips or export 4K stills for print and production.',
]

function App() {
  return (
    <main>
      <section className="hero-section" aria-labelledby="hero-title">
        <nav className="site-nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Lumen Lab home">
            <span className="brand-mark" aria-hidden="true"></span>
            <span>Lumen Lab</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#platforms">Platforms</a>
            <a href="#download">Download</a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Real-time visual synthesizer</p>
            <h1 id="hero-title">Performable visuals for projection, print, and live rooms.</h1>
            <p className="hero-lede">
              Feed Lumen Lab math, images, video, mic input, MIDI, or a gamepad. It turns them into
              psychedelic, audio-reactive visuals you can shape live and capture at production quality.
            </p>
            <div className="hero-actions" aria-label="Primary actions">
              <a className="button primary" href="https://github.com/GRAHAMTON/Lumenlab/releases">
                Download Windows
              </a>
              <a className="button secondary" href="#platforms">
                View roadmap
              </a>
            </div>
          </div>

          <div className="visual-stage" aria-label="Abstract preview of layered Lumen Lab visuals">
            <div className="visual-frame">
              <div className="scanline"></div>
              <div className="orbital-ring ring-one"></div>
              <div className="orbital-ring ring-two"></div>
              <div className="signal-wave wave-one"></div>
              <div className="signal-wave wave-two"></div>
              <img src={heroImg} alt="" className="layer-stack" />
            </div>
            <div className="meter-row" aria-hidden="true">
              <span style={{ '--level': '70%' }}></span>
              <span style={{ '--level': '44%' }}></span>
              <span style={{ '--level': '88%' }}></span>
              <span style={{ '--level': '58%' }}></span>
              <span style={{ '--level': '76%' }}></span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip" id="features" aria-label="Core feature groups">
        {featureGroups.map((group) => (
          <article key={group.title} className="feature-panel">
            <h2>{group.title}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div>
          <p className="eyebrow">Built for live work</p>
          <h2 id="workflow-title">A visual instrument, not a timeline.</h2>
        </div>
        <ol className="workflow-list">
          {workflowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="platform-section" id="platforms" aria-labelledby="platform-title">
        <div className="section-heading">
          <p className="eyebrow">Roadmap</p>
          <h2 id="platform-title">One creative family, built for different kinds of play.</h2>
        </div>
        <div className="platform-grid">
          {platformCards.map((card) => (
            <article key={card.label} className="platform-card">
              <div>
                <h3>{card.label}</h3>
                <p className="status">{card.status}</p>
              </div>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="download-section" id="download" aria-labelledby="download-title">
        <div>
          <p className="eyebrow">Windows v1.1.0</p>
          <h2 id="download-title">Start with the desktop rig.</h2>
          <p>
            Download the current Windows build, then bring your own media, projector, controller,
            and audio source.
          </p>
        </div>
        <a className="button primary" href="https://github.com/GRAHAMTON/Lumenlab/releases">
          Get Lumen Lab
        </a>
      </section>
    </main>
  )
}

export default App
