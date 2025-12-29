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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSelect,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSelectContent,
} from '@/components/ai-elements/prompt-input';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { SquareIcon, XIcon, CodeIcon, GlobeIcon, ClipboardListIcon } from 'lucide-react';
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
import { DefaultChatTransport } from 'ai';
import { createFileRoute } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Sidepanel } from '@/components/side-panel';
import { PanelLeftIcon } from 'lucide-react';
import { PreviewIframe } from '@/components/web-view';
import { CodeEditor } from '@/components/code-editor';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { API_URL } from '@/utils/constant';
import { ToolRenderer } from '@/components/tool-render';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/utils/trpc';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEditorUrl } from '@/utils/get-editor-url';
import type { ChatMessage } from '@ama/server/lib/tool-types';
import { models } from '@ama/server/lib/model';
import { ContextSelector } from '@/components/context-selector';
import { getFileIcon } from '@/components/file-icons';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { DataStreamProvider } from '@/components/data-stream-provider';

export const Route = createFileRoute('/_authenticated/chat/$projectId')({
  component: ChatWrapper,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      chat: (search.chat as string) || undefined,
    };
  },
});

function ChatWrapper() {
  return (
    <DataStreamProvider>
      <Chat />
    </DataStreamProvider>
  );
}

function Chat() {
  const { projectId: _projectId } = Route.useParams();
  const { chat: _chatId } = Route.useSearch();
  const [input, setInput] = useState('');
  const [model, setModel] = useState(models[0].id);
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [mode, setMode] = useState<'agent' | 'plan'>('agent');
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedContextFiles, setSelectedContextFiles] = useState<string[]>([]);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasGeneratedTitleRef = useRef(false);

  const editorUrl = getEditorUrl(_projectId!);

  // Get project data to access cwd
  const { data: projectData } = useQuery({
    ...trpc.project.getProject.queryOptions({ projectId: _projectId! }),
    enabled: !!_projectId,
  });



  const currentChatIdRef = useRef<string | undefined>(_chatId);
  const hasInitializedRef = useRef(false);

  const { data: initialMessages, isLoading: isLoadingMessages, dataUpdatedAt } = useQuery({
    ...trpc.chat.getMessages.queryOptions({ chatId: _chatId || "" }),
    enabled: !!_chatId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${API_URL}/agent-proxy`,
    prepareSendMessagesRequest({ messages, body }) {
      const lastMessage = messages.at(-1);
      const textPart = lastMessage?.parts?.find((part) => part.type === 'text');
      const messageText = (textPart && 'text' in textPart) ? textPart.text : '';

      // Detect execute plan mode
      const isExecutePlan = messageText.toLowerCase().trim() === 'execute' || messageText.toLowerCase().trim() === 'execute plan';

      return {
        body: {
          chatId: _chatId,
          message: lastMessage,
          planMode: mode === 'plan',
          executePlan: isExecutePlan,
          planName: planName,
          ...body,
        },
      };
    },
  }), [_chatId, planName, mode]);

  const { messages, sendMessage, status, regenerate, setMessages, stop, error, resumeStream } = useChat<ChatMessage>({
    transport,
    id: _chatId || 'new-chat',
  });

  const { mutate: generateTitle } = useMutation({
    ...trpc.generateTitle.generateTitle.mutationOptions(),
    onSuccess: () => {
      if (_projectId) {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getChats.queryKey({ projectId: _projectId }),
        });
      }
    },
  });

  useEffect(() => {
    if (_chatId !== currentChatIdRef.current) {
      currentChatIdRef.current = _chatId;
      hasInitializedRef.current = false;
      hasGeneratedTitleRef.current = false;
      setMessages([]);
      setDismissedError(false);
      setPlanName(null);
      setMode('agent');
    }
  }, [_chatId, setMessages]);

  useEffect(() => {
    if (error) {
      setDismissedError(false);
    }
  }, [error]);


  useEffect(() => {
    if (!_chatId || isLoadingMessages) return;

    if (hasInitializedRef.current && currentChatIdRef.current === _chatId) return;

    if (status === 'streaming' || status === 'submitted') return;

    if (initialMessages && initialMessages.length > 0) {
      if (messages.length === 0 || !hasInitializedRef.current) {
        setMessages(initialMessages as ChatMessage[]);
        hasInitializedRef.current = true;
      }
    } else {
      hasInitializedRef.current = true;
    }
  }, [_chatId, initialMessages, isLoadingMessages, status, messages.length, setMessages, dataUpdatedAt]);

  const handleSubmit = useCallback((message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    const messageText = message.text.trim();

    // Detect execute plan mode
    const isExecutePlan = messageText.toLowerCase().trim() === 'execute' || messageText.toLowerCase().trim() === 'execute plan';

    const isFirstMessage = messages.length === 0 &&
      !isLoadingMessages &&
      (!initialMessages || initialMessages.length === 0);

    sendMessage({
      text: message.text || '',
      files: message.files || []
    }, {
      body: {
        model: model,
        planMode: mode === 'plan',
        executePlan: isExecutePlan,
        planName: planName,
      },
    });
    setInput('');
    setSelectedContextFiles([]);

    if (isFirstMessage && _chatId && !hasGeneratedTitleRef.current && hasText) {
      hasGeneratedTitleRef.current = true;
      generateTitle({
        message: messageText,
        chatId: _chatId,
      });
    }
  }, [sendMessage, messages.length, initialMessages, isLoadingMessages, _chatId, generateTitle, planName, mode]);

  // Handle input change and detect @ mentions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);

    // Check if we should show context selector
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space after the @ (means file was selected)
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');

      if (!hasSpace) {
        setShowContextSelector(true);
      } else {
        setShowContextSelector(false);
      }
    } else {
      setShowContextSelector(false);
    }
  }, []);

  useAutoResume({
    autoResume: true,
    initialMessages: initialMessages as ChatMessage[],
    resumeStream,
    setMessages,
  });

  // Handle file selection from context selector
  const handleFileSelect = useCallback((file: string) => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = input.slice(cursorPosition);

    if (lastAtIndex !== -1) {
      const newInput = input.slice(0, lastAtIndex) + '@' + file + ' ' + textAfterCursor;
      setInput(newInput);

      // Add to selected files if not already there
      if (!selectedContextFiles.includes(file)) {
        setSelectedContextFiles(prev => [...prev, file]);
      }
    }

    setShowContextSelector(false);

    // Focus back on textarea using DOM query
    setTimeout(() => {
      const textarea = document.querySelector('[data-slot="input-group-control"]') as HTMLTextAreaElement;
      textarea?.focus();
    }, 0);
  }, [input, cursorPosition, selectedContextFiles]);

  // Toggle file in context
  const handleToggleContextFile = useCallback((file: string) => {
    const isRemoving = selectedContextFiles.includes(file);

    setSelectedContextFiles(prev =>
      prev.includes(file)
        ? prev.filter(f => f !== file)
        : [...prev, file]
    );

    // If removing, also remove the @filename reference from input text
    if (isRemoving) {
      const fileName = file.split('/').pop() || file;
      // Remove all occurrences of @filename (with optional space after)
      const regex = new RegExp(`@${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
      setInput(prev => prev.replace(regex, ''));
    }
  }, [selectedContextFiles]);



  if (showCodeEditor) {
    return (
      <SidebarProvider defaultOpen={true} className="h-svh">
        <Sidepanel />
        <SidebarInset className="relative w-full flex flex-col min-h-0">
          <CollapsedSidebarTrigger />
          <CodeEditor
            editorUrl={editorUrl}
            webUrl="http://localhost:3003"
            onReturnToChat={() => setShowCodeEditor(false)}
            onCollapsedChange={() => setShowCodeEditor(false)}
            projectId={_projectId}
          />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={true} className="h-svh">
      <Sidepanel />
      <SidebarInset className="relative w-full flex flex-col min-h-0">
        <CollapsedSidebarTrigger />
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={previewCollapsed ? 100 : 40} minSize={30} className="flex flex-col min-h-0">
            <div className="flex flex-col h-full min-h-0 w-full overflow-hidden relative">
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-muted/50 p-0.5 shadow-sm border border-border/50 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCodeEditor(true)}
                    className={cn(
                      "h-7 rounded-md px-3 text-xs font-medium transition-all",
                      "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <CodeIcon className="mr-1.5 size-3.5" />
                    Editor
                  </Button>
                  {previewCollapsed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewCollapsed(false)}
                      className={cn(
                        "h-7 rounded-md px-3 text-xs font-medium transition-all",
                        "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <GlobeIcon className="mr-1.5 size-3.5" />
                      Preview
                    </Button>
                  )}
                </div>
              </div>
              <Conversation className="flex-1 min-h-0">
                <ConversationContent className="pb-6 pt-16">
                  <div className="w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto space-y-3">
                    {isLoadingMessages && _chatId && messages.length === 0 && (
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
                              // Check if this message contains plan creation (look for plan file path in text)
                              const planFileMatch = part.text.match(/\.ama\/plan\.([^.]+)\.md/i);
                              const detectedPlanName = planFileMatch ? planFileMatch[1] : null;
                              const isPlanCreationMessage = !!detectedPlanName && message.role === 'assistant';

                              // Update plan name if detected
                              if (isPlanCreationMessage && detectedPlanName && planName !== detectedPlanName) {
                                setPlanName(detectedPlanName);
                              }

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
                                        onClick={() => regenerate()}
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

              <div className="bottom-4 pb-2 md:pb-3">
                <div className="w-full px-3 md:px-4">
                  <div className="flex-1 relative w-full max-w-[95%] sm:max-w-[88%] md:max-w-3xl mx-auto">
                    {error && !dismissedError && (
                      <div className="flex justify-center mb-2">
                        <div className="w-[90%]">
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="flex items-center justify-between gap-3">
                              <span className="flex-1 text-xs">
                                {error instanceof Error ? error.message : String(error)}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => regenerate()}
                                  className="h-6 px-2 text-xs"
                                >
                                  Retry
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDismissedError(true)}
                                  className="h-6 w-6"
                                  aria-label="Dismiss error"
                                >
                                  <XIcon className="size-3" />
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    )}
                    {status === 'streaming' && (
                      <div className="flex justify-center mb-1">
                        <div className="text-xs text-muted-foreground">
                          Generating...
                        </div>
                      </div>
                    )}

                    {/* Context Selector Popup */}
                    <div className="relative">
                      {showContextSelector && projectData?.cwd && (
                        <div className="absolute bottom-full left-0 mb-2 z-50">
                          <ContextSelector
                            text={input}
                            cursorPosition={cursorPosition}
                            onFileSelect={handleFileSelect}
                            onClose={() => setShowContextSelector(false)}
                            cwd={projectData.cwd}
                            selectedFiles={selectedContextFiles}
                            onToggleFile={handleToggleContextFile}
                          />
                        </div>
                      )}

                      <PromptInput onSubmit={handleSubmit} inputGroupClassName="rounded-xl">
                        <PromptInputHeader>
                          <PromptInputAttachments >
                            {(attachment) => <PromptInputAttachment data={attachment} />}
                          </PromptInputAttachments>
                          {selectedContextFiles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
                              {selectedContextFiles.map((file) => {
                                const fileName = file.split('/').pop() || file;
                                return (
                                  <div
                                    key={file}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleContextFile(file);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1 rounded-md",
                                      "bg-primary/10 border border-primary/20",
                                      "hover:bg-primary/15 cursor-pointer transition-colors",
                                      "group"
                                    )}
                                  >
                                    <div className="shrink-0">
                                      {getFileIcon(file)}
                                    </div>
                                    <span className="text-xs text-foreground/80 font-mono max-w-[120px] truncate">
                                      {fileName}
                                    </span>
                                    <XIcon
                                      className="size-3 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors shrink-0"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </PromptInputHeader>
                        <PromptInputBody>
                          <PromptInputTextarea
                            onChange={handleInputChange}
                            value={input}
                            placeholder="Ask anything... (type @ to add file context)"
                            className="min-h-[36px] max-h-[120px] resize-none bg-transparent text-base placeholder:text-muted-foreground/50 border-0 focus:ring-0 focus:outline-none px-4 py-2"
                          />
                        </PromptInputBody>
                        <PromptInputFooter className="px-3 pb-1.5 pt-0">
                          <PromptInputTools>
                            <PromptInputActionMenu>
                              <PromptInputActionMenuTrigger className="rounded-xl hover:bg-muted/60" />
                              <PromptInputActionMenuContent>
                                <PromptInputActionAddAttachments />
                              </PromptInputActionMenuContent>
                            </PromptInputActionMenu>
                            <div className="flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/50">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode('agent')}
                                className={cn(
                                  "h-7 rounded-md px-2.5 text-xs font-medium transition-all flex items-center gap-1.5",
                                  mode === 'agent'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                                )}
                              >
                                <span>Agent</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode('plan')}
                                className={cn(
                                  "h-7 rounded-md px-2.5 text-xs font-medium transition-all flex items-center gap-1.5",
                                  mode === 'plan'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                                )}
                              >
                                <ClipboardListIcon className="size-3" />
                                <span>Plan</span>
                              </Button>

                            </div>
                            <PromptInputSelect defaultValue={model} onValueChange={(value) => setModel(value)}>
                              <PromptInputSelectTrigger className="rounded-xl text-xs h-7 px-2.5 border-0 bg-muted/40 hover:bg-muted/60">
                                <PromptInputSelectValue />
                              </PromptInputSelectTrigger>
                              <PromptInputSelectContent>
                                {models.map((m) => (
                                  <PromptInputSelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </PromptInputSelectItem>
                                ))}
                              </PromptInputSelectContent>
                            </PromptInputSelect>
                          </PromptInputTools>
                          {(status === 'streaming' || status === 'submitted') ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => stop()}
                              className="h-7 w-7"
                              aria-label="Stop generating"
                            >
                              <SquareIcon className="size-3" />
                            </Button>
                          ) : (
                            <PromptInputSubmit
                              disabled={!input}
                              status={status}
                              className="h-7 w-7 rounded-md transition-colors bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          )}
                        </PromptInputFooter>
                      </PromptInput>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          {!previewCollapsed && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={60} minSize={40} className="flex flex-col min-h-0">
                <PreviewIframe onCollapsedChange={setPreviewCollapsed} projectId={_projectId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CollapsedSidebarTrigger() {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-10">
      <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        className="rounded-md hover:bg-muted transition-colors shrink-0"
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    </div>
  );
}
