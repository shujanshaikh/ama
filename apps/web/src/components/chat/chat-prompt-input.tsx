import { useEffect, useState } from "react";
import { SquareIcon, XIcon, ClipboardListIcon, KeyIcon, CheckIcon } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ContextSelector } from '@/components/context-selector';
import { getFileIcon } from '@/components/file-icons';
import { models } from '@ama/server/lib/model';

interface ChatPromptInputProps {
  input: string;
  model: string;
  mode: 'agent' | 'plan';
  status: 'streaming' | 'submitted' | 'ready' | 'error';
  selectedContextFiles: string[];
  showContextSelector: boolean;
  cursorPosition: number;
  projectCwd?: string;
  canUndo: boolean;
  hasGatewayKey: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileSelect: (file: string) => void;
  onToggleContextFile: (file: string) => void;
  onCloseContextSelector: () => void;
  onSetMode: (mode: 'agent' | 'plan') => void;
  onSetModel: (model: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  onStop: () => void;
  onToggleContextSelector: () => void;
  onOpenApiKeyDialog: () => void;
}

export function ChatPromptInput({
  input,
  model,
  mode,
  status,
  selectedContextFiles,
  showContextSelector,
  cursorPosition,
  projectCwd,
  canUndo,
  hasGatewayKey,
  onInputChange,
  onFileSelect,
  onToggleContextFile,
  onCloseContextSelector,
  onSetMode,
  onSetModel,
  onSubmit,
  onStop,
  onToggleContextSelector,
  onOpenApiKeyDialog,
}: ChatPromptInputProps) {
  const freeModels = models.filter((m) => m.type === 'free');
  const gatewayModels = models.filter((m) => m.type === 'gateway');
  const [pendingGatewayModel, setPendingGatewayModel] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (hasGatewayKey && pendingGatewayModel) {
      onSetModel(pendingGatewayModel);
      setPendingGatewayModel(null);
    }
  }, [hasGatewayKey, pendingGatewayModel, onSetModel]);

  const handleModelChange = (value: string) => {
    const modelInfo = models.find((m) => m.id === value);
    if (modelInfo?.type === 'gateway' && !hasGatewayKey) {
      setPendingGatewayModel(value);
      onOpenApiKeyDialog();
      return;
    }
    setPendingGatewayModel(null);
    onSetModel(value);
  };
  return (
    <div className="relative">
      {showContextSelector && projectCwd && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <ContextSelector
            text={input}
            cursorPosition={cursorPosition}
            onFileSelect={onFileSelect}
            onClose={onCloseContextSelector}
            cwd={projectCwd}
            selectedFiles={selectedContextFiles}
            onToggleFile={onToggleContextFile}
          />
        </div>
      )}

      <PromptInput
        onSubmit={onSubmit}
        inputGroupClassName={cn(
          "rounded-xl",
          (status === 'streaming' || canUndo) && "rounded-t-none border-t-0"
        )}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
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
                      onToggleContextFile(file);
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
            onChange={onInputChange}
            value={input}
            placeholder="Ask anything... (type @ to add file context)"
            className="min-h-[32px] max-h-[96px] resize-none bg-transparent text-base placeholder:text-muted-foreground/50 border-0 focus:ring-0 focus:outline-none px-4 py-2"
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
            <div className="flex items-center h-8 rounded-xl bg-muted/50 px-0.5 border border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSetMode('agent')}
                className={cn(
                  "h-6 rounded-lg px-2.5 text-xs font-medium transition-all flex items-center gap-1.5",
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
                onClick={() => onSetMode('plan')}
                className={cn(
                  "h-6 rounded-lg px-2.5 text-xs font-medium transition-all flex items-center gap-1.5",
                  mode === 'plan'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                )}
              >
                <ClipboardListIcon className="size-3" />
                <span>Plan</span>
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleContextSelector}
              className={cn(
                "h-8 rounded-xl px-2.5 text-xs font-medium transition-all flex items-center gap-1.5 bg-muted/50 border border-border/50",
                showContextSelector
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>@ Context</span>
            </Button>
            <PromptInputSelect value={model} onValueChange={handleModelChange}>
              <PromptInputSelectTrigger className="rounded-xl text-xs font-medium px-2.5 bg-muted/50 border border-border/50 hover:bg-muted/60 text-muted-foreground">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <SelectGroup>
                  <SelectLabel>Free</SelectLabel>
                  {freeModels.map((m) => (
                    <PromptInputSelectItem key={m.id} value={m.id}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Bring Your Own Key</SelectLabel>
                  {gatewayModels.map((m) => (
                    <PromptInputSelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-1.5">
                        {m.name}
                        {hasGatewayKey ? (
                          <CheckIcon className="size-3 text-green-600" />
                        ) : (
                          <KeyIcon className="size-3 text-amber-500" />
                        )}
                      </span>
                    </PromptInputSelectItem>
                  ))}
                </SelectGroup>
              </PromptInputSelectContent>
            </PromptInputSelect>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenApiKeyDialog()}
              className="h-8 rounded-xl px-2 text-xs font-medium bg-muted/50 border border-border/50 hover:bg-muted/60 text-muted-foreground"
              title="API Keys"
            >
              <KeyIcon className="size-3" />
            </Button>
          </PromptInputTools>
          {(status === 'streaming' || status === 'submitted') ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onStop}
              className="h-7 w-7"
              aria-label="Stop generating"
            >
              <SquareIcon className="size-3" />
            </Button>
          ) : (
            <PromptInputSubmit
              disabled={!input}
              status={status}
              className="h-7 w-7 rounded-2xl transition-colors bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
