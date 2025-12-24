import { lazy, Suspense, useMemo } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile,
} from '@pierre/diffs';
import type { FileContents } from '@pierre/diffs/react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// Dynamically import FileDiff to avoid SSR issues with CommonJS dependencies
const LazyFileDiff = lazy(() => 
  import('@pierre/diffs/react').then(module => ({ default: module.FileDiff }))
);

interface PierreDiffProps {
    oldFile: FileContents;
    newFile: FileContents;
    fileName?: string;
    showHeader?: boolean;
    showActions?: boolean;
    editStatus?: 'applied' | 'accepted' | 'reverted';
    onAccept?: () => void;
    onReject?: () => void;
    isProcessing?: boolean;
  }

export function PierreDiff({ oldFile, newFile, fileName, showHeader, showActions, editStatus, onAccept, onReject, isProcessing }: PierreDiffProps) {
    // Parse the diff from oldFile and newFile
    const fileDiff = useMemo<FileDiffMetadata>(() => {
      return parseDiffFromFile(oldFile, newFile);
    }, [oldFile, newFile]);

    return (
      <div className="relative">
        {showActions && (
          <div className="flex items-center justify-end gap-2 p-3 border-b bg-muted/30">
            <Button
              onClick={() => onReject?.()}
              disabled={isProcessing || editStatus === 'accepted' || editStatus === 'reverted'}
              variant="destructive"
              size="sm"
              className="gap-1.5 rounded-lg h-7 px-2.5 text-xs"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Reverting...</span>
                </>
              ) : editStatus === 'reverted' ? (
                <>
                  <XCircle className="size-3" />
                  <span>Reverted</span>
                </>
              ) : (
                <>
                  <XCircle className="size-3" />
                  <span>Revert</span>
                </>
              )}
            </Button>
            <Button
              onClick={() => onAccept?.()}
              disabled={isProcessing || editStatus === 'accepted' || editStatus === 'reverted'}
              variant={editStatus === 'accepted' ? 'secondary' : 'default'}
              size="sm"
              className="gap-1.5 rounded-lg h-7 px-2.5 text-xs"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Accepting...</span>
                </>
              ) : editStatus === 'accepted' ? (
                <>
                  <CheckCircle2 className="size-3" />
                  <span>Accepted</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3" />
                  <span>Accept</span>
                </>
              )}
            </Button>
          </div>
        )}
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading diff...</div>}>
          <LazyFileDiff
            fileDiff={fileDiff}
            options={{
              theme: { dark: "vitesse-dark", light: "vitesse-light" },
              diffStyle: "unified",
            }}
          />
        </Suspense>
      </div>
    );
}

