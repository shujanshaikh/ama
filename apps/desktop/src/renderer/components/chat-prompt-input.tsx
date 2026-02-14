import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getPathBasename } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { models } from "../lib/models";
import { ContextSelector } from "./context-selector";
import { getFileIcon } from "./file-icons";
import type { FileUIPart } from "ai";
import {
  ArrowUpIcon,
  SquareIcon,
  ZapIcon,
  ClipboardListIcon,
  KeyIcon,
  CheckIcon,
  AtSignIcon,
  XIcon,
  ImageIcon,
} from "lucide-react";

export type AttachmentFile = FileUIPart & { id: string };

interface ChatPromptInputProps {
  input: string;
  model: string;
  status: "streaming" | "submitted" | "ready" | "error";
  hasGatewayKey: boolean;
  selectedContextFiles: string[];
  showContextSelector: boolean;
  cursorPosition: number;
  projectCwd?: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileSelect: (file: string) => void;
  onToggleContextFile: (file: string) => void;
  onCloseContextSelector: () => void;
  onSetModel: (model: string) => void;
  onSubmit: (text: string, files?: FileUIPart[]) => void;
  onStop: () => void;
  onToggleContextSelector: () => void;
  onOpenApiKeyDialog: () => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatPromptInput({
  input,
  model,
  status,
  hasGatewayKey,
  selectedContextFiles,
  showContextSelector,
  cursorPosition,
  projectCwd,
  onInputChange,
  onFileSelect,
  onToggleContextFile,
  onCloseContextSelector,
  onSetModel,
  onSubmit,
  onStop,
  onToggleContextSelector,
  onOpenApiKeyDialog,
}: ChatPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"agent" | "plan">("agent");
  const [pendingGatewayModel, setPendingGatewayModel] = useState<string | null>(
    null,
  );

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const addFiles = useCallback(async (files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const newAttachments = await Promise.all(
      incoming.map(async (file) => ({
        id: crypto.randomUUID(),
        type: "file" as const,
        url: await fileToDataUrl(file),
        mediaType: file.type,
        filename: file.name,
      })),
    );

    setAttachments((prev) => prev.concat(newAttachments));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const freeModels = models.filter((m) => m.type === "free");
  const gatewayModels = models.filter((m) => m.type === "gateway");

  useEffect(() => {
    if (hasGatewayKey && pendingGatewayModel) {
      onSetModel(pendingGatewayModel);
      setPendingGatewayModel(null);
    }
  }, [hasGatewayKey, pendingGatewayModel, onSetModel]);

  const handleModelChange = useCallback(
    (value: string) => {
      const modelInfo = models.find((m) => m.id === value);
      if (modelInfo?.type === "gateway" && !hasGatewayKey) {
        setPendingGatewayModel(value);
        onOpenApiKeyDialog();
        return;
      }
      setPendingGatewayModel(null);
      onSetModel(value);
    },
    [hasGatewayKey, onSetModel, onOpenApiKeyDialog],
  );

  const isActive = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text && attachments.length === 0) return;

      const files = attachments.map(({ id, ...item }) => item);
      onSubmit(text, files.length > 0 ? files : undefined);
      clearAttachments();
    },
    [input, attachments, onSubmit, clearAttachments],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (showContextSelector) return;
        e.preventDefault();
        if ((input.trim() || attachments.length > 0) && !isActive) {
          // Trigger form submit
          formRef.current?.requestSubmit();
        }
      }

      // Remove last attachment when Backspace is pressed and textarea is empty
      if (
        e.key === "Backspace" &&
        e.currentTarget.value === "" &&
        attachments.length > 0
      ) {
        e.preventDefault();
        const last = attachments.at(-1);
        if (last) removeAttachment(last.id);
      }
    },
    [input, isActive, showContextSelector, attachments, removeAttachment],
  );

  // Paste handler for clipboard images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles],
  );

  // Drag & drop on the form
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (imageFiles.length > 0) {
          addFiles(imageFiles);
        }
      }
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  // Upload button click handler
  const handleUploadClick = useCallback(() => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = "image/*";
    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        addFiles(files);
      }
    };
    fileInput.click();
  }, [addFiles]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  return (
    <div className="relative w-full">
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

      <form onSubmit={handleSubmit} ref={formRef} className="w-full">
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm",
            "transition-[border-color,box-shadow] duration-300 ease-out",
            "focus-within:border-border focus-within:shadow-md",
            "overflow-hidden",
          )}
        >
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                  {attachments.map((attachment) => {
                    const isImage = attachment.mediaType?.startsWith("image/");
                    return (
                      <motion.div
                        key={attachment.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "relative group flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-lg",
                          "bg-secondary/60 border border-border/40",
                          "hover:bg-secondary/80 hover:border-border/60",
                          "transition-all duration-200",
                        )}
                      >
                        {isImage && attachment.url ? (
                          <img
                            src={attachment.url}
                            alt={attachment.filename || "attachment"}
                            className="size-6 rounded object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-4 opacity-60" />
                        )}
                        <span className="text-[11px] text-foreground/70 font-mono max-w-[100px] truncate">
                          {attachment.filename || "image"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(attachment.id);
                          }}
                          className="shrink-0 size-4 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-foreground/10 transition-all"
                        >
                          <XIcon className="size-2.5 text-muted-foreground" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                    const fileName = getPathBasename(file) || file;
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
                          "group",
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

          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onInput={autoResize}
            placeholder="Ask anything... (@ to add context)"
            rows={1}
            className="w-full resize-none border-0 bg-transparent px-4 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 scrollbar-none"
            style={{
              minHeight: "36px",
              maxHeight: "96px",
              scrollbarWidth: "none",
            }}
          />

          <div className="flex items-center justify-between px-2.5 pb-2 pt-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 items-center rounded-lg bg-secondary/40 p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("agent")}
                  className={cn(
                    "flex h-[22px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200",
                    mode === "agent"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-transparent hover:text-foreground/80",
                  )}
                >
                  <ZapIcon
                    className={cn(
                      "size-3 transition-opacity",
                      mode === "agent" ? "opacity-100" : "opacity-50",
                    )}
                  />
                  <span>Agent</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("plan")}
                  className={cn(
                    "flex h-[22px] items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold tracking-wide transition-all duration-200",
                    mode === "plan"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-transparent hover:text-foreground/80",
                  )}
                >
                  <ClipboardListIcon
                    className={cn(
                      "size-3 transition-opacity",
                      mode === "plan" ? "opacity-100" : "opacity-50",
                    )}
                  />
                  <span>Plan</span>
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUploadClick}
                className={cn(
                  "h-7 rounded-lg px-2 text-[11px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                  "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/40",
                )}
                title="Upload image"
              >
                <ImageIcon className="size-3" />
                <span>Image</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleContextSelector}
                className={cn(
                  "h-7 rounded-lg px-2 text-[11px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                  showContextSelector
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground/80 hover:bg-secondary/40",
                )}
              >
                <AtSignIcon className="size-3" />
                <span>Context</span>
              </Button>

              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger className="h-7 rounded-lg border-none bg-transparent px-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-none transition-colors duration-200 hover:bg-secondary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Free
                  </div>
                  {freeModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Bring Your Own Key
                  </div>
                  {gatewayModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-1.5">
                        {m.name}
                        {hasGatewayKey ? (
                          <CheckIcon className="size-3 text-emerald-500" />
                        ) : (
                          <KeyIcon className="size-3 text-amber-400" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenApiKeyDialog}
                className="h-7 w-7 rounded-lg p-0 text-muted-foreground transition-all duration-200 hover:bg-secondary/40 hover:text-foreground/80"
                title="API Keys"
              >
                <KeyIcon className="size-3" />
              </Button>
            </div>

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
                  className="h-7 w-7 rounded-xl transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Stop generating"
                >
                  <SquareIcon className="size-3" />
                </Button>
              </motion.div>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                size="icon-sm"
                className={cn(
                  "h-7 w-7 rounded-xl transition-all duration-200",
                  "bg-foreground text-background",
                  "hover:opacity-90 hover:scale-105",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
                  "active:scale-95",
                )}
                aria-label="Submit"
              >
                <ArrowUpIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
