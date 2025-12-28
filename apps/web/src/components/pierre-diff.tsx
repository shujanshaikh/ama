import { lazy, Suspense, useMemo, useState } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile,
} from '@pierre/diffs';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';

import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { getFileIcon } from './file-icons';

const LazyFileDiff = lazy(() =>
  import('@pierre/diffs/react').then(module => ({ default: module.FileDiff }))
);

interface PierreDiffProps {
  oldFile: FileContents;
  newFile: FileContents;
  fileName?: string;
  showHeader?: boolean;
  showActions?: boolean;
  editStatus?: 'applied' | 'accepted' | 'reverted' | 'conflict';
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  conflictMessage?: string;
  onForceRevert?: () => void;
}

// Count diff statistics
const countDiffLines = (oldStr: string, newStr: string) => {
  const oldLines = oldStr?.split('\n') || [];
  const newLines = newStr?.split('\n') || [];

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = newLines.filter(line => !oldSet.has(line)).length;
  const removed = oldLines.filter(line => !newSet.has(line)).length;

  return { added, removed };
};

export function PierreDiff({
  oldFile,
  newFile,
  fileName,
  showActions,
  editStatus,
  onAccept,
  onReject,
  isProcessing,
  conflictMessage,
  onForceRevert,
}: PierreDiffProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const oldContent = oldFile.contents || '';
  const newContent = newFile.contents || '';
  const displayFileName = fileName || oldFile.name || newFile.name || 'file';

  // Parse the diff from oldFile and newFile
  const fileDiff = useMemo<FileDiffMetadata>(() => {
    return parseDiffFromFile(oldFile, newFile);
  }, [oldFile, newFile]);

  const { added, removed } = useMemo(
    () => countDiffLines(oldContent, newContent),
    [oldContent, newContent]
  );

  // Don't render if no changes
  if (oldContent === newContent) {
    return null;
  }

  const isConflict = editStatus === 'conflict';

  // FileDiff options for split view
  const diffOptions: FileDiffProps<undefined>['options'] = {
    theme: { dark: "material-theme-darker", light: "material-theme-darker" },
    diffStyle: "unified",
    diffIndicators: "bars",
    expandUnchanged: true,
    lineDiffType: "word",
  };

  return (
    <div className="mt-2">
      <div className="overflow-hidden border border-border/30 rounded-lg">
        {(showActions || editStatus || isConflict) && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b border-border/20">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronRight
                className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              />
              {getFileIcon(displayFileName)}
              <span className="text-xs text-foreground/80">
                {displayFileName}
              </span>
              <span className="text-[10px] text-emerald-500/80 ml-1">+{added}</span>
              {removed > 0 && <span className="text-[10px] text-red-400/80">-{removed}</span>}
            </button>

            <div className="flex items-center gap-1.5">
              {isConflict && (
                <>
                  <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Conflict
                  </span>
                  {onForceRevert && (
                    <button
                      onClick={onForceRevert}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5"
                    >
                      Force Revert
                    </button>
                  )}
                </>
              )}

              {showActions && editStatus === 'applied' && !isConflict && (
                <>
                  {isProcessing ? (
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={onReject}
                        className="text-[10px] text-muted-foreground hover:text-red-400 px-1.5 py-0.5 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={onAccept}
                        className="text-[10px] text-muted-foreground hover:text-emerald-500 px-1.5 py-0.5 transition-colors"
                      >
                        Accept
                      </button>
                    </>
                  )}
                </>
              )}

              {editStatus === 'accepted' && (
                <span className="text-[10px] text-emerald-500/80 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Accepted
                </span>
              )}

              {editStatus === 'reverted' && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <XCircle className="w-2.5 h-2.5" />
                  Reverted
                </span>
              )}
            </div>
          </div>
        )}

        {isConflict && conflictMessage && (
          <div className="px-3 py-1.5 bg-amber-500/5 border-b border-border/20 text-[10px] text-amber-500/70">
            {conflictMessage}
          </div>
        )}

        {isExpanded && (
          <div className="overflow-hidden">
            <div className="max-h-[380px] overflow-auto diff-scrollbar">
              <Suspense fallback={
                <div className="p-4 text-[13px] text-muted-foreground/70 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading diff...
                </div>
              }>
                <LazyFileDiff
                  fileDiff={fileDiff}
                  options={diffOptions}
                />
              </Suspense>
            </div>
          </div>
        )}

        <style>{`
          .diff-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(113, 113, 122, 0.25) transparent;
          }
          .diff-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .diff-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .diff-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(113, 113, 122, 0.25);
            border-radius: 10px;
          }
          .diff-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(113, 113, 122, 0.4);
          }
          .diff-scrollbar::-webkit-scrollbar-corner {
            background: transparent;
          }
        `}</style>
      </div>
    </div>
  );
}

export default PierreDiff;
