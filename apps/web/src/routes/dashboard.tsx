import { createFileRoute } from "@tanstack/react-router";
import { AmaLogo } from "@/components/ama-logo";
import { PromptBox } from "@/components/prompt-box";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const handleSubmit = async (message: string) => {
    console.log("Submitted:", message);
    // You can navigate to a chat route here:
    // navigate({ to: "/chat", search: { q: message } });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4">
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col items-center gap-10 -mt-40">
          <div className="flex items-center w-full max-w-2xl mx-auto pt-6 pb-4">
            <AmaLogo size={32} />
            <span className="text-[32px] text-muted-foreground/70 font-bold leading-none ml-0">
              ma
            </span>
          </div>
          <PromptBox
            onSubmit={handleSubmit}
            placeholder="Start typing to build something amazing..."
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

