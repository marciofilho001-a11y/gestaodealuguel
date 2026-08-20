import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const payload = path.join(root, "project-source.b64")
const archive = path.join(root, ".project-source.tar.gz")

if (!fs.existsSync(payload)) process.exit(0)
const data = fs.readFileSync(payload, "utf8").trim()
fs.writeFileSync(archive, Buffer.from(data, "base64"))
execFileSync("tar", ["-xzf", archive, "-C", root], { stdio: "inherit" })
fs.rmSync(archive, { force: true })
fs.rmSync(payload, { force: true })
console.log("Projeto fonte restaurado.")
