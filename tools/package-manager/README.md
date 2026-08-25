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
  Both requests require an `EXON_REGISTRY_TOKEN` environment variable holding
  a bearer token.
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
  `version` must be set in `exon-package.json`. Publishing requires an
  `EXON_REGISTRY_TOKEN` environment variable holding a bearer token (obtained
  by logging in against the registry's backend); the registry API base URL
  defaults to `https://api.exonlang.org` and can be overridden with the
  `EXON_REGISTRY_API` environment variable or the `--registry` flag.

  Publishing follows the registry's three-step, upload-direct-to-storage
  flow: declare the package and get back presigned upload URLs for each part
  of the archive, upload every part straight to storage, then report the
  uploaded parts back so the registry can finalize and publish the package.
  Archive bytes are never proxied through this tool's own process beyond
  reading the packed file and streaming it out - see the backend's
  `backend/docs/api.md` for the full protocol.
