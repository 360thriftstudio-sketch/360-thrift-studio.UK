// OS-user-bound secret storage. Tokens never touch .env, the database, snapshots or the browser.
//   Windows: DPAPI (CurrentUser) via PowerShell, ciphertext in data/app/vault/
//   macOS:   login Keychain via `security`
//   Linux:   libsecret via `secret-tool`
// If none is available the vault refuses to store anything and says why.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { getConfig } from './config.js'

const SERVICE = 'etsy-seller-studio'
const NAME_RE = /^[a-z0-9_-]{1,64}$/

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, encoding: 'utf8', windowsHide: true, timeout: 20000 })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status}`)
  return r.stdout
}
const has = (cmd) => {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' })
  return r.status === 0
}

function dpapiBackend() {
  const dir = path.join(getConfig().paths.app, 'vault')
  const file = (n) => path.join(dir, `${n}.dpapi`)
  const ps = (script, input) =>
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], input).trim()
  const prelude = 'Add-Type -AssemblyName System.Security; $in = [Console]::In.ReadToEnd().Trim();'
  return {
    name: 'dpapi',
    set(n, value) {
      fs.mkdirSync(dir, { recursive: true })
      const b64 = Buffer.from(value, 'utf8').toString('base64')
      const out = ps(
        `${prelude} $b=[Convert]::FromBase64String($in); $e=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,'CurrentUser'); [Convert]::ToBase64String($e)`,
        b64,
      )
      fs.writeFileSync(file(n), out, { mode: 0o600 })
    },
    get(n) {
      if (!fs.existsSync(file(n))) return null
      const out = ps(
        `${prelude} $b=[Convert]::FromBase64String($in); $d=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); [Convert]::ToBase64String($d)`,
        fs.readFileSync(file(n), 'utf8'),
      )
      return Buffer.from(out, 'base64').toString('utf8')
    },
    delete(n) {
      fs.rmSync(file(n), { force: true })
    },
  }
}

function keychainBackend() {
  return {
    name: 'keychain',
    set(n, value) {
      run('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', n, '-w', Buffer.from(value).toString('base64')])
    },
    get(n) {
      const r = spawnSync('security', ['find-generic-password', '-s', SERVICE, '-a', n, '-w'], { encoding: 'utf8' })
      return r.status === 0 ? Buffer.from(r.stdout.trim(), 'base64').toString('utf8') : null
    },
    delete(n) {
      spawnSync('security', ['delete-generic-password', '-s', SERVICE, '-a', n])
    },
  }
}

function secretToolBackend() {
  return {
    name: 'secret-tool',
    set(n, value) {
      run('secret-tool', ['store', `--label=${SERVICE} ${n}`, 'service', SERVICE, 'account', n], value)
    },
    get(n) {
      const r = spawnSync('secret-tool', ['lookup', 'service', SERVICE, 'account', n], { encoding: 'utf8' })
      return r.status === 0 && r.stdout ? r.stdout : null
    },
    delete(n) {
      spawnSync('secret-tool', ['clear', 'service', SERVICE, 'account', n])
    },
  }
}

/** In-process only. Used by automated tests; never persisted. */
export function memoryBackend() {
  const m = new Map()
  return { name: 'memory', set: (n, v) => m.set(n, v), get: (n) => m.get(n) ?? null, delete: (n) => m.delete(n) }
}

let backend
export function setVaultBackend(b) {
  backend = b
}

export function getVault() {
  if (backend) return backend
  const want = getConfig().vault
  const pick = want === 'auto' ? { win32: 'dpapi', darwin: 'keychain' }[process.platform] ?? 'secret-tool' : want
  if (pick === 'dpapi' && process.platform === 'win32') backend = dpapiBackend()
  else if (pick === 'keychain' && process.platform === 'darwin') backend = keychainBackend()
  else if (pick === 'secret-tool' && has('secret-tool')) backend = secretToolBackend()
  else {
    throw new Error(
      `No secure token storage is available (wanted "${pick}" on ${process.platform}). ` +
        'Windows uses DPAPI, macOS uses Keychain, Linux needs `secret-tool` (libsecret-tools) and a running keyring. ' +
        'Tokens are not stored in plain files.',
    )
  }
  return backend
}

function check(n) {
  if (!NAME_RE.test(n)) throw new Error('invalid vault entry name')
}
export const vault = {
  set(n, value) {
    check(n)
    getVault().set(n, typeof value === 'string' ? value : JSON.stringify(value))
  },
  get(n) {
    check(n)
    return getVault().get(n)
  },
  getJson(n) {
    const v = this.get(n)
    if (!v) return null
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  },
  delete(n) {
    check(n)
    getVault().delete(n)
  },
  available() {
    try {
      return getVault().name
    } catch {
      return null
    }
  },
}
