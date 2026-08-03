import { fetchHomepageContent, fetchPublicProducts } from "@/lib/server-data";
import HomeClient from "./HomeClient";

/**
 * Server wrapper for the homepage.
 *
 * Previously the homepage was fully client-rendered: it showed a
 * full-screen "DRMA" loading pulse on every visit while two API calls
 * resolved. Fetching the CMS content and product list here means the
 * page arrives as complete HTML — faster first paint, no loading flash,
 * and the hero/mission copy is visible to search engines.
 *
 * force-dynamic keeps the previous always-fresh behaviour (the CMS
 * dashboard expects edits to appear on the next page load).
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [homepage, products] = await Promise.all([
    fetchHomepageContent().catch(() => null),
    fetchPublicProducts().catch(() => []),
  ]);

  return <HomeClient homepage={homepage} products={products} />;
}
