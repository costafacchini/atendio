// Lightweight shared-state slot for the active in-memory repository set.
// Kept in its own module so that individual repository files can import it
// without creating a circular dependency with testing.ts (which imports the
// repository classes).

let _activeRepositories: Record<string, any> | null = null

function setActiveRepositories(repos: Record<string, any> | null) {
  _activeRepositories = repos
}

function tryGetActiveRepositories(): Record<string, any> | null {
  return _activeRepositories
}

export { setActiveRepositories, tryGetActiveRepositories }
