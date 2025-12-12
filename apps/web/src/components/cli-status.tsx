import { useQuery, useMutation } from "convex/react";
import { api } from "@ama/backend/convex/_generated/api";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Copy, Check, Terminal, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function CliStatus() {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const generateCode = useMutation(api.agent.toolQueue.generateSessionCode);
  const session = useQuery(
    api.agent.toolQueue.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );

  const handleGenerateCode = async () => {
    try {
      const result = await generateCode({});
      setSessionCode(result.sessionCode);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Failed to generate session code:", error);
    }
  };

  const handleCopy = async () => {
    if (sessionCode) {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const convexUrl = (import.meta as any).env.VITE_CONVEX_URL || "";

  const isConnected =
    session?.status === "active" &&
    session.lastHeartbeat &&
    Date.now() - session.lastHeartbeat < 30000;

  return (
    <div className="px-2 py-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleGenerateCode}
          >
            <Terminal className="h-4 w-4" />
            <span>Connect CLI</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect CLI Agent</DialogTitle>
            <DialogDescription>
              Generate a session code to connect your local CLI agent to this
              session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {sessionCode ? (
              <>
                <div className="space-y-2">
                  <Label>Session Code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={sessionCode}
                      readOnly
                      className="font-mono text-lg tracking-wider"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Command to Run</Label>
                  <div className="rounded-md bg-muted p-3 font-mono text-sm">
                    <div className="text-muted-foreground mb-1">
                      # Set your Convex URL (if not already set)
                    </div>
                    <div className="mb-2">
                      export CONVEX_URL="{convexUrl}"
                    </div>
                    <div className="text-muted-foreground mb-1">
                      # Run the CLI agent
                    </div>
                    <div>
                      ama-agent --code {sessionCode}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Badge variant="default" className="bg-green-500">
                        Connected
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        CLI agent is active
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">Waiting</Badge>
                      <span className="text-sm text-muted-foreground">
                        Waiting for CLI connection...
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {sessionCode && (
        <div className="mt-2 px-2">
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">CLI Connected</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">CLI Disconnected</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
