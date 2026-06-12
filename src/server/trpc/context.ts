import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { config } from "../config";

export async function createContext({ req, res }: CreateNextContextOptions) {
  let session = null;

  if (config.authEnabled) {
    session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  }

  return { req, res, session, authEnabled: config.authEnabled };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
