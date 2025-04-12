/**
 * WebError class, this will allow error responses to be of a consistent format
 */
export default class WebError extends Error {
  private type: string;
  private statusCode: number;
  private payload: unknown;

  /**
   *
   * @param {unknown} payload, the error payload. Can be of a raw Error object or anything really
   * @param {string} type error type (label, for frontend use mostly)
   * @param {*} statusCode HTTP status code
   */
  constructor(payload: unknown, type: string, statusCode: number) {
    super(type);
    this.type = type ?? "generic";
    this.statusCode = statusCode ?? 403;
    this.payload = payload;
  }

  /**
   * @returns {string} a string representation of the error
   */
  toString(): string {
    return (
      `${this.type}(${this.statusCode}): ` +
      // newline in case payload is a javascript error
      (this.payload instanceof Error
        ? `\n\t${this.payload.toString()}`
        : this.getPrintableObject(this.payload))
    );
  }

  /**
   * See return value for details.
   * @param {unknown} input input object of any type
   * @returns A printable object, if raw Object it wll be a JSON ojbect, otherwise it will be stringified
   */
  getPrintableObject(input: unknown): object | string {
    try {
      //This is a workaround in case somehow input is Object
      //rather than JSON we got [Object object] in print output
      const out = JSON.parse(JSON.stringify(input));

      return out;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      return (input as object).toString();
    }
  }

  /**
   * @returns {Object} a JSON representation of the error
   */
  toJson(): object {
    return {
      type: this.type,
      statusCode: this.statusCode,
      errorType: typeof this.payload,
      payload:
        this.payload instanceof Error
          ? this.payload.message
          : this.getPrintableObject(this.payload),
      stack: this.payload instanceof Error ? this.payload.stack : null,
    };
  }

  /**
   * Throws a generic error for DB access issues
   * @param {Error} error The native JS error
   */
  static dbPanic(error): void {
    throw new WebError(error, "db_access", 501);
  }
}
