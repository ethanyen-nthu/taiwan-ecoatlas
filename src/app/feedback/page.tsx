import { Suspense } from "react";
import { FeedbackView } from "@/components/feedback/feedback-view";

export const metadata = {
  title: "Suggestions and bug reports · 建議與錯誤回報",
  description:
    "Tell the maker what to add, what is broken, or which figure looks wrong. 告訴製作者該新增什麼、哪裡有問題、哪個數字看起來不對。",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FeedbackView />
    </Suspense>
  );
}
