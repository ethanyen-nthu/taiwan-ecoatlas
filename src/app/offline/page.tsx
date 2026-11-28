import type { Metadata } from "next";
import { OfflineNotice } from "@/components/pwa/offline-notice";

export const metadata: Metadata = {
  title: "No connection",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineNotice />;
}
