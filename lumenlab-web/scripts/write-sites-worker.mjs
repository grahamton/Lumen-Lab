import { mkdir, writeFile } from 'node:fs/promises'

const workerSource = `export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
`

await mkdir('dist/server', { recursive: true })
await writeFile('dist/server/index.js', workerSource)
