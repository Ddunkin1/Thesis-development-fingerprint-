import type { MetadataRoute } from "next";

// Lets members add the app to their phone's home screen. There is deliberately no offline cache:
// check-ins and memberships must always come from the server.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chaq Gym",
    short_name: "Chaq Gym",
    description: "Your Chaq Gym membership, visits and streak.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7f0",
    theme_color: "#fbf7f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
