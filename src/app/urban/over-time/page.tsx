import { ParkYears } from "@/components/trends/park-years";

export const metadata = {
  title: "When did Taipei build its parks? · 臺北的公園是什麼時候建的？",
  description:
    "Taipei’s parks, squares and green spaces by the decade they were opened, with counts, total area and average size.",
};

export default function Page() {
  return <ParkYears />;
}
