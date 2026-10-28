// Prints the CHANGELOG.md section for a version (default: package.json version).
// The release workflow writes it to build/release-notes.md, which
// electron-builder uses as the GitHub release body.
import { readFileSync } from 'node:fs'

const version = process.argv[2] ?? JSON.parse(readFileSync('package.json', 'utf8')).version
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const heading = `## [${version}]`
const start = changelog.indexOf(heading)

if (start === -1) {
  console.error(`CHANGELOG.md has no "${heading}" section`)
  process.exit(1)
}

const bodyStart = changelog.indexOf('\n', start) + 1
const next = changelog.indexOf('\n## [', bodyStart)
const section = changelog.slice(bodyStart, next === -1 ? undefined : next)

process.stdout.write(`${section.replace(/\n---\s*$/, '').trim()}\n`)
