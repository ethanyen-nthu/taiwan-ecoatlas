import { TreeSurveys } from "@/components/trends/tree-surveys";

export const metadata = {
  title: "Counted year by year · 逐年盤點",
  description:
    "Taipei’s park-tree and riverside-tree records by survey year, and why survey dates are not a count of how many trees there were.",
};

export default function Page() {
  return <TreeSurveys />;
}
