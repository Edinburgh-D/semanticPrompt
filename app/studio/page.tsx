import type { Metadata } from "next";

import { StudioWorkspace } from "../../components/studio/studio-workspace";

export const metadata: Metadata = {
  title: "Studio",
  description: "把中文视觉意图解析为 VisualSpec、诊断并编译为 GPT Image Prompt。",
};

export default function StudioPage() {
  return <StudioWorkspace />;
}
