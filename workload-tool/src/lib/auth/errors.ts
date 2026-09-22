/**
 * The app is deployed but not configured.
 *
 * Separate from an authorization failure: nobody did anything wrong, an
 * environment variable is missing. The error boundary renders this as setup
 * instructions rather than a generic "something went wrong", because a blank
 * 500 on a fresh deployment tells the person nothing about the one-line fix.
 */
export class ConfigurationError extends Error {
  readonly isConfigurationError = true;

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Recognise a "this deployment is missing its configuration" failure.
 *
 * Covers our own ConfigurationError and Prisma's initialization error for an
 * unresolvable datasource url — both mean the same thing to whoever is setting
 * the deployment up, even though they come from different layers. Returns the
 * text to show, or null if this is a genuine fault that should surface as one.
 */
export function configurationProblem(error: unknown): string | null {
  if (error instanceof ConfigurationError) return error.message;

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/Environment variable not found: DATABASE_URL/i.test(message)) {
    return (
      "DATABASE_URL is not set, so the app cannot read or write anything. " +
      "Add it and redeploy — it is the only variable this deployment needs."
    );
  }

  // A wrong-but-present connection string is also a setup problem, not a bug.
  if (/Can't reach database server|P1001/i.test(message)) {
    return (
      "The database connection string is set, but the server could not be " +
      "reached. Check that it is the Session pooler string on port 5432 and " +
      "that the Supabase project is not paused."
    );
  }

  return null;
}
