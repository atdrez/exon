# exon-package-manager

Package manager for exon projects: installs dependencies declared in
`exon-package.json`.

## Install

### Global install (recommended for CLI usage)

```
npm install -g exon-package-manager
```

This puts the `expm` command on your `PATH`, so it can be called from any
directory:

```
$ expm install
```

### Local install

```
npm install --save-dev exon-package-manager
```

Without a global install, run it via `npx` or an npm script instead of a bare
`expm` call:

```
npx expm install
```

## Usage

```
expm install [dir]
expm uninstall [name]
expm pack [dir] [--compress]
expm publish [dir] [--compress] [--registry <url>]
expm login [--registry <url>]
expm logout [--registry <url>]
```

- `expm install [dir]` - installs the dependencies declared in the
  `exon-package.json` found in `dir` (defaults to the current directory). If
  the project declares a `scripts.preinstall` command, it is run first (from
  the project directory, through the shell), so it can prepare anything the
  install step depends on - for example `pip install ...` or `npx playwright
  install` before the matching npm packages are pulled in. After all exon and
  npm dependencies have been installed, a `scripts.postinstall` command (if
  declared) is run the same way. Any non-zero exit from a script aborts the
  install with the script's exit code. Each
  dependency is fetched from its registry (the `registry` field in its
  `dependencies` entry, or `https://api.exonlang.org` by default) via the
  registry backend's package API: a `GET /api/v1/packages/<name>/<version>`
  metadata request, which carries the published SHA-256 hash, followed by a
  `GET .../download` request for the archive itself. The downloaded archive
  is hashed and checked against the metadata's hash before extraction, so a
  corrupted or truncated download is rejected instead of silently installed.
  Both requests carry a bearer token when one is available (see "Authentication"
  below); installing a private package with no token fails with the registry's own
  401/403 response.
- `expm uninstall [name]` - uninstalls the given dependency, or all installed
  dependencies if `name` is omitted.
- `expm pack [dir] [--compress]` - packages the contents of `dir` (defaults to
  the current directory) into a `.expkg` archive, ready to be published for
  the `install`'s http(s) source path. The archive is named after the
  package's `name`/`version` fields (`<name>-<version>.expkg`, or
  `<name>.expkg` when no version is set, or `package.expkg` when no name is
  set) and is written next to `exon-package.json`. `exon_modules`,
  `node_modules`, `.git`, and any existing `*.expkg` files are excluded.
  With `--compress`, `.js` files are minified and stripped of comments, and
  `.exon` files have comments and insignificant whitespace removed (string
  contents, including triple-quoted multiline strings, are left untouched);
  all other files are copied through unchanged.
- `expm publish [dir] [--compress] [--registry <url>]` - packs the project in
  `dir` (defaults to the current directory) the same way as `pack`, then
  publishes the resulting archive to the exon package registry. `name` and
  `version` must be set in `exon-package.json`. Publishing requires a bearer
  token, resolved as described in "Authentication" below; the registry API
  base URL defaults to `https://api.exonlang.org` and can be overridden with
  the `EXON_REGISTRY_API` environment variable or the `--registry` flag.

  Publishing follows the registry's three-step, upload-direct-to-storage
  flow: declare the package and get back presigned upload URLs for each part
  of the archive, upload every part straight to storage, then report the
  uploaded parts back so the registry can finalize and publish the package.
  Archive bytes are never proxied through this tool's own process beyond
  reading the packed file and streaming it out - see the backend's
  `backend/docs/api.md` for the full protocol.
- `expm login [--registry <url>]` - prompts for an email and password (the
  password is not echoed to the terminal) and exchanges them for a session
  with the registry's backend (`POST /users/login`). The session is saved to
  `~/.exon/auth.json`, scoped to the resolved registry, so subsequent
  `expm publish`/`expm install` calls against that same registry pick it up
  automatically. The file is written with owner-only (`0600`) permissions.
- `expm logout [--registry <url>]` - revokes the session stored for the
  resolved registry (`POST /users/logout`) and removes it from
  `~/.exon/auth.json`. The local session is cleared even if the registry is
  unreachable or the session was already invalid.

## Authentication

Commands that talk to the registry (`install`, `publish`) resolve a bearer
token in this order, and proceed with no token at all if none of these
produce one - which is fine for installing a public package, but `publish`
always requires one:

1. An explicit token passed by the calling code (used by this package's own
   tests; there is no CLI flag for it).
2. The `EXON_REGISTRY_TOKEN` environment variable - the recommended way to
   authenticate in CI, where there is no interactive terminal to run
   `expm login` in.
3. The session saved by a prior `expm login` for the resolved registry, read
   from `~/.exon/auth.json`.
