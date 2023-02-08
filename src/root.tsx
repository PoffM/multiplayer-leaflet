// @refresh reload
import { createSignal, onMount, Suspense } from "solid-js";
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Meta,
  Routes,
  Scripts,
  Title,
} from "solid-start";
import "./main.css";

export default function Root() {
  const [colorMode, setColorMode] = createSignal("dark");

  onMount(() => {
    setColorMode(
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    );
  });

  return (
    <Html lang="en">
      <Head>
        <Title>Multiplayer Leaflet</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body data-theme={colorMode()} class={colorMode()}>
        <Suspense>
          <ErrorBoundary>
            <Routes>
              <FileRoutes />
            </Routes>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
