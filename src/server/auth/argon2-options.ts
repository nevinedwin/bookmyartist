/**
 * Argon2id parameters shared by the app and the admin bootstrap script.
 * OWASP's recommended minimum: 19 MiB memory, 2 passes, parallelism 1.
 * `algorithm: 2` is Argon2id — the package exports it as a `const enum`,
 * which can't be imported under `isolatedModules`.
 */
export const ARGON2_OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
