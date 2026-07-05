export const SHARED_THEME_KEY = 'remote-mapper-ui-theme'

export function readSharedTheme(legacyKey, legacyClassicValue = 'classic') {
  if (typeof window === 'undefined') return 'terminal'

  try {
    const sharedTheme = window.localStorage.getItem(SHARED_THEME_KEY)
    if (sharedTheme === 'terminal' || sharedTheme === 'classic') return sharedTheme

    const legacyTheme = legacyKey ? window.localStorage.getItem(legacyKey) : null
    return legacyTheme === legacyClassicValue ? 'classic' : 'terminal'
  } catch {
    return 'terminal'
  }
}

export function writeSharedTheme(theme) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARED_THEME_KEY, theme === 'terminal' ? 'terminal' : 'classic')
  } catch {
    // Local storage can be disabled without blocking either mapper.
  }
}
