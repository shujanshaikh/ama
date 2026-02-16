import { useEffect, useState } from "react";
import { SquareIcon, XIcon, ClipboardListIcon, KeyIcon, CheckIcon, ZapIcon, AtSignIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  canUndo: _canUndo,
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
  const codexModels = models.filter((m) => m.type === 'codex');
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

  const isActive = status === 'streaming' || status === 'submitted';

  return (
    <div className="relative">
      <AnimatePresence>
        {showContextSelector && projectCwd && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <ContextSelector
              text={input}
              cursorPosition={cursorPosition}
              onFileSelect={onFileSelect}
              onClose={onCloseContextSelector}
              cwd={projectCwd}
              selectedFiles={selectedContextFiles}
              onToggleFile={onToggleContextFile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PromptInput
        onSubmit={onSubmit}
        inputGroupClassName={cn(
          "rounded-2xl border-border/60 bg-card/80 backdrop-blur-sm shadow-sm",
          "transition-[border-color,box-shadow] duration-300 ease-out",
          "focus-within:border-border focus-within:shadow-md"
        )}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>

          <AnimatePresence>
            {selectedContextFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                  {selectedContextFiles.map((file) => {
                    const fileName = file.split('/').pop() || file;
                    return (
                      <motion.div
                        key={file}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleContextFile(file);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg",
                          "bg-secondary/60 border border-border/40",
                          "hover:bg-secondary/80 hover:border-border/60",
                          "cursor-pointer transition-all duration-200",
                          "group"
                        )}
                      >
                        <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          {getFileIcon(file)}
                        </div>
                        <span className="text-[11px] text-foreground/70 group-hover:text-foreground/90 font-mono max-w-[120px] truncate transition-colors">
                          {fileName}
                        </span>
                        <div className="shrink-0 size-4 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-foreground/10 transition-all">
                          <XIcon className="size-2.5 text-muted-foreground" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputTextarea
            onChange={onInputChange}
            value={input}
            placeholder="Ask anything... (@ to add context)"
            className="min-h-[36px] max-h-[96px] resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground/40 border-0 focus:ring-0 focus:outline-none px-4 py-2.5"
          />
        </PromptInputBody>

        <PromptInputFooter className="px-2.5 pb-2 pt-0">
          <PromptInputTools className="gap-1.5">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger className="rounded-lg hover:bg-secondary/60 transition-colors duration-200" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            <div className="flex items-center h-7 rounded-lg bg-secondary/40 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSetMode('agent')}
                className={cn(
                  "h-[22px] rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                  mode === 'agent'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-transparent"
                )}
              >
                <ZapIcon className={cn("size-3 transition-opacity", mode === 'agent' ? "opacity-100" : "opacity-50")} />
                <span>Agent</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSetMode('plan')}
                className={cn(
                  "h-[22px] rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                  mode === 'plan'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-transparent"
                )}
              >
                <ClipboardListIcon className={cn("size-3 transition-opacity", mode === 'plan' ? "opacity-100" : "opacity-50")} />
                <span>Plan</span>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleContextSelector}
              className={cn(
                "h-7 rounded-lg px-2 text-[11px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                showContextSelector
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/40"
              )}
            >
              <AtSignIcon className="size-3" />
              <span>Context</span>
            </Button>

            <PromptInputSelect value={model} onValueChange={handleModelChange}>
              <PromptInputSelectTrigger className="h-7 rounded-lg text-[11px] font-semibold tracking-wide px-2.5 hover:bg-secondary/40 text-muted-foreground transition-colors duration-200">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Free</SelectLabel>
                  {freeModels.map((m) => (
                    <PromptInputSelectItem key={m.id} value={m.id}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Bring Your Own Key</SelectLabel>
                  {gatewayModels.map((m) => (
                    <PromptInputSelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-1.5">
                        {m.name}
                        {hasGatewayKey ? (
                          <CheckIcon className="size-3 text-emerald-500" />
                        ) : (
                          <KeyIcon className="size-3 text-amber-400" />
                        )}
                      </span>
                    </PromptInputSelectItem>
                  ))}
                </SelectGroup>
                {codexModels.length > 0 ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                        Codex
                      </SelectLabel>
                      {codexModels.map((m) => (
                        <PromptInputSelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-1.5">
                            <span>{m.name}</span>
                            <span className="text-[10px] font-medium lowercase text-muted-foreground">
                              codex
                            </span>
                          </span>
                        </PromptInputSelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
              </PromptInputSelectContent>
            </PromptInputSelect>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenApiKeyDialog()}
              className={cn(
                "h-7 w-7 rounded-lg p-0 transition-all duration-200",
                "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/40",
              )}
              title="API Keys"
            >
              <KeyIcon className="size-3" />
            </Button>
          </PromptInputTools>

          {isActive ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onStop}
                className="h-7 w-7 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                aria-label="Stop generating"
              >
                <SquareIcon className="size-3" />
              </Button>
            </motion.div>
          ) : (
            <PromptInputSubmit
              disabled={!input}
              status={status}
              className={cn(
                "h-7 w-7 rounded-xl transition-all duration-200",
                "bg-foreground text-background",
                "hover:opacity-90 hover:scale-105",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
                "active:scale-95"
              )}
            />
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
