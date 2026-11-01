// ============================================
// PlaceCampus — Site Configuration
// ============================================

export const siteConfig = {
  name: "PlaceCampus",
  tagline: "Unified Placement & Student Readiness Platform",
  description:
    "PlaceCampus is an AI-powered placement intelligence platform that helps universities track student readiness, verify skills, and connect graduates with top recruiters.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  ogImage: "/og-image.png",
  links: {
    github: "",
    docs: "/docs",
  },
} as const;
