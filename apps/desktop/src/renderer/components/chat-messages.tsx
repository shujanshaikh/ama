import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { ToolRenderer } from "@/components/tool-render";
import { TextParts } from "@/components/ai-elements/text-parts";
import { Loader } from "@/components/ai-elements/loader";
import { CopyIcon, CheckIcon, RotateCcw } from "lucide-react";

interface ChatMessagesProps {
  messages: any[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | undefined;
  onRegenerate: () => void;
}

export function ChatMessages({
  messages,
  isLoading,
  isStreaming,
  error,
  onRegenerate,
}: ChatMessagesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyMessage = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <>
      {messages.map((message) => {
        const isLastMessage =
          message.id === messages[messages.length - 1]?.id;
        const textParts = (message.parts || []).filter(
          (p: any) => p.type === "text" && p.text,
        );
        const toolParts = (message.parts || []).filter(
          (p: any) =>
            p.type === "tool-invocation" ||
            (typeof p.type === "string" && p.type.startsWith("tool-")),
        );
        const reasoningParts = (message.parts || []).filter(
          (p: any) => p.type === "reasoning",
        );
        const messageText = textParts.map((p: any) => p.text).join("\n");

        const isLastAssistantEmpty =
          message.role === "assistant" &&
          isLastMessage &&
          isLoading &&
          textParts.length === 0 &&
          toolParts.length === 0 &&
          reasoningParts.length === 0;

        return (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {isLastAssistantEmpty && (
                <div className="flex items-center gap-2.5 py-1">
                  <Loader className="size-3.5 text-muted-foreground/50" />
                  <span className="text-[13px] text-muted-foreground/60">
                    Thinking...
                  </span>
                </div>
              )}

              {reasoningParts.map((part: any, i: number) => (
                <Reasoning
                  key={`${message.id}-reasoning-${i}`}
                  isStreaming={isStreaming && isLastMessage}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>
                    {part.reasoning || part.text || ""}
                  </ReasoningContent>
                </Reasoning>
              ))}

              {textParts.length > 0 ? (
                <TextParts
                  parts={textParts as any}
                  messageKey={message.id}
                  isStreaming={isStreaming && isLastMessage}
                />
              ) : null}

              {toolParts.map((part: any, i: number) => (
                <ToolRenderer
                  key={`${message.id}-tool-${i}`}
                  part={part}
                />
              ))}

              {message.role === "assistant" &&
                messageText &&
                !isStreaming && (
                  <MessageToolbar>
                    <MessageActions>
                      <MessageAction
                        tooltip="Copy"
                        onClick={() =>
                          copyMessage(messageText, message.id)
                        }
                      >
                        {copiedId === message.id ? (
                          <CheckIcon className="size-3.5" />
                        ) : (
                          <CopyIcon className="size-3.5" />
                        )}
                      </MessageAction>
                    </MessageActions>
                  </MessageToolbar>
                )}
            </MessageContent>
          </Message>
        );
      })}

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/15 bg-destructive/5 px-4 py-3">
          <p className="text-[13px] font-medium text-destructive/90">
            {error.message}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-destructive/70 hover:text-destructive"
            onClick={onRegenerate}
          >
            <RotateCcw className="mr-1.5 size-3" />
            Retry
          </Button>
        </div>
      )}
    </>
  );
}
