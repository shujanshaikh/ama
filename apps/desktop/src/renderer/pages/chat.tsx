import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SidePanel } from "../components/side-panel";
import { CodeEditor } from "../components/code-editor";
import { ChatPromptInput } from "../components/chat-prompt-input";
import { API_URL } from "../lib/constants";
import { api } from "../lib/trpc";
import { models } from "../lib/models";
import { cn } from "../lib/utils";
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
import { LoadingDots } from "@/components/ai-elements/loading-dots";
import { Loader } from "@/components/ai-elements/loader";
import { AmaLogo } from "@/components/ama-logo";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import {
  CopyIcon,
  CheckIcon,
  RotateCcw,
  ArrowDown,
  PlusIcon,
  PanelLeftIcon,
  CodeIcon,
} from "lucide-react";

interface ProjectInfo {
  id: string;
  name: string;
  cwd: string;
}

export function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatId = searchParams.get("chat");
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0].id);
  const [hasGatewayKey, setHasGatewayKey] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [hasOpenedEditor, setHasOpenedEditor] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef(model);
  modelRef.current = model;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Fetch project info
  useEffect(() => {
    if (!projectId) return;
    api
      .getProject(projectId)
      .then((p) => p && setProject(p))
      .catch(console.error);
  }, [projectId]);

  // Check gateway key
  useEffect(() => {
    api.hasApiKey().then(setHasGatewayKey).catch(() => {});
  }, []);

  const gatewayTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (hasGatewayKey) {
      api.getGatewayToken().then((t) => {
        gatewayTokenRef.current = t;
      });
    } else {
      gatewayTokenRef.current = null;
    }
  }, [hasGatewayKey]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/v1/agent-proxy`,
        credentials: "include",
        headers: () => {
          const token = gatewayTokenRef.current;
          if (token) {
            return { Authorization: `Bearer ${token}` };
          }
          return {} as Record<string, string>;
        },
        prepareSendMessagesRequest({ messages, body }) {
          const lastMessage = messages.at(-1);
          return {
            body: {
              chatId,
              message: lastMessage,
              model: modelRef.current,
              ...body,
            },
          };
        },
      }),
    [chatId],
  );

  const {
    messages,
    sendMessage,
    stop,
    error,
    regenerate,
    status,
    setMessages,
  } = useChat({
    transport,
    id: chatId || "new-chat",
  });

  // Load existing messages when chat is selected
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const hasInitializedRef = useRef(false);
  const currentChatIdRef = useRef<string | undefined>(chatId ?? undefined);

  useEffect(() => {
    if (chatId !== currentChatIdRef.current) {
      currentChatIdRef.current = chatId ?? undefined;
      hasInitializedRef.current = false;
      setMessages([]);
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    if (!chatId || isLoadingMessages) return;
    if (hasInitializedRef.current && currentChatIdRef.current === chatId)
      return;
    if (status === "streaming" || status === "submitted") return;

    let cancelled = false;
    setIsLoadingMessages(true);
    api
      .getMessages(chatId)
      .then((initialMessages) => {
        if (cancelled) return;
        if (Array.isArray(initialMessages) && initialMessages.length > 0) {
          setMessages(initialMessages as any);
        }
        hasInitializedRef.current = true;
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load messages:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, status, setMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll detection
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard shortcuts: Cmd+E for editor
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "e" || event.key === "E") {
          event.preventDefault();
          setShowEditor((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lazily mount editor on first open to avoid booting VS Code while hidden.
  useEffect(() => {
    if (showEditor && !hasOpenedEditor) {
      setHasOpenedEditor(true);
    }
  }, [showEditor, hasOpenedEditor]);

  // Create new chat
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const handleNewChat = useCallback(async () => {
    if (!projectId) return;
    setIsCreatingChat(true);
    try {
      const newChatId = await api.createChat(projectId, "New Chat");
      if (newChatId) {
        navigate(`/chat/${projectId}?chat=${newChatId}`);
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    } finally {
      setIsCreatingChat(false);
    }
  }, [projectId, navigate]);

  const isLoading = status === "streaming" || status === "submitted";
  const isStreaming = status === "streaming";

  // Copy message text
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyMessage = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Side Panel */}
      <SidePanel
        projectName={project?.name || "Project"}
        onNewChat={handleNewChat}
        isCreatingChat={isCreatingChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />

      {/* Main area */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Drag region + floating controls */}
        <div
          className={cn(
            "drag-region absolute inset-x-0 top-0 z-20 h-8",
            showEditor && "pointer-events-none opacity-0",
          )}
        >
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="no-drag absolute left-3 top-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftIcon className="size-4" />
            </button>
          )}
          {!showEditor && (
            <button
              onClick={() => setShowEditor((p) => !p)}
              className={cn(
                "no-drag absolute right-3 top-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <CodeIcon className="size-3.5" />
              <span>Editor</span>
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="relative flex-1 min-h-0">
          {/* Chat panel — hidden when editor is fullscreen */}
          <div
            className={cn(
              "flex flex-col size-full",
              showEditor ? "hidden" : "",
            )}
          >
            {/* Messages */}
            <div
              ref={scrollContainerRef}
              className="no-drag relative flex-1 overflow-y-auto"
            >
              {!chatId ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <AmaLogo size={64} />
                  <div className="text-center">
                    <h2 className="mb-2 text-lg font-medium text-foreground">
                      Start a new conversation
                    </h2>
                  </div>
                  <Button
                    onClick={handleNewChat}
                    disabled={isCreatingChat}
                    size="default"
                    className="gap-2 rounded-xl"
                    variant="outline"
                  >
                    <PlusIcon className="h-5 w-5" />
                    {isCreatingChat ? "Creating..." : "New Chat"}
                  </Button>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <Loader className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading chat...
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl px-4 py-6">
                  {messages.map((message) => {
                    const textParts = (message.parts || []).filter(
                      (p: any) => p.type === "text" && p.text,
                    );
                    const toolParts = (message.parts || []).filter(
                      (p: any) =>
                        p.type === "tool-invocation" ||
                        (typeof p.type === "string" &&
                          p.type.startsWith("tool-")),
                    );
                    const reasoningParts = (message.parts || []).filter(
                      (p: any) => p.type === "reasoning",
                    );
                    const messageText = textParts
                      .map((p: any) => p.text)
                      .join("\n");

                    return (
                      <Message key={message.id} from={message.role}>
                        <MessageContent>
                          {/* Reasoning */}
                          {reasoningParts.map((part: any, i: number) => (
                            <Reasoning
                              key={`${message.id}-reasoning-${i}`}
                              isStreaming={
                                isStreaming &&
                                message.id ===
                                  messages[messages.length - 1]?.id
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>
                                {part.reasoning || part.text || ""}
                              </ReasoningContent>
                            </Reasoning>
                          ))}

                          {/* Text content */}
                          {textParts.length > 0 ? (
                            <TextParts
                              parts={textParts as any}
                              messageKey={message.id}
                              isStreaming={
                                isStreaming &&
                                message.id ===
                                  messages[messages.length - 1]?.id
                              }
                            />
                          ) : null}

                          {/* Tool invocations */}
                          {toolParts.map((part: any, i: number) => (
                            <ToolRenderer
                              key={`${message.id}-tool-${i}`}
                              part={part}
                            />
                          ))}

                          {/* Message actions for assistant messages */}
                          {message.role === "assistant" && messageText && (
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

                  {/* Loading indicator */}
                  {isLoading &&
                    messages[messages.length - 1]?.role === "user" && (
                      <div className="mb-4 flex items-center gap-3 py-4">
                        <Loader className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Thinking
                          <LoadingDots />
                        </span>
                      </div>
                    )}

                  {/* Error */}
                  {error && (
                    <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                      <p className="mb-1 text-sm font-medium text-destructive">
                        Error
                      </p>
                      <p className="text-xs text-destructive/70">
                        {error.message}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs text-destructive"
                        onClick={() => regenerate()}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Retry
                      </Button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Scroll to bottom */}
              {showScrollButton && (
                <Button
                  variant="outline"
                  size="icon"
                  className="fixed bottom-24 right-8 z-10 rounded-full shadow-lg"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="size-4" />
                </Button>
              )}
            </div>

            {/* Input */}
            {chatId && (
              <div className="no-drag pb-2 md:pb-3">
                <div className="w-full px-3 md:px-4">
                  <div className="relative mx-auto w-full max-w-2xl">
                    <ChatPromptInput
                      input={input}
                      model={model}
                      status={status}
                      hasGatewayKey={hasGatewayKey}
                      onInputChange={setInput}
                      onSetModel={setModel}
                      onSubmit={(text) => {
                        sendMessage({ text });
                        setInput("");
                      }}
                      onStop={stop}
                      onOpenApiKeyDialog={() => setShowApiKeyDialog(true)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Editor panel — kept mounted to avoid remount flicker */}
          {hasOpenedEditor && (
            <div
              className={cn(
                "absolute inset-0 z-10",
                showEditor
                  ? "block pointer-events-auto opacity-100"
                  : "hidden pointer-events-none opacity-0",
              )}
              aria-hidden={!showEditor}
            >
              <CodeEditor
                editorUrl={
                  project?.cwd
                    ? `http://localhost:8081/?folder=${encodeURIComponent(project.cwd)}`
                    : "http://localhost:8081"
                }
                webUrl="http://localhost:3003"
                onReturnToChat={() => setShowEditor(false)}
                projectId={projectId}
              />
            </div>
          )}
        </div>
      </div>

      {/* API Key Dialog */}
      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        hasKey={hasGatewayKey}
        onKeyChanged={() => {
          api.hasApiKey().then(setHasGatewayKey).catch(() => {});
        }}
      />
    </div>
  );
}
