import type { MetadataRoute } from "next";

/**
 * The Web App Manifest — what makes Oyevolve installable.
 *
 * Installability needs, at minimum: a name, a `start_url`, a `display` mode
 * other than `browser`, and a 192px + 512px icon. The maskable icon lets
 * Android crop the mark into its own launcher shape without losing it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oyevolve",
    short_name: "Oyevolve",
    description: "Evidence-first assessment intelligence for learners.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF4E7",
    theme_color: "#1E2A6B",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
