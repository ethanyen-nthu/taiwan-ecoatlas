import Explorer from "@/components/map/explorer";
export const metadata = { title: "Explore map" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ layers?: string | string[] }>;
}) {
  const requested = (await searchParams).layers;
  const initialLayers = [
    ...new Set(
      (typeof requested === "string" ? requested : "")
        .split(",")
        .filter((id) => /^[a-z0-9-]{1,60}$/.test(id)),
    ),
  ].slice(0, 12);
  return (
    <main id="main" className="explore-main">
      <Explorer key={initialLayers.join(",")} initialLayers={initialLayers} />
    </main>
  );
}
