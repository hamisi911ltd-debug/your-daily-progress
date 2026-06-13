import { createMiddleware } from "@tanstack/react-start";
import { getStoredToken } from "./auth";

export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = getStoredToken();
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
