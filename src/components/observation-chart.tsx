"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Observation } from "@/lib/types";
import { useLanguage } from "./providers";
export default function ObservationChart({
  observations,
}: {
  observations: Observation[];
}) {
  const { t } = useLanguage();
  const counts = observations.reduce<Record<string, number>>((result, o) => {
    const county = o.county || t("County not reported", "未提供縣市");
    result[county] = (result[county] || 0) + 1;
    return result;
  }, {});
  const rows = Object.entries(counts)
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count);
  return (
    <div
      className="chart-container"
      role="img"
      aria-label={t(
        "Number of loaded AQI reports by county",
        "各縣市已載入空品報告數",
      )}
    >
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={rows}
          margin={{ top: 20, right: 20, bottom: 35, left: -15 }}
        >
          <CartesianGrid vertical={false} stroke="#e5e9e4" />
          <XAxis
            dataKey="county"
            fontSize={11}
            interval={0}
            angle={-45}
            textAnchor="end"
            tickLine={false}
          />
          <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
          <Tooltip />
          <Bar
            dataKey="count"
            name={t("Reports", "報告數")}
            fill="#387e68"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
