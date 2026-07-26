const demoTestKeys = {
  "demo-mbti": "mbti",
  "demo-bfi": "bfi",
} as const;

export type DemoTestKey = (typeof demoTestKeys)[keyof typeof demoTestKeys];

export function isDemoTestKey(value: string): value is DemoTestKey {
  return Object.values(demoTestKeys).some((testKey) => testKey === value);
}

export function getDemoTestKey(rawToken: string): DemoTestKey | null {
  return demoTestKeys[rawToken as keyof typeof demoTestKeys] ?? null;
}

export function isDemoTestToken(rawToken: string) {
  return getDemoTestKey(rawToken) !== null;
}
