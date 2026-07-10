import { mkdir, readFile, writeFile } from 'node:fs/promises'

const index = await readFile('dist/index.html', 'utf8')
const scriptPath = index.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1]
const stylePath = index.match(/href="(\/assets\/[^\"]+\.css)"/)?.[1]

if (!scriptPath || !stylePath) {
  throw new Error('Expected Vite JavaScript and CSS assets were not found.')
}

const script = await readFile(`dist${scriptPath}`, 'utf8')
const style = await readFile(`dist${stylePath}`, 'utf8')
const heroPath = script.match(/\/assets\/hero-[^'\"]+\.png/)?.[0]

if (!heroPath) {
  throw new Error('Expected hero image asset was not found.')
}

const hero = await readFile(`dist${heroPath}`)
const heroUrl = `data:image/png;base64,${hero.toString('base64')}`
const standaloneScript = script.replaceAll(heroPath, heroUrl)
const standalonePage = index
  .replace(/<link rel="manifest"[^>]*><script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/, '')

const workerSource = `const page = ${JSON.stringify(standalonePage)}
const script = ${JSON.stringify(standaloneScript)}
const style = ${JSON.stringify(style)}

export default {
  fetch(request) {
    const url = new URL(request.url)

    if (request.method !== 'GET') {
      return new Response('Not found', { status: 404 })
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    if (url.pathname === ${JSON.stringify(scriptPath)}) {
      return new Response(script, { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
    }

    if (url.pathname === ${JSON.stringify(stylePath)}) {
      return new Response(style, { headers: { 'content-type': 'text/css; charset=utf-8' } })
    }

    return new Response('Not found', { status: 404 })
  },
}
`

await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', workerSource)
