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
```

- `expm install [dir]` - installs the dependencies declared in the
  `exon-package.json` found in `dir` (defaults to the current directory).
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
