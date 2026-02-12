import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { models } from "../lib/models";
import {
  ArrowUpIcon,
  SquareIcon,
  ZapIcon,
  ClipboardListIcon,
  KeyIcon,
  CheckIcon,
} from "lucide-react";

interface ChatPromptInputProps {
  input: string;
  model: string;
  status: "streaming" | "submitted" | "ready" | "error";
  hasGatewayKey: boolean;
  onInputChange: (value: string) => void;
  onSetModel: (model: string) => void;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onOpenApiKeyDialog: () => void;
}

export function ChatPromptInput({
  input,
  model,
  status,
  hasGatewayKey,
  onInputChange,
  onSetModel,
  onSubmit,
  onStop,
  onOpenApiKeyDialog,
}: ChatPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"agent" | "plan">("agent");
  const [pendingGatewayModel, setPendingGatewayModel] = useState<string | null>(
    null,
  );

  const freeModels = models.filter((m) => m.type === "free");
  const gatewayModels = models.filter((m) => m.type === "gateway");

  useEffect(() => {
    if (hasGatewayKey && pendingGatewayModel) {
      onSetModel(pendingGatewayModel);
      setPendingGatewayModel(null);
    }
  }, [hasGatewayKey, pendingGatewayModel, onSetModel]);

  const handleModelChange = useCallback(
    (value: string) => {
      const modelInfo = models.find((m) => m.id === value);
      if (modelInfo?.type === "gateway" && !hasGatewayKey) {
        setPendingGatewayModel(value);
        onOpenApiKeyDialog();
        return;
      }
      setPendingGatewayModel(null);
      onSetModel(value);
    },
    [hasGatewayKey, onSetModel, onOpenApiKeyDialog],
  );

  const isActive = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      onSubmit(text);
    },
    [input, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isActive) {
          onSubmit(input.trim());
        }
      }
    },
    [input, isActive, onSubmit],
  );

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm",
          "transition-[border-color,box-shadow] duration-300 ease-out",
          "focus-within:border-border focus-within:shadow-md",
          "overflow-hidden",
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={autoResize}
          placeholder="Ask anything..."
          rows={1}
          className="w-full resize-none border-0 bg-transparent px-4 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
          style={{
            minHeight: "36px",
            maxHeight: "96px",
          }}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-2.5 pb-2 pt-0">
          {/* Tools */}
          <div className="flex items-center gap-1.5">
            {/* Agent/Plan toggle */}
            <div className="flex h-7 items-center rounded-lg bg-secondary/40 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode("agent")}
                className={cn(
                  "flex h-[22px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200",
                  mode === "agent"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-transparent hover:text-foreground/80",
                )}
              >
                <ZapIcon
                  className={cn(
                    "size-3 transition-opacity",
                    mode === "agent" ? "opacity-100" : "opacity-50",
                  )}
                />
                <span>Agent</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode("plan")}
                className={cn(
                  "flex h-[22px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200",
                  mode === "plan"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-transparent hover:text-foreground/80",
                )}
              >
                <ClipboardListIcon
                  className={cn(
                    "size-3 transition-opacity",
                    mode === "plan" ? "opacity-100" : "opacity-50",
                  )}
                />
                <span>Plan</span>
              </Button>
            </div>

            {/* Model selector */}
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger className="h-7 rounded-lg border-none bg-transparent px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-none transition-colors duration-200 hover:bg-secondary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Free
                </div>
                {freeModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
                <div className="my-1 border-t border-border" />
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Bring Your Own Key
                </div>
                {gatewayModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-1.5">
                      {m.name}
                      {hasGatewayKey ? (
                        <CheckIcon className="size-3 text-emerald-500" />
                      ) : (
                        <KeyIcon className="size-3 text-amber-400" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* API Key button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenApiKeyDialog}
              className="h-7 w-7 rounded-lg p-0 text-muted-foreground transition-all duration-200 hover:bg-secondary/40 hover:text-foreground/80"
              title="API Keys"
            >
              <KeyIcon className="size-3" />
            </Button>
          </div>

          {/* Submit / Stop */}
          {isActive ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onStop}
                className="h-7 w-7 rounded-xl transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Stop generating"
              >
                <SquareIcon className="size-3" />
              </Button>
            </motion.div>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              size="icon-sm"
              className={cn(
                "h-7 w-7 rounded-xl transition-all duration-200",
                "bg-foreground text-background",
                "hover:opacity-90 hover:scale-105",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
                "active:scale-95",
              )}
              aria-label="Submit"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
