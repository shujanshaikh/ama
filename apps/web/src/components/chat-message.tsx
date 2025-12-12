import {
  useSmoothText,
  type UIMessage,
} from "@convex-dev/agent/react";
import { Message, MessageContent, MessageResponse } from "./ai-elements/message";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Button } from "./ui/button";
import { Copy } from "lucide-react";
import { Source, Sources, SourcesContent, SourcesTrigger } from "./ai-elements/sources";
import { Shimmer } from "./ai-elements/shimmer";
import ReasoningParts, { TextParts } from "./reasoning-part";



export default function ChatMessage({ message }: { message: UIMessage }) {
    const isUser = message.role === "user";
    const isStreaming = message.status === "streaming";
    const isFailed = message.status === "failed";
    const [visibleText] = useSmoothText(message.text, {
      startStreaming: isStreaming,
    });
    
  
    const sourceParts = message.parts.filter((p) => p.type === "source-url");
    const hasSources = sourceParts.length > 0;
  
    const reasoningParts = message.parts.filter((p) => p.type === "reasoning");
  
    const textParts = message.parts.filter((p) => p.type === "text");
    if (isUser) {
      return (
        <div className="flex flex-col items-end group">
          <Message from="user">
            <MessageContent
              className={cn(
                "rounded-2xl shadow-sm",
                isFailed && "bg-destructive/10 border-destructive/20 text-destructive"
              )}
            >
              {visibleText && <MessageResponse>{visibleText}</MessageResponse>}
              {message.parts
                .filter((part) => part.type === "file" && (part as any).mediaType?.startsWith("image/"))
                .length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.parts
                      .filter((part) => part.type === "file" && (part as any).mediaType?.startsWith("image/"))
                      .map((part, idx) => (
                        <div
                          key={`user-message-image-${idx}`}
                          className="relative group rounded-xl overflow-hidden border border-border/40 bg-muted/30 hover:border-border/60 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <img
                            src={(part as any).url}
                            className="max-w-[280px] max-h-[280px] min-w-[120px] min-h-[120px] w-auto h-auto object-cover"
                            alt="Uploaded image"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>
                      ))}
                  </div>
                )}
            </MessageContent>
          </Message>
          {!isStreaming && (
            <div className="mt-2 flex items-center justify-end gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => {
                    navigator.clipboard.writeText(visibleText || "");
                  }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top"
                  className="bg-popover/95 backdrop-blur-xl border border-border/50 text-popover-foreground shadow-lg px-3 py-2 text-xs font-medium"
                >
                  Copy
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      );
    }
  
    return (
      <>
        <Message from="assistant">
          <MessageContent
            className={cn(
              "w-full",
              isFailed && "bg-destructive/10 border-destructive/20 text-destructive rounded-2xl px-4 py-3"
            )}
          >
  
            {hasSources && (
              <Sources className="mb-4">
                <SourcesTrigger count={sourceParts.length} />
                {sourceParts.map((part, i) => (
                  <SourcesContent key={`${message.key}-source-${i}`}>
                    <Source href={part.url || ""} title={part.url || ""} />
                  </SourcesContent>
                ))}
              </Sources>
            )}
  
            
  
            {reasoningParts.length > 0 && (
              <ReasoningParts
                parts={reasoningParts as Array<{ text?: string }>}
                messageKey={message.key}
                isStreaming={isStreaming}
              />
            )}

            {textParts.length > 0 && (
              <TextParts
                parts={textParts as Array<{ text?: string }>}
                messageKey={message.key}
                isStreaming={isStreaming}
              />
            )}
  
            {message.parts.length === 0 && (
              <div className="leading-relaxed text-base text-foreground/90">
                {visibleText ? (
                  <MessageResponse>{visibleText}</MessageResponse>
                ) : isStreaming ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Shimmer>Thinking...</Shimmer>
                  </span>
                ) : null}
              </div>
            )}
          </MessageContent>
        </Message>
        {!isStreaming && message.parts.length > 0 && (
          <div className="mt-3 flex items-center justify-start gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => {
                  navigator.clipboard.writeText(visibleText || "");
                }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent 
                side="top"
                className="bg-popover/95 backdrop-blur-xl border border-border/50 text-popover-foreground shadow-lg px-3 py-2 text-xs font-medium"
              >
                Copy
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </>
    );
  }