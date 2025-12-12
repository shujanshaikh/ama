import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useAction } from "convex/react";
import { useStoreValue } from "@simplestack/store/react";
import { api } from "@ama/backend/convex/_generated/api";
import {
  optimisticallySendMessage,
  useUIMessages,  
} from "@convex-dev/agent/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Square, ArrowUp } from "lucide-react";
import ChatModelSelector from "@/components/model-selector";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { prompt, selectedModel, urls } from "@/lib/store";
import ChatMessage from "@/components/chat-message";
import { PreviewIframe } from "@/components/web-view";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export const Route = createFileRoute('/chat/$threadId')({
  component: ChatStreaming,
})

function ChatStreaming() {
  const { threadId } = Route.useParams();

  return <Chat threadId={threadId} />;
}

export function Chat({ threadId }: { threadId: string }) {
  const promptValue = useStoreValue(prompt);
  const urlsValue = useStoreValue(urls);
  const selectedModelValue = useStoreValue(selectedModel);
  const {
    results: messages,
  } = useUIMessages(
    api.agent.chatStreaming.listThreadMessages,
    { threadId },
    { initialNumItems: 10, stream: true },
  );

  const sendMessage = useMutation(
    api.agent.chatStreaming.initiateAsyncStreaming,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.agent.chatStreaming.listThreadMessages),
  );
  const abortStreamByOrder = useMutation(
    api.agent.chatStreaming.abortStreamByOrder,
  );
  const updateThreadTitle = useAction(api.agent.thread.updateThreadTitle);
  const titleUpdatedRef = useRef(false);
  const isStreaming = messages.some((m) => m.status === "streaming");

  useEffect(() => {
    titleUpdatedRef.current = false;
  }, [threadId]);

  function onSendClicked() {
    const text = promptValue.trim();
    if (!text) return;

    const isFirstMessage = messages.length === 0;
    void sendMessage({
      threadId,
      prompt: text,
      model: selectedModelValue,
      urls: urlsValue.length > 0 ? urlsValue : undefined,
    }).catch(() => {
    });

    prompt.set("");
    urls.set([]);

    if (isFirstMessage && !titleUpdatedRef.current) {
      titleUpdatedRef.current = true;
      setTimeout(() => {
        updateThreadTitle({ threadId }).catch(console.error);
      }, 1000);
    }
  }



  function handleAbort() {
    const order = messages.find((m) => m.status === "streaming")?.order ?? 0;
    void abortStreamByOrder({ threadId, order });
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col min-h-0">
        <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="pt-4 pb-6">
              <div className="w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto space-y-3">
                {messages.map((m) => (
                  <ChatMessage key={m.key} message={m} />
                ))}
              </div>
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 pb-0">
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                onSendClicked();
              }}
            >
              <div className="flex-1 relative w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto">
                <div className="relative rounded-t-2xl rounded-b-none border border-border/60 bg-background/90 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/20 ring-1 ring-border/20">
                  <Textarea
                    value={promptValue}
                    onChange={(e) => prompt.set(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && promptValue.trim()) {
                        e.preventDefault();
                        onSendClicked();
                      }
                    }}
                    className="w-full min-h-[140px] max-h-[400px] rounded-t-2xl rounded-b-none border-0 bg-transparent placeholder:text-muted-foreground/60 resize-none pr-12 md:pr-14 pb-16 md:pb-12 pt-5 px-4 md:px-5 text-base focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed"
                    placeholder={
                      messages.length > 0
                        ? "Continue the conversation..."
                        : "Type your message here..."
                    }
                    disabled={isStreaming}
                  />
                  <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-12 md:right-auto flex items-center gap-1 md:gap-1.5 md:gap-2 flex-wrap max-w-[calc(100%-3.5rem)] md:max-w-none">
                    <div className="scale-90 md:scale-100 origin-left">
                      <ChatModelSelector model={selectedModelValue} />
                    </div>
                  </div>
                  <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 flex items-center gap-2 flex-shrink-0">
                    {isStreaming ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleAbort}
                        className="h-8 w-8 md:h-9 md:w-9 rounded-lg shadow-md transition-all hover:scale-105 hover:shadow-lg"
                      >
                        <Square className="h-3 w-3 fill-current" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!promptValue.trim()}
                        className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:hover:scale-100"
                      >
                        <ArrowUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col min-h-0">
        <PreviewIframe />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
