import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { SidePanel } from "../components/side-panel";
import { CodeEditor } from "../components/code-editor";
import { ChatPromptInput } from "../components/chat-prompt-input";
import { ChatStatusBar } from "../components/chat-status-bar";
import { DiffReviewPanel } from "../components/diff-review-panel";
import { ChatMessages } from "../components/chat-messages";
import { Loader } from "@/components/ai-elements/loader";
import { AmaLogo } from "@/components/ama-logo";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import { Button } from "@/components/ui/button";
import { api } from "../lib/trpc";
import { cn } from "../lib/utils";
import { useChatSession } from "../hooks/use-chat-session";
import { useChatSnapshot } from "../hooks/use-chat-snapshot";
import { useContextInput } from "../hooks/use-context-input";
import {
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
  const [hasGatewayKey, setHasGatewayKey] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [hasOpenedEditor, setHasOpenedEditor] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Custom hooks
  const {
    messages,
    handleSubmit,
    stop,
    regenerate,
    status,
    error,
    isLoadingMessages,
    model,
    setModel,
  } = useChatSession({
    chatId,
    hasGatewayKey,
    onTitleGenerated: () => setSidebarRefreshKey((k) => k + 1),
  });

  const {
    canUndo,
    isUndoing,
    isAccepting,
    handleUndo,
    handleAcceptAll,
    resetSnapshot,
  } = useChatSnapshot({ chatId, status });

  const {
    input,
    cursorPosition,
    selectedContextFiles,
    showContextSelector,
    setShowContextSelector,
    handleInputChange,
    handleFileSelect,
    handleToggleContextFile,
    clearInput,
  } = useContextInput();

  // Load project info
  useEffect(() => {
    if (!projectId) return;
    api
      .getProject(projectId)
      .then((p) => p && setProject(p))
      .catch(console.error);
  }, [projectId]);

  // Load thread title
  useEffect(() => {
    if (!projectId || !chatId) {
      setThreadTitle(null);
      return;
    }

    let cancelled = false;
    api
      .getChats(projectId)
      .then((chatList) => {
        if (cancelled) return;
        const activeChat = Array.isArray(chatList)
          ? chatList.find((chat: any) => chat?.id === chatId)
          : null;
        const title =
          typeof activeChat?.title === "string" ? activeChat.title.trim() : "";
        setThreadTitle(title || null);
      })
      .catch(() => {
        if (!cancelled) setThreadTitle(null);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, chatId, sidebarRefreshKey]);

  // Check gateway key
  useEffect(() => {
    api.hasApiKey().then(setHasGatewayKey).catch(() => {});
  }, []);

  // Reset review panel on chat change
  useEffect(() => {
    setShowReview(false);
    resetSnapshot();
  }, [chatId, resetSnapshot]);

  // Scroll behavior
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

  // Keyboard shortcuts
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

  const handleReview = useCallback(() => {
    setShowReview((prev) => !prev);
  }, []);

  const conversationLabel = useMemo(() => {
    if (threadTitle) return threadTitle;

    const firstUserMessage = messages.find((message) => message.role === "user");
    const firstTextPart = firstUserMessage?.parts?.find(
      (part: any) =>
        part?.type === "text" &&
        typeof part.text === "string" &&
        part.text.trim().length > 0,
    );
    const firstText = (firstTextPart as { text?: string } | undefined)?.text?.trim();

    if (firstText) {
      return firstText.length > 48
        ? `${firstText.slice(0, 48).trimEnd()}...`
        : firstText;
    }

    if (isLoadingMessages) return "Loading conversation...";
    if (!chatId) return "Start a new chat";
    return "Waiting for your first message";
  }, [threadTitle, messages, isLoadingMessages, chatId]);

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
            "drag-region absolute inset-x-0 top-0 z-20 h-16 px-4 pt-3 transition-opacity duration-200",
            showEditor && "pointer-events-none opacity-0",
          )}
        >
          <div className="mx-auto flex h-10 w-full max-w-5xl items-center gap-2 rounded-2xl border border-border/40 bg-background/65 px-2.5 backdrop-blur-sm">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="no-drag inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                title="Open sidebar"
              >
                <PanelLeftIcon className="size-3.5" />
              </button>
            )}

            <div className="flex min-w-0 flex-1 items-center rounded-full px-3 py-1">
              <span className="truncate text-xs font-medium text-foreground/85">
                {conversationLabel}
              </span>
            </div>

            {!showEditor && (
              <Button
                onClick={() => setShowEditor((p) => !p)}
                variant="outline"
                size="sm"
                className={cn(
                  "no-drag h-7 rounded-full border-border/45 bg-background/40 px-4 text-xs font-medium text-foreground/85",
                  "hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <CodeIcon className="size-3.5" />
                <span>Editor</span>
              </Button>
            )}

            <Button
              onClick={handleNewChat}
              variant="outline"
              size="icon"
              disabled={isCreatingChat}
              className="no-drag size-7 rounded-full border-border/45 bg-background/40 text-foreground/85 hover:bg-accent/60 hover:text-foreground"
              title="New chat"
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
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
                <div className="mx-auto max-w-2xl px-4 pt-16 pb-6">
                  <ChatMessages
                    messages={messages}
                    isLoading={isLoading}
                    isStreaming={isStreaming}
                    error={error}
                    onRegenerate={regenerate}
                  />
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
                    onSubmit={(text, files) => {
                      handleSubmit(text, files);
                      clearInput();
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
                onReturnToChat={() => setShowEditor(false)}
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
