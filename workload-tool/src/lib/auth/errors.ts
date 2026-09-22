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

/** Survives the server/client boundary, where instanceof does not. */
export function isConfigurationMessage(message: string): boolean {
  return message.includes("AUTH_MODE") || message.includes("DATABASE_URL");
}
