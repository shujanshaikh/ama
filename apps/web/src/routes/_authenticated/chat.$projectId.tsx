import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { createFileRoute } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Sidepanel } from '@/components/side-panel';
import { PreviewIframe } from '@/components/web-view';
import { CodeEditor } from '@/components/code-editor';
import { DiffReviewPanel } from '@/components/diff-review-panel';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { API_URL } from '@/utils/constant';
import { useTRPC } from '@/utils/trpc';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEditorUrl } from '@/utils/get-editor-url';
import type { ChatMessage } from '@ama/server/lib/tool-types';
import { models } from '@ama/server/lib/model';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { useUserStreamContextOptional } from '@/components/user-stream-provider';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { ChatToolbar } from '@/components/chat/chat-toolbar';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatErrorAlert } from '@/components/chat/chat-error-alert';
import { ChatStatusBar } from '@/components/chat/chat-status-bar';
import { ChatPromptInput } from '@/components/chat/chat-prompt-input';
import { CollapsedSidebarTrigger } from '@/components/chat/collapsed-sidebar-trigger';

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
  const [isUndoing, setIsUndoing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasGeneratedTitleRef = useRef(false);

  const { data: latestSnapshot, refetch: refetchSnapshot } = useQuery({
    ...trpc.chat.getLatestSnapshot.queryOptions({ chatId: _chatId || '' }),
    enabled: !!_chatId,
  });

  const userStream = useUserStreamContextOptional();

  const handleUndo = useCallback(async () => {
    if (!_chatId || !latestSnapshot) return;
    setIsUndoing(true);

    try {
      if (userStream?.isReady && userStream.rpc) {
        const result = await userStream.rpc.snapshotRestore(latestSnapshot.projectId, latestSnapshot.hash);

        if (result.success) {
          await fetch(`${API_URL}/undo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: _chatId, deleteOnly: true }),
          });
          await refetchSnapshot();
          console.log('[undo] Files restored successfully via WebSocket');
        } else {
          console.error('[undo] WebSocket restore failed');
        }
      } else {
        const response = await fetch(`${API_URL}/undo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: _chatId }),
        });

        const result = await response.json();

        if (result.success) {
          await refetchSnapshot();
          console.log('[undo] Files restored successfully via HTTP');
        } else {
          console.error('[undo] Failed:', result.error);
        }
      }
    } catch (error) {
      console.error('[undo] Error:', error);
    } finally {
      setIsUndoing(false);
    }
  }, [_chatId, latestSnapshot, refetchSnapshot, userStream]);

  const handleAcceptAll = useCallback(async () => {
    if (!_chatId || !latestSnapshot) return;
    setIsAccepting(true);

    try {
      await fetch(`${API_URL}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: _chatId, deleteOnly: true }),
      });
      await refetchSnapshot();
      console.log('[accept] Changes accepted, snapshot removed');
    } catch (error) {
      console.error('[accept] Error:', error);
    } finally {
      setIsAccepting(false);
    }
  }, [_chatId, latestSnapshot, refetchSnapshot]);

  const editorUrl = getEditorUrl(_projectId!);

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

  const previousStatusRef = useRef(status);

  useEffect(() => {
    const prevStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if ((prevStatus === 'streaming' || prevStatus === 'submitted') && status === 'ready') {
      // AI just finished - refetch snapshot to show accept/undo buttons
      refetchSnapshot();
    }
  }, [status, refetchSnapshot]);

  const canUndo = !!latestSnapshot && status !== 'streaming' && status !== 'submitted' && !isUndoing;

  const handleReview = useCallback(() => {
    setShowReview(prev => !prev);
    // Also open the right panel if it's collapsed
    if (previewCollapsed) {
      setPreviewCollapsed(false);
    }
  }, [previewCollapsed]);

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

  const handleFileSelect = useCallback((file: string) => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = input.slice(cursorPosition);

    if (lastAtIndex !== -1) {
      // Typing @ case - replace the @ and text after it with the file
      const newInput = input.slice(0, lastAtIndex) + '@' + file + ' ' + textAfterCursor;
      setInput(newInput);
    } else {
      // Button click case - just add @file at cursor position
      const newInput = input.slice(0, cursorPosition) + '@' + file + ' ' + textAfterCursor;
      setInput(newInput);
    }

    if (!selectedContextFiles.includes(file)) {
      setSelectedContextFiles(prev => [...prev, file]);
    }

    setShowContextSelector(false);

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

    if (isRemoving) {
      const fileName = file.split('/').pop() || file;
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
              <ChatToolbar
                onShowCodeEditor={() => setShowCodeEditor(true)}
                previewCollapsed={previewCollapsed}
                onTogglePreview={() => setPreviewCollapsed(false)}
              />
              <ChatMessageList
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                chatId={_chatId}
                status={status}
                onRegenerate={regenerate}
                onPlanNameDetected={(planName) => setPlanName(planName)}
              />

              <div className="bottom-4 pb-2 md:pb-3">
                <div className="w-full px-3 md:px-4">
                  <div className="flex-1 relative w-full max-w-[95%] sm:max-w-[88%] md:max-w-2xl mx-auto">
                    <ChatErrorAlert
                      error={error && !dismissedError ? error : null}
                      onDismiss={() => setDismissedError(true)}
                      onRetry={regenerate}
                    />
                    <div className="relative">
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
                        mode={mode}
                        status={status}
                        selectedContextFiles={selectedContextFiles}
                        showContextSelector={showContextSelector}
                        cursorPosition={cursorPosition}
                        projectCwd={projectData?.cwd}
                        canUndo={canUndo}
                        onInputChange={handleInputChange}
                        onFileSelect={handleFileSelect}
                        onToggleContextFile={handleToggleContextFile}
                        onCloseContextSelector={() => setShowContextSelector(false)}
                        onSetMode={setMode}
                        onSetModel={setModel}
                        onSubmit={handleSubmit}
                        onStop={stop}
                        onToggleContextSelector={() => setShowContextSelector(prev => !prev)}
                      />
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
                {showReview ? (
                  <DiffReviewPanel
                    messages={messages}
                    onClose={() => setShowReview(false)}
                  />
                ) : (
                  <PreviewIframe onCollapsedChange={setPreviewCollapsed} projectId={_projectId} />
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  );
}
