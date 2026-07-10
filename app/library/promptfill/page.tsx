import App from "@/components/promptfill/App";
import Page from "@/components/Page";
import { Sparkles } from "lucide-react";

export default function PromptFillPage() {
  return (
    <Page title={<><Sparkles className="w-6 h-6 mr-2" /> PromptFill</>}>
      <App />
    </Page>
  );
}
