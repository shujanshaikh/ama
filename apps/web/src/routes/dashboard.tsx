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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6">
          <AmaLogo size={24} />
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              What would you like to build?
            </h1>
            <p className="text-sm text-muted-foreground/70">
              Ask me anything about code, design, or ideas
            </p>
          </div>
        </div>

        <PromptBox
          onSubmit={handleSubmit}
          placeholder="Start typing to build something amazing..."
          className="w-full"
        />
      </div>
    </div>
  );
}

