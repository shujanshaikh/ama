import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SidePanel } from "../components/side-panel";
import { CodeEditor } from "../components/code-editor";
import { ChatPromptInput } from "../components/chat-prompt-input";
import { ChatStatusBar } from "../components/chat-status-bar";
import { DiffReviewPanel } from "../components/diff-review-panel";
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
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef(model);
  modelRef.current = model;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<{
    projectId: string;
    hash: string;
  } | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedContextFiles, setSelectedContextFiles] = useState<string[]>(
    [],
  );

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
  const hasGeneratedTitleRef = useRef(false);
  const currentChatIdRef = useRef<string | undefined>(chatId ?? undefined);

  useEffect(() => {
    if (chatId !== currentChatIdRef.current) {
      currentChatIdRef.current = chatId ?? undefined;
      hasInitializedRef.current = false;
      hasGeneratedTitleRef.current = false;
      setMessages([]);
      setLatestSnapshot(null);
      setShowReview(false);
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

  // Fetch latest snapshot for undo/accept
  const fetchSnapshot = useCallback(() => {
    if (!chatId) return;
    api
      .getLatestSnapshot(chatId)
      .then((snap) => setLatestSnapshot(snap ?? null))
      .catch(() => setLatestSnapshot(null));
  }, [chatId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Refetch snapshot when AI finishes streaming
  const previousStatusRef = useRef(status);
  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      (prevStatus === "streaming" || prevStatus === "submitted") &&
      status === "ready"
    ) {
      fetchSnapshot();
    }
  }, [status, fetchSnapshot]);

  const canUndo =
    !!latestSnapshot &&
    status !== "streaming" &&
    status !== "submitted" &&
    !isUndoing;

  const handleUndo = useCallback(async () => {
    if (!chatId || !latestSnapshot) return;
    setIsUndoing(true);
    try {
      const result = await api.undo(chatId);
      if (result.success) {
        fetchSnapshot();
      } else {
        console.error("[undo] Failed:", result.error);
      }
    } catch (error) {
      console.error("[undo] Error:", error);
    } finally {
      setIsUndoing(false);
    }
  }, [chatId, latestSnapshot, fetchSnapshot]);

  const handleAcceptAll = useCallback(async () => {
    if (!chatId || !latestSnapshot) return;
    setIsAccepting(true);
    try {
      const result = await api.undo(chatId, true);
      if (result.success) {
        fetchSnapshot();
      }
    } catch (error) {
      console.error("[accept] Error:", error);
    } finally {
      setIsAccepting(false);
    }
  }, [chatId, latestSnapshot, fetchSnapshot]);

  const handleReview = useCallback(() => {
    setShowReview((prev) => !prev);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setInput(value);
      setCursorPosition(cursorPos);

      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        const hasSpace = textAfterAt.includes(" ");
        if (!hasSpace) {
          setShowContextSelector(true);
        } else {
          setShowContextSelector(false);
        }
      } else {
        setShowContextSelector(false);
      }
    },
    [],
  );

  const handleFileSelect = useCallback(
    (file: string) => {
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      const textAfterCursor = input.slice(cursorPosition);

      if (lastAtIndex !== -1) {
        const newInput =
          input.slice(0, lastAtIndex) + "@" + file + " " + textAfterCursor;
        setInput(newInput);
      } else {
        const newInput =
          input.slice(0, cursorPosition) +
          "@" +
          file +
          " " +
          textAfterCursor;
        setInput(newInput);
      }

      if (!selectedContextFiles.includes(file)) {
        setSelectedContextFiles((prev) => [...prev, file]);
      }

      setShowContextSelector(false);

      setTimeout(() => {
        const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
        textarea?.focus();
      }, 0);
    },
    [input, cursorPosition, selectedContextFiles],
  );

  const handleToggleContextFile = useCallback(
    (file: string) => {
      const isRemoving = selectedContextFiles.includes(file);

      setSelectedContextFiles((prev) =>
        prev.includes(file)
          ? prev.filter((f) => f !== file)
          : [...prev, file],
      );

      if (isRemoving) {
        const fileName = file.split("/").pop() || file;
        const regex = new RegExp(
          `@${fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`,
          "g",
        );
        setInput((prev) => prev.replace(regex, ""));
      }
    },
    [selectedContextFiles],
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyMessage = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <SidePanel
        projectName={project?.name || "Project"}
        onNewChat={handleNewChat}
        isCreatingChat={isCreatingChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        refreshKey={sidebarRefreshKey}
      />

      <div className={cn("relative flex flex-col min-w-0", showReview ? "flex-1 min-w-0 w-0" : "flex-1")}>
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

        <div className="relative flex-1 min-h-0">
          <div
            className={cn(
              "flex flex-col size-full",
              showEditor ? "hidden" : "",
            )}
          >
            <div
              ref={scrollContainerRef}
              className="no-drag relative flex-1 overflow-y-auto"
            >
              {!chatId ? (
                <div className="flex h-full flex-col items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <AmaLogo size={48} />
                    <h2 className="text-base font-medium text-foreground/80">
                      What can I help with?
                    </h2>
                  </div>
                  <Button
                    onClick={handleNewChat}
                    disabled={isCreatingChat}
                    size="sm"
                    className="gap-2 rounded-xl px-5"
                    variant="outline"
                  >
                    <PlusIcon className="size-4" />
                    {isCreatingChat ? "Creating..." : "New Chat"}
                  </Button>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Loader className="size-5 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground/50">
                    Loading messages...
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-2xl px-4 pt-10 pb-6">
                  {messages.map((message) => {
                    const isLastMessage =
                      message.id === messages[messages.length - 1]?.id;
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
                        onClick={() => regenerate()}
                      >
                        <RotateCcw className="mr-1.5 size-3" />
                        Retry
                      </Button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {showScrollButton && (
                <button
                  className="fixed bottom-28 right-8 z-10 flex size-8 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-md backdrop-blur-sm transition-all hover:bg-card hover:text-foreground"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="size-3.5" />
                </button>
              )}
            </div>

            {chatId && (
              <div className="no-drag pb-3">
                <div className="mx-auto w-full max-w-2xl px-4">
                  <ChatStatusBar
                    status={status}
                    canUndo={canUndo}
                    isUndoing={isUndoing}
                    isAccepting={isAccepting}
                    isReviewing={showReview}
                    onUndo={handleUndo}
                    onAcceptAll={handleAcceptAll}
                    onReview={handleReview}
                  />
                  <ChatPromptInput
                    input={input}
                    model={model}
                    status={status}
                    hasGatewayKey={hasGatewayKey}
                    selectedContextFiles={selectedContextFiles}
                    showContextSelector={showContextSelector}
                    cursorPosition={cursorPosition}
                    projectCwd={project?.cwd}
                    onInputChange={handleInputChange}
                    onFileSelect={handleFileSelect}
                    onToggleContextFile={handleToggleContextFile}
                    onCloseContextSelector={() =>
                      setShowContextSelector(false)
                    }
                    onSetModel={setModel}
                    onSubmit={(text) => {
                      const isFirstMessage =
                        messages.length === 0 && !isLoadingMessages;

                      sendMessage({ text });
                      setInput("");
                      setSelectedContextFiles([]);

                      if (
                        isFirstMessage &&
                        chatId &&
                        !hasGeneratedTitleRef.current
                      ) {
                        hasGeneratedTitleRef.current = true;
                        api
                          .generateTitle({ chatId, message: text })
                          .then(() =>
                            setSidebarRefreshKey((k) => k + 1),
                          )
                          .catch(console.error);
                      }
                    }}
                    onStop={stop}
                    onToggleContextSelector={() =>
                      setShowContextSelector((prev) => !prev)
                    }
                    onOpenApiKeyDialog={() => setShowApiKeyDialog(true)}
                  />
                </div>
              </div>
            )}
          </div>

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

      {showReview && (
        <div className="w-[480px] min-w-[380px] border-l border-border/40">
          <DiffReviewPanel
            messages={messages}
            onClose={() => setShowReview(false)}
          />
        </div>
      )}

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
