import { lazy, Suspense, useMemo, useState } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile,
} from '@pierre/diffs';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronRight,
  AlertTriangle,
  FileCode
} from 'lucide-react';

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
    theme: { dark: "vitesse-dark", light: "vitesse-light" },
    diffStyle: "unified", 
    diffIndicators: "bars",
    expandUnchanged: true,
    lineDiffType: "word",
  };
  
  return (
    <div className="mt-2">
      <Card className="overflow-hidden p-0 border border-border/50 shadow-lg bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/30">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:bg-muted/40 rounded-md px-2 py-1 -ml-2 transition-colors"
          >
            <ChevronRight 
              className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            
            <FileCode className="w-3.5 h-3.5 text-muted-foreground/60" />
            
            <span className="text-xs font-medium text-foreground/80">
              {displayFileName}
            </span>
            
            <div className="flex items-center gap-2 ml-3">
              {added > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium px-2 py-0.5 h-5 rounded-md shadow-sm"
                >
                  <span className="font-semibold">+</span>
                  {added}
                </Badge>
              )}
              {removed > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium px-2 py-0.5 h-5 rounded-md shadow-sm"
                >
                  <span className="font-semibold">-</span>
                  {removed}
                </Badge>
              )}
            </div>
            
          </button>
          
          <div className="flex items-center gap-2">
            {isConflict && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Conflict
                </Badge>
                {onForceRevert && (
                  <Button
                    onClick={onForceRevert}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    Force Revert
                  </Button>
                )}
              </div>
            )}
            
            {showActions && editStatus === 'applied' && !isConflict && (
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={onReject}
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                    <Button
                      onClick={onAccept}
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {editStatus === 'accepted' && (
              <Badge 
                variant="secondary" 
                className="text-xs font-medium px-2.5 py-0.5 h-6 gap-1.5 rounded-md shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accepted
              </Badge>
            )}
            
            {editStatus === 'reverted' && (
              <Badge 
                variant="secondary" 
                className="text-xs font-medium px-2.5 py-0.5 h-6 gap-1.5 rounded-md shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reverted
              </Badge>
            )}
          </div>
        </div>
        
        {isConflict && conflictMessage && (
          <div className="px-3 py-2 bg-muted/50 border-b border-border/30 text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3 inline mr-1.5" />
            {conflictMessage}
          </div>
        )}
        
        {isExpanded && (
          <div className="overflow-hidden">
            <div className="max-h-[400px] overflow-auto diff-scrollbar">
              <Suspense fallback={
                <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
            scrollbar-color: rgba(82, 82, 91, 0.4) transparent;
          }
          .diff-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .diff-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .diff-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(82, 82, 91, 0.4);
            border-radius: 10px;
          }
          .diff-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(82, 82, 91, 0.6);
          }
          .diff-scrollbar::-webkit-scrollbar-corner {
            background: transparent;
          }
        `}</style>
      </Card>
    </div>
  );
}

export default PierreDiff;
