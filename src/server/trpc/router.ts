import { router } from "./trpc";
import { deploymentsRouter } from "./routers/deployments";

export const appRouter = router({
  deployments: deploymentsRouter,
});

export type AppRouter = typeof appRouter;
