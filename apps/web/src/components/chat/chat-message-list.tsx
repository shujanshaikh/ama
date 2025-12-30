import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
  MessageAttachments,
  MessageAttachment,
} from '@/components/ai-elements/message';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ToolRenderer } from '@/components/tool-render';
import type { ChatMessage } from '@ama/server/lib/tool-types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  chatId: string | undefined;
  status: 'streaming' | 'submitted' | 'ready' | 'error';
  onRegenerate: () => void;
  onPlanNameDetected?: (planName: string) => void;
}

export function ChatMessageList({
  messages,
  isLoadingMessages,
  chatId,
  status,
  onRegenerate,
  onPlanNameDetected,
}: ChatMessageListProps) {
  const detectedPlanNamesRef = useRef<Set<string>>(new Set());

  // Detect plan names from messages
  useEffect(() => {
    if (!onPlanNameDetected) return;

    messages.forEach((message) => {
      if (message.role !== 'assistant') return;

      message.parts.forEach((part) => {
        if (part.type === 'text') {
          const planFileMatch = part.text.match(/\.ama\/plan\.([^.]+)\.md/i);
          const detectedPlanName = planFileMatch ? planFileMatch[1] : null;

          if (detectedPlanName && !detectedPlanNamesRef.current.has(detectedPlanName)) {
            detectedPlanNamesRef.current.add(detectedPlanName);
            onPlanNameDetected(detectedPlanName);
          }
        }
      });
    });
  }, [messages, onPlanNameDetected]);

  return (
    <Conversation className="flex-1 min-h-0">
      <ConversationContent className="pb-6 pt-16">
        <div className="w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto space-y-3">
          {isLoadingMessages && chatId && messages.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                <Sources>
                  <SourcesTrigger
                    count={
                      message.parts.filter(
                        (part) => part.type === 'source-url',
                      ).length
                    }
                  />
                  {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                    <SourcesContent key={`${message.id}-${i}`}>
                      <Source
                        key={`${message.id}-${i}`}
                        href={part.url}
                        title={part.url}
                      />
                    </SourcesContent>
                  ))}
                </Sources>
              )}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageAttachments>
                            {message.parts
                              ?.filter((part) => part.type === "file")
                              .map((part, index) => (
                                <MessageAttachment key={`${message.id}-${index}`} data={part} />
                              ))}
                          </MessageAttachments>
                          <MessageResponse>
                            {part.text}
                          </MessageResponse>
                        </MessageContent>
                        {message.role === 'assistant' && i === message.parts.length - 1 && (
                          <MessageActions>
                            <MessageAction
                              onClick={() => onRegenerate()}
                              label="Retry"
                            >
                              <span className="text-[10px] text-muted-foreground/60 hover:text-foreground/70 transition-colors">Retry</span>
                            </MessageAction>
                            <MessageAction
                              onClick={() =>
                                navigator.clipboard.writeText(part.text)
                              }
                              label="Copy"
                            >
                              <span className="text-[10px] text-muted-foreground/60 hover:text-foreground/70 transition-colors">Copy</span>
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    );
                  case 'reasoning':
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  default:
                    return <ToolRenderer key={`${message.id}-${i}`} part={part} />;
                }
              })}
            </div>
          ))}
          {status === "submitted" && (
            <div className="text-xs text-muted-foreground py-2">
              Thinking...
            </div>
          )}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

