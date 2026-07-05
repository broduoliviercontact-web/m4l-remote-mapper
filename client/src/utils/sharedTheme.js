export const SHARED_THEME_KEY = 'remote-mapper-ui-theme'
export const SHARED_THEMES = ['terminal', 'classic', 'monotype', 'night']
export const DEFAULT_SHARED_THEME = 'night'

export function readSharedTheme(legacyKey, legacyClassicValue = 'classic') {
  if (typeof window === 'undefined') return DEFAULT_SHARED_THEME

  try {
    const sharedTheme = window.localStorage.getItem(SHARED_THEME_KEY)
    if (SHARED_THEMES.includes(sharedTheme)) return sharedTheme

    const legacyTheme = legacyKey ? window.localStorage.getItem(legacyKey) : null
    if (legacyTheme !== null) return legacyTheme === legacyClassicValue ? 'classic' : 'terminal'
    return DEFAULT_SHARED_THEME
  } catch {
    return DEFAULT_SHARED_THEME
  }
}

export function writeSharedTheme(theme) {
  if (typeof window === 'undefined') return
  try {
    const normalizedTheme = theme === 'normal' ? 'classic' : theme
    window.localStorage.setItem(SHARED_THEME_KEY, SHARED_THEMES.includes(normalizedTheme) ? normalizedTheme : 'classic')
  } catch {
    // Local storage can be disabled without blocking either mapper.
  }
}
