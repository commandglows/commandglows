export function getServerEnv(): Record<string, string | undefined> {
  return {
    ...(import.meta.env as Record<string, string | undefined>),
    ...(typeof process !== "undefined" ? process.env : {}),
  };
}
