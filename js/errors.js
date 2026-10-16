// Errors the UI maps to the spec's "Error and loading states" messages.

// A weather or geocoding service is unreachable, offline, timed out, or returned an error.
export class ServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServiceError';
  }
}

// The location could not be matched to a US place ("No US match found").
export class NoMatchError extends Error {
  constructor(message = 'No US match found') {
    super(message);
    this.name = 'NoMatchError';
  }
}
