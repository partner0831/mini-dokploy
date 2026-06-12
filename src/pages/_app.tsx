import type { AppProps } from "next/app";
import Head from "next/head";
import { trpc } from "@/utils/trpc";
import "@/styles/globals.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Mini-Dokploy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default trpc.withTRPC(App);
