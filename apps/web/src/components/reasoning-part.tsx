import { useSmoothText } from "@convex-dev/agent/react";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./ai-elements/reasoning";
import { Response } from "./ai-elements/response";
import { LoadingDots } from "./ai-elements/loading-dots";

export default function ReasoningParts({
    parts,
    messageKey,
    isStreaming,
  }: {
    parts: Array<{ text?: string }>;
    messageKey: string;
    isStreaming: boolean;
  }) {
    const combinedReasoningText = parts.map((p) => p.text || "").join("\n");
    const [reasoningText] = useSmoothText(combinedReasoningText, {
      startStreaming: isStreaming,
    });
  
    if (!reasoningText) return null;
  
    return (
      <Reasoning
        key={`${messageKey}-reasoning`}
        isStreaming={isStreaming}
        className="mb-4"
      >
        <ReasoningTrigger />
        <ReasoningContent>{reasoningText}</ReasoningContent>
      </Reasoning>
    );
  }
  
  export  function TextParts({
    parts,
    messageKey,
    isStreaming,
  }: {
    parts: Array<{ text?: string }>;
    messageKey: string;
    isStreaming: boolean;
  }) {
    const combinedText = parts.map((p) => p.text || "").join("");
    const [partText] = useSmoothText(combinedText, {
      startStreaming: isStreaming,
    });
  
    return (
      <div className="leading-relaxed text-base text-foreground/90">
        {partText ? (
          <Response>{partText}</Response>
        ) : isStreaming ? (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <LoadingDots />
          </span>
        ) : null}
      </div>
    );
  }