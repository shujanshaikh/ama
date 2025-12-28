import type { ChatMessage } from '@ama/server/lib/tool-types';
import { motion } from 'motion/react';
import { useEditHistoryStore } from '@/lib/useEditHistoryStore';
import { useMutation } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle2, XCircle, Terminal, AlertTriangle } from 'lucide-react';
import { PierreDiff } from './pierre-diff';
import type { FileContents } from '@pierre/diffs/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { getFileIcon } from './file-icons';
import { StreamingCodeBlock } from './code-block';

// Minimal streaming indicator
export const StreamingDots = () => (
  <span className="inline-flex items-center gap-0.5 ml-1.5">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-0.5 h-0.5 rounded-full bg-current opacity-40"
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          delay: i * 0.25,
          ease: "easeInOut"
        }}
      />
    ))}
  </span>
);

// Conflict resolution dialog
interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onForceRevert: () => void;
  onKeepCurrent: () => void;
  conflictMessage?: string;
  fileName?: string;
  isLoading?: boolean;
}

const ConflictDialog = ({
  isOpen,
  onClose,
  onForceRevert,
  onKeepCurrent,
  conflictMessage,
  fileName,
  isLoading
}: ConflictDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-orange-400">
          <AlertTriangle className="w-5 h-5" />
          Conflict Detected
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {fileName && <span className="font-medium text-foreground">{fileName}</span>}
          {fileName && <br />}
          {conflictMessage || "The file has been modified since this edit was applied. Choose how to proceed."}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-3">
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
          <strong className="text-orange-300">Warning:</strong> Force reverting will overwrite any changes made after this edit.
        </div>
      </div>
      <DialogFooter className="flex gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={onKeepCurrent}
          disabled={isLoading}
          className="flex-1 sm:flex-none"
        >
          Keep Current
        </Button>
        <Button
          variant="destructive"
          onClick={onForceRevert}
          disabled={isLoading}
          className="flex-1 sm:flex-none"
        >
          {isLoading ? "Reverting..." : "Force Revert"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface EditableToolItemProps {
  toolCallId: string;
  filePath: string;
  oldFile: FileContents;
  newFile: FileContents;
  fileName: string;
  projectCwd?: string;
  checkpointId?: string;
  afterHash?: string;
}

const EditableToolItem = ({
  toolCallId,
  filePath,
  oldFile,
  newFile,
  fileName,
  projectCwd,
  checkpointId,
  afterHash,
}: EditableToolItemProps) => {
  const { addEdit, acceptEdit, revertEdit, setConflict, clearConflict } = useEditHistoryStore();
  const edit = useEditHistoryStore(state => state.edits.find(e => e.id === toolCallId));
  const hasAddedEditRef = useRef(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | undefined>();

  // Use useEffect to add edit only once when component mounts
  useEffect(() => {
    if (!hasAddedEditRef.current && !edit && oldFile.contents !== undefined && newFile.contents !== undefined) {
      addEdit({
        id: toolCallId,
        filePath,
        oldContent: oldFile.contents,
        newContent: newFile.contents,
        checkpointId,
        afterHash,
      });
      hasAddedEditRef.current = true;
    }
  }, [toolCallId, filePath, oldFile.contents, newFile.contents, edit, addEdit, checkpointId, afterHash]);

  // Accept handler - simple state update with loading state
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = useCallback(() => {
    if (isOperationInProgress || edit?.status === 'accepted' || edit?.status === 'reverted') {
      return;
    }

    setIsAccepting(true);
    setIsOperationInProgress(true);

    try {
      acceptEdit(toolCallId);
      toast.success('Changes accepted successfully');
    } catch (error) {
      toast.error('Failed to accept changes', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      // Reset loading state after a short delay to show feedback
      setTimeout(() => {
        setIsAccepting(false);
        setIsOperationInProgress(false);
      }, 300);
    }
  }, [isOperationInProgress, edit?.status, acceptEdit, toolCallId]);

  // Reject mutation with conflict detection
  const { mutate: handleReject, isPending: isRejecting } = useMutation({
    mutationFn: async ({ force = false }: { force?: boolean } = {}) => {
      if (isOperationInProgress || edit?.status === 'accepted' || edit?.status === 'reverted') {
        return;
      }

      setIsOperationInProgress(true);

      const endpoint = force ? 'http://localhost:3456/revert/force' : 'http://localhost:3456/revert';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          oldString: oldFile.contents,
          newString: newFile.contents,
          projectCwd,
          checkpointId: checkpointId || toolCallId,
          expectedAfterHash: afterHash,
          force,
        }),
      });

      const data = await response.json();

      // Handle conflict response
      if (response.status === 409 && data.conflict) {
        throw {
          isConflict: true,
          message: data.error || 'File was modified after this edit',
          currentHash: data.currentHash,
          expectedHash: data.expectedHash,
        };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revert');
      }

      return data;
    },
    onSuccess: () => {
      setIsOperationInProgress(false);
      setShowConflictDialog(false);
      revertEdit(toolCallId);
      toast.success('Changes reverted successfully');
    },
    onError: (error: any) => {
      setIsOperationInProgress(false);

      // Handle conflict specially
      if (error?.isConflict) {
        setConflictMessage(error.message);
        setConflict(toolCallId, {
          message: error.message,
          currentHash: error.currentHash,
          expectedHash: error.expectedHash,
        });
        setShowConflictDialog(true);
        return;
      }

      console.error('Failed to revert:', error);
      toast.error('Failed to revert changes', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  // Force revert handler
  const handleForceRevert = useCallback(() => {
    handleReject({ force: true });
  }, [handleReject]);

  // Keep current (dismiss conflict)
  const handleKeepCurrent = useCallback(() => {
    setShowConflictDialog(false);
    clearConflict(toolCallId);
    // Optionally accept the current state
    acceptEdit(toolCallId);
    toast.info('Kept current file state');
  }, [clearConflict, acceptEdit, toolCallId]);

  const isProcessing = isAccepting || isRejecting || isOperationInProgress;
  const isConflict = edit?.status === 'conflict';

  return (
    <>
      <ToolItem>
        <PierreDiff
          oldFile={oldFile}
          newFile={newFile}
          fileName={fileName}
          showActions={true}
          editStatus={edit?.status}
          onAccept={handleAccept}
          onReject={() => handleReject({})}
          isProcessing={isProcessing}
          conflictMessage={isConflict ? edit?.conflictMessage : undefined}
          onForceRevert={isConflict ? handleForceRevert : undefined}
        />
      </ToolItem>

      <ConflictDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        onForceRevert={handleForceRevert}
        onKeepCurrent={handleKeepCurrent}
        conflictMessage={conflictMessage}
        fileName={fileName}
        isLoading={isRejecting}
      />
    </>
  );
};

// Minimal base wrapper
const ToolItem = ({ children, isStreaming = false }: { children: React.ReactNode; isStreaming?: boolean }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.15 }}
    className={`py-1 ${isStreaming ? 'text-muted-foreground/60' : 'text-foreground/70'}`}
  >
    {children}
  </motion.div>
);

// Extract filename from path
const getFileName = (path?: string) => {
  if (!path) return 'file';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
};

export const ToolRenderer = ({ part, projectCwd }: { part: ChatMessage['parts'][number]; projectCwd?: string }) => {
  // Edit File
  if (part.type === "tool-editFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.target_file);
    const input = part.input

    if (state === "input-streaming") {
      const streamingCode = input?.content || '';

      return (
        <ToolItem key={toolCallId} isStreaming>
          {streamingCode && (
            <StreamingCodeBlock
              code={streamingCode}
              filePath={input?.target_file}
              fileName={fileName}
            />
          )}
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as {
        success?: boolean;
        linesAdded?: number;
        linesRemoved?: number;
        isNewFile?: boolean;
        old_string?: string;
        new_string?: string;
        checkpointId?: string;
        afterHash?: string;
      } | undefined;
      const oldString: FileContents = { contents: output?.old_string || '', name: fileName };
      const newString: FileContents = { contents: output?.new_string || '', name: fileName };
      const actualFilePath = part.input?.target_file || fileName;

      return (
        <ToolItem key={toolCallId}>
          <EditableToolItem
            toolCallId={toolCallId}
            filePath={actualFilePath}
            oldFile={oldString}
            newFile={newString}
            fileName={fileName}
            projectCwd={projectCwd}
            checkpointId={output?.checkpointId}
            afterHash={output?.afterHash}
          />
        </ToolItem>
      );
    }
  }

  // Delete File
  if (part.type === "tool-deleteFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Deleting <span className="text-foreground/50">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Deleted <span className="text-foreground/50">{fileName}</span>
          </span>
        </ToolItem>
      );
    }
  }

  // Read File
  if (part.type === "tool-readFile") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.relative_file_path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm flex items-center gap-2">
            Reading <span className="text-foreground/50">{fileName}</span> {getFileIcon(fileName)} <span className="text-muted-foreground/50 ml-1.5">{fileName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { totalLines?: number } | undefined;
      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm flex items-center gap-2">
            Read <span className="text-foreground/50">{fileName}</span> {getFileIcon(fileName)}
            {output?.totalLines && (
              <span className="text-muted-foreground/50 ml-1.5">({output.totalLines} lines)</span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  if (part.type === "tool-listDirectory") {
    const { toolCallId, state } = part;
    const dirName = getFileName(part.input?.path);

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Listing <span className="text-foreground/50">{dirName}</span>
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { files?: Array<{ name: string; type: string }> } | undefined;
      const fileCount = output?.files?.filter(f => f.type === 'file').length || 0;
      const dirCount = output?.files?.filter(f => f.type === 'directory').length || 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Listed <span className="text-foreground/50">{dirName}</span>
            {(fileCount > 0 || dirCount > 0) && (
              <span className="text-muted-foreground/50 ml-1.5">
                ({fileCount} file{fileCount !== 1 ? 's' : ''}{dirCount > 0 ? `, ${dirCount} dir${dirCount !== 1 ? 's' : ''}` : ''})
              </span>
            )}
          </span>
        </ToolItem>
      );
    }
  }

  // Glob Tool
  if (part.type === "tool-glob") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Searching files
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { files?: string[] | Array<{ path?: string; name?: string }> } | undefined;
      const fileCount = Array.isArray(output?.files) ? output.files.length : 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Found <span className="text-foreground/50">{fileCount}</span> file{fileCount !== 1 ? 's' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // Grep Tool
  if (part.type === "tool-grep") {
    const { toolCallId, state } = part;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <span className="text-sm">
            Searching
            <StreamingDots />
          </span>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { matchCount?: number; result?: { totalMatches?: number } } | undefined;
      const matchCount = output?.matchCount || output?.result?.totalMatches || 0;

      return (
        <ToolItem key={toolCallId}>
          <span className="text-sm">
            Found <span className="text-foreground/50">{matchCount}</span> match{matchCount !== 1 ? 'es' : ''}
          </span>
        </ToolItem>
      );
    }
  }

  // String Replace
  if (part.type === "tool-stringReplace") {
    const { toolCallId, state } = part;
    const fileName = getFileName(part.input?.file_path);
    const inputOldString = part.input?.old_string || '';
    const inputNewString = part.input?.new_string || '';

    if (state === "output-available") {
      const output = part.output as {
        linesAdded?: number;
        linesRemoved?: number;
        old_string?: string;
        new_string?: string;
        checkpointId?: string;
        afterHash?: string;
      } | undefined;
      const oldString = output?.old_string || inputOldString;
      const newString = output?.new_string || inputNewString;
      const actualFilePath = part.input?.file_path || fileName;

      return (
        <ToolItem key={toolCallId}>
          <EditableToolItem
            toolCallId={toolCallId}
            filePath={actualFilePath}
            oldFile={{ contents: oldString, name: fileName }}
            newFile={{ contents: newString, name: fileName }}
            fileName={fileName}
            projectCwd={projectCwd}
            checkpointId={output?.checkpointId}
            afterHash={output?.afterHash}
          />
        </ToolItem>
      );
    }
  }

  // Run Terminal Command
  if (part.type === "tool-runTerminalCommand") {
    const { toolCallId, state } = part;
    const command = part.input?.command;

    if (state === "input-streaming") {
      return (
        <ToolItem key={toolCallId} isStreaming>
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground/60" />
            <span className="text-sm">
              Running <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{command}</span>
            </span>
            <StreamingDots />
          </div>
        </ToolItem>
      );
    }

    if (state === "output-available") {
      const output = part.output as { success?: boolean; message?: string; error?: string; stdout?: string; stderr?: string; exitCode?: number } | undefined;
      const isSuccess = output?.success !== false && (!output?.exitCode || output.exitCode === 0);

      return (
        <ToolItem key={toolCallId}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Terminal className="size-4 text-muted-foreground/70" />
              <span className="text-sm">
                Ran <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{command}</span>
              </span>
              <Badge
                variant={isSuccess ? "default" : "destructive"}
                className="gap-1 text-xs"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="size-3" />
                    Success
                  </>
                ) : (
                  <>
                    <XCircle className="size-3" />
                    Failed
                  </>
                )}
              </Badge>
              {output?.exitCode !== undefined && output.exitCode !== 0 && (
                <span className="text-xs text-muted-foreground/60">
                  Exit code: {output.exitCode}
                </span>
              )}
            </div>
            {(output?.stdout || output?.stderr || output?.message) && (
              <div className="ml-6 space-y-1">
                {output?.message && (
                  <div className="text-xs text-muted-foreground/70">
                    {output.message}
                  </div>
                )}
                {output?.stdout && (
                  <div className="text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border/50">
                    <div className="text-muted-foreground/60 text-[10px] mb-0.5">STDOUT:</div>
                    <div className="text-foreground/80 whitespace-pre-wrap wrap-break-word">{output.stdout}</div>
                  </div>
                )}
                {output?.stderr && (
                  <div className="text-xs font-mono bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                    <div className="text-destructive/70 text-[10px] mb-0.5">STDERR:</div>
                    <div className="text-destructive/90 whitespace-pre-wrap wrap-break-word">{output.stderr}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ToolItem>
      );
    }
  }

  return null;
};
