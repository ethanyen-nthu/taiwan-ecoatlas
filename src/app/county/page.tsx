import { CountyIndex } from "@/components/county-profile";
import { countyRows } from "@/lib/county-rows";
import { atlasFacts } from "@/server/facts";

export const metadata = { title: "County profiles · 縣市檔案" };

export default async function Page() {
  return <CountyIndex rows={countyRows(await atlasFacts())} />;
}
