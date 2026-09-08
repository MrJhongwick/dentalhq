export function databaseConnection(value: string | undefined, pooled: boolean): string {
  // Never include the supplied value in diagnostics, including URL parse errors.
  const invalid = () => new Error("Expected a configured Neon PostgreSQL URL with TLS and the correct pooling mode.");
  if (!value || /[<>]/.test(value)) throw invalid();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid();
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname.endsWith(".neon.tech") ||
    !url.username || !url.password || url.pathname.length < 2 ||
    !["require", "verify-full"].includes(url.searchParams.get("sslmode") ?? "") ||
    url.hostname.split(".")[0].endsWith("-pooler") !== pooled
  ) throw invalid();
  return value;
}
