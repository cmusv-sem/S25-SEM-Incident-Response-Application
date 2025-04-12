import { Request } from "express";
import WebError from "./WebError";

export default class WebUtil {
  /**
   * Returns params from the request and handles the GET/POST/DELETE/PUT automatically
   * @param {Express.Request} request the request object from express
   * @returns
   */
  static params(request: Request) {
    const is_post = new Set(["post", "put", "patch"]).has(
      request["method"].toLowerCase(),
    );

    return is_post ? request.body : request.query;
  }

  /**
   *
   * @param {Express.Request} req the request object from express (or a raw object, that also works!)
   * @param  {...string} requiredParams list of required parameters, will throw WebError 422 if any of these are missing
   */
  static ensureValidParams(req: Request | object, ...requiredParams: string[]) {
    if (req === null) throw new Error("internal_error");

    //We can really pass in anything instead of just the Request object
    const params = "method" in req ? this.params(req) : req;

    const missing: string[] = requiredParams.filter(
      (entry: string) => !(entry in params),
    );

    if (missing.length > 0) throw new WebError(missing, "missing_param", 400);
  }
}
