import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pet Finder",
    short_name: "Pet Finder",
    description: "Encontrá o reportá mascotas perdidas cerca tuyo.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDE6DD",
    theme_color: "#7B2CBF",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
