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
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
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
import { Shimmer } from '@/components/ai-elements/shimmer';
import { DefaultChatTransport } from 'ai';
import { createFileRoute } from '@tanstack/react-router';
import { PreviewIframe } from '@/components/web-view';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { API_URL } from '@/utils/constant';
import { Button } from '@/components/ui/button';
import { ToolRenderer } from '@/components/tool-render';
import type { ChatMessage } from '@ama/server/lib/tool-types';

export const Route = createFileRoute('/chat')({
  component: Chat,
})


function Chat() {
  const [input, setInput] = useState('');
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const { messages, sendMessage, status, regenerate } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
        api: `${API_URL}/agent-proxy`,
    }),
  });
  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }
    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
    );
    setInput('');
  };
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={previewCollapsed ? 100 : 40} minSize={30} className="flex flex-col min-h-0">
        <div className="flex flex-col h-full min-h-0 w-full overflow-hidden relative">
          {previewCollapsed && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                className="rounded-lg border-border/40 bg-background/80 backdrop-blur-md px-5 py-2.5 text-sm font-medium text-foreground/80 shadow-lg shadow-black/5 transition-all duration-200 hover:bg-background hover:text-foreground hover:border-border/60 hover:shadow-xl hover:shadow-black/10 hover:scale-105 active:scale-100"
                onClick={() => setPreviewCollapsed(false)}
              >
                Web
              </Button>
            </div>
          )}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className={`pb-6 ${previewCollapsed ? 'pt-16 pr-32' : 'pt-4'}`}>
              <div className="w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto space-y-3">
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
                                <MessageResponse>
                                  {part.text}
                                </MessageResponse>
                              </MessageContent>
                              {message.role === 'assistant' && i === messages.length - 1 && (
                                <MessageActions>
                                  <MessageAction
                                    onClick={() => regenerate()}
                                    label="Retry"
                                  >
                                    <RefreshCcwIcon className="size-3" />
                                  </MessageAction>
                                  <MessageAction
                                    onClick={() =>
                                      navigator.clipboard.writeText(part.text)
                                    }
                                    label="Copy"
                                  >
                                    <CopyIcon className="size-3" />
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
                {status === "submitted" &&  (
                  <Shimmer className="text-base" duration={1.5}>
                    Thinking...
                  </Shimmer>
                )}
              </div>
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="sticky bottom-4 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 pb-2 md:pb-3">
            <div className="w-full px-3 md:px-4">
              <div className="flex-1 relative w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto">
                <PromptInput onSubmit={handleSubmit} globalDrop multiple>
                  <PromptInputHeader>
                    <PromptInputAttachments>
                      {(attachment) => <PromptInputAttachment data={attachment} />}
                    </PromptInputAttachments>
                  </PromptInputHeader>
                  <PromptInputBody>
                    <PromptInputTextarea
                      onChange={(e) => setInput(e.target.value)}
                      value={input}
                      placeholder="What would you like to build?"
                      className="min-h-[36px] max-h-[120px] resize-none bg-transparent text-base placeholder:text-muted-foreground/50 border-0 focus:ring-0 focus:outline-none px-4 py-2"
                    />
                  </PromptInputBody>
                  <PromptInputFooter className="px-3 pb-1.5 pt-0">
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger className="rounded-lg hover:bg-muted/60" />
                        <PromptInputActionMenuContent>
                          <PromptInputActionAddAttachments />
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <PromptInputSelect defaultValue="anthropic/claude-haiku-4.5">
                        <PromptInputSelectTrigger className="rounded-xl text-xs h-7 px-2.5 border-0 bg-muted/40 hover:bg-muted/60">
                          <PromptInputSelectValue />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          <PromptInputSelectItem value="anthropic/claude-haiku-4.5">
                            Claude Haiku 4.5
                          </PromptInputSelectItem>
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                    </PromptInputTools>
                    <PromptInputSubmit
                      disabled={!input && !status}
                      status={status}
                      className="h-8 w-8 rounded-xl transition-all duration-200 bg-foreground text-background hover:opacity-90 hover:scale-105 disabled:bg-muted/60 disabled:text-muted-foreground disabled:hover:scale-100"
                    />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>

      {!previewCollapsed && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col min-h-0">
            <PreviewIframe onCollapsedChange={setPreviewCollapsed} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
