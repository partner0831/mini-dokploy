import type { NextApiRequest, NextApiResponse } from "next";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/server/auth";

const handler = toNodeHandler(auth);

export default async function authHandler(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
