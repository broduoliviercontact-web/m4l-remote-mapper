export function normalizePrefix(prefix, fallback) {
  const value = String(prefix || '').trim()
  return value.length ? value : fallback
}

export function buildM4LSlotName(prefix, slotNumber) {
  const safePrefix = String(prefix || '').trim()
  return `${safePrefix} ${slotNumber}`
}

export function buildM4LParamName(parameterPrefix, indexZeroBased) {
  return buildM4LSlotName(normalizePrefix(parameterPrefix, 'M4L Param'), indexZeroBased + 1)
}

export function buildM4LButtonName(buttonPrefix, indexZeroBased) {
  return buildM4LSlotName(normalizePrefix(buttonPrefix, 'M4L Button'), indexZeroBased + 1)
}
