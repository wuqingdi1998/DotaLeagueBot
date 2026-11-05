export class GroupConfigurationError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}
