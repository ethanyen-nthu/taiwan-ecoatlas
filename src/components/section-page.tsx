import { Suspense } from "react";
import type { AtlasSection } from "@/lib/atlas-types";
import { SectionWorkbench } from "./section-workbench";
export function SectionPage({ section }: { section: AtlasSection }) {
  return (
    <Suspense
      fallback={
        <main id="main" className="document-page">
          <h1>Taiwan EcoAtlas</h1>
          <p>Loading subject / 載入專題</p>
        </main>
      }
    >
      <SectionWorkbench section={section} />
    </Suspense>
  );
}
