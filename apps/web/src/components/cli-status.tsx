import { useQuery, useMutation } from "convex/react";
import { api } from "@ama/backend/convex/_generated/api";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Copy, Check, Terminal } from "lucide-react";
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
  const activeSession = useQuery(api.agent.toolQueue.getCurrentActiveSession);
  const session = useQuery(
    api.agent.toolQueue.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );

  // Use active session code if available and no local session code
  const currentSessionCode = sessionCode || activeSession?.sessionCode || null;
  const currentSession = session || activeSession;

  const handleGenerateCode = async () => {
    try {
      const result = await generateCode({});
      setSessionCode(result.sessionCode);
    } catch (error) {
      console.error("Failed to generate session code:", error);
    }
  };

  const handleCopy = async () => {
    if (currentSessionCode) {
      await navigator.clipboard.writeText(currentSessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };



  const isConnected =
    currentSession?.status === "active" &&
    currentSession.lastHeartbeat &&
    Date.now() - currentSession.lastHeartbeat < 30000;

  return (
    <div className="px-2 py-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <Terminal className="h-4 w-4" />
            <span>Connect CLI</span>
            {isConnected && (
              <div className="ml-auto h-2 w-2 rounded-full bg-green-500" />
            )}
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
            {currentSessionCode ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Session Code</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                    >
                      Generate New Code
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentSessionCode}
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
                      # Run the CLI agent
                    </div>
                    <div>
                      ama-agent --code {currentSessionCode}
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
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-sm text-muted-foreground text-center">
                  No session code generated yet. Click the button below to create one.
                </p>
                <Button onClick={handleGenerateCode}>
                  Generate Session Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {(currentSessionCode || activeSession) && (
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
