import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyJWT } from "./auth.server";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: No request headers");

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: Missing Bearer token");

    const token = authHeader.slice(7);
    const claims = verifyJWT(token);
    if (!claims) throw new Error("Unauthorized: Invalid or expired token");

    return next({
      context: {
        userId: claims.sub,
        email: claims.email,
        name: claims.name,
        roles: claims.roles ?? [],
      },
    });
  }
);
