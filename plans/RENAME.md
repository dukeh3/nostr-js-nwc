# Rename Plan: `nostr-nwc-ts` → `nostr-js-nwc`

## Why

Aligns the repo name with the family convention `nostr-<lang>-nwc`
(already: `nostr-php-nwc`; future: `nostr-py-nwc`, `nostr-rs-nwc`, …).
The language marker moves into the middle slot because the family
shape is `nostr-*-nwc` and the middle identifies the implementation.

## Scope

In scope:

- GitHub repo rename: `dukeh3/nostr-nwc-ts` → `dukeh3/nostr-js-nwc`.
- Local working copy rename: `~/git/nostr-nwc-ts` → `~/git/nostr-js-nwc`.
- Update `origin` remote URL.
- Stop tracking `dist/` in git (generated artifact). Add a `prepare`
  script so git-URL installs still produce a build. This also
  removes the stale sourcemap references to the old repo name.

Out of scope:

- **npm package name stays** `@dukeh3/nostr-nwc`. Registry is
  JS-only, so the language marker is redundant there. No version
  bump, no republish, no consumer changes.
- No code changes, no import-path changes, no test changes.

## Preconditions

- No open PRs against `dukeh3/nostr-nwc-ts` (GitHub rewrites PR URLs,
  but avoid rename mid-review).
- No CI pipelines or external systems referencing the old repo URL
  that can't follow a redirect. GitHub creates a permanent redirect,
  but explicit remotes are cleaner once updated.
- Local working copy is clean (`git status` empty).

## Steps

1. **GitHub rename.**
   `gh repo rename nostr-js-nwc --repo dukeh3/nostr-nwc-ts`
   GitHub auto-redirects the old URL.

2. **Rename local directory.**
   `mv ~/git/nostr-nwc-ts ~/git/nostr-js-nwc`

3. **Update git remote.**
   `cd ~/git/nostr-js-nwc && git remote set-url origin https://github.com/dukeh3/nostr-js-nwc.git`
   Verify with `git remote -v` and `git fetch`.

4. **Stop tracking `dist/`.**
   `git rm -r --cached dist/`
   Add `dist/` to `.gitignore`.
   Add `"prepare": "npm run build"` to `package.json` scripts so
   consumers installing via git URL get a build at install time.
   `npm publish` continues to work because the published tarball
   still includes `dist/` (`files: ["dist"]`); `prepare` also runs
   before `npm publish`.

5. **Smoke test.**
   `npm install && npm run typecheck && npm run build`

6. **Tag check.**
   `git tag` — confirm `v0.1.0` still present. (Tags survive rename.)

## Rollback

- GitHub rename is reversible: `gh repo rename nostr-nwc-ts` on the
  renamed repo restores the old name. GitHub then redirects in the
  opposite direction.
- Local `mv` is trivially reversible.
- Un-tracking `dist/` is reversible by `git revert` on the commit
  that removed it; the files are still in git history at prior
  commits.

## Verification

- `https://github.com/dukeh3/nostr-nwc-ts` 302s to the new URL.
- `git clone git@github.com:dukeh3/nostr-js-nwc.git` works.
- `grep -r nostr-nwc-ts .` returns no hits outside `.git/` and
  intentional historical references (e.g. this plan, CHANGELOG).
- `npm pack --dry-run` still shows package name `@dukeh3/nostr-nwc`
  and includes `dist/` in the tarball (built by `prepare`).
- `npm install github:dukeh3/nostr-js-nwc` in a scratch project
  produces a `dist/` directory (smoke test for `prepare`).

## Follow-ups (not part of this rename)

- If/when a README is added, document the family naming so the middle
  slot is not questioned again.
- If new consumers appear that reference the old URL in `package.json`
  `dependencies` via git URL, update them to the new URL (redirect
  works but is implicit).
