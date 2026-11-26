import { Suspense } from "react";
import { SearchView } from "@/components/search/search-view";

export const metadata = {
  title: "Search the atlas · 搜尋",
  description:
    "Find a page, county, Indigenous people, lesson, glossary term, animal, tree or village, in English or Traditional Chinese. 以中文或英文尋找頁面、縣市、原住民族、課程、名詞、動物、樹木與部落。",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
