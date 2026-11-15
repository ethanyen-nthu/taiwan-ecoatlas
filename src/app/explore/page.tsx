import Explorer from "@/components/map/explorer";
export const metadata = { title: "Explore map" };
export default function Page() {
  return (
    <main id="main" className="explore-main">
      <Explorer />
    </main>
  );
}
