import { mkdir, writeFile } from 'node:fs/promises'

const workerSource = `const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const assetRequest = new Request(url, request)
    const response = await env.ASSETS.fetch(assetRequest)

    if (response.status !== 404) {
      return response
    }

    if (request.method !== 'GET' || url.pathname.includes('.')) {
      return notFound()
    }

    const indexUrl = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(indexUrl, request))
  },
}
`

await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', workerSource)
