import { useEffect } from "react";

/**
 * Custom React hook to dynamically manage document head metadata for SEO.
 *
 * @param {Object} options
 * @param {string} options.title - Page title (e.g. "Candidate Login")
 * @param {string} options.description - Meta description text
 * @param {string} [options.canonical] - Optional specific canonical path
 * @param {boolean} [options.noindex] - If true, sets robots to noindex
 */
export default function usePageMeta({ title, description, canonical, noindex = false }) {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = "ProctorX — Intelligent Assessment & AI Proctoring";
    if (title) {
      document.title = `${title} | ProctorX`;
    } else {
      document.title = baseTitle;
    }

    // 2. Update Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", description);
    }

    // 3. Update Robots Indexing
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (robotsMeta) {
      robotsMeta.setAttribute(
        "content",
        noindex
          ? "noindex, nofollow"
          : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
    }

    // 4. Update Canonical Link
    if (canonical && typeof window !== "undefined") {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonical);
    }
  }, [title, description, canonical, noindex]);
}
