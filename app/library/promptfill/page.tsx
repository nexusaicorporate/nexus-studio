export default function PromptFillPage() {
  return (
    <div className="w-full h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-border bg-surface shadow-sm">
      <iframe
        src="/promptfill/index.html"
        className="w-full h-full border-none"
        title="Prompt Fill"
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
}
