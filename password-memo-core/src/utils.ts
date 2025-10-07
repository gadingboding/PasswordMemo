
export const enum EnvType {
  BROWSER = 'browser',
  NODE = 'node'
}

export function detectEnvironment(): EnvType {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return EnvType.NODE;
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return EnvType.BROWSER;
  }
  return EnvType.BROWSER;
}