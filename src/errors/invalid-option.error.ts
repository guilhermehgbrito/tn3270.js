export class InvalidOptionError extends Error {
  constructor(readonly option: string, readonly value: any) {
    super(`Invalid option: ${option}=${value}`);
  }
}
