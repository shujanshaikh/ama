import { memo, useMemo, lazy, Suspense, useState, useEffect } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile
} from '@pierre/diffs';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';
import { Loader2 } from 'lucide-react';


const LazyFileDiff = lazy(() =>
  import('@pierre/diffs/react').then((module) => ({ default: module.FileDiff }))
);

interface PierreDiffProps {
  oldFile: FileContents;
  newFile: FileContents;
  splitView?: boolean;
}

const getDiffOptions = (splitView: boolean): FileDiffProps<undefined>['options'] => ({
  theme: { dark: "min-dark", light: "min-light" },
  diffStyle: splitView ? "split" : "unified",
  diffIndicators: "bars",
  expandUnchanged: true,
  lineDiffType: "word",
});


export const PierreDiff = memo(function PierreDiff({
  oldFile,
  newFile,
  splitView = false,
}: PierreDiffProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const oldContent = oldFile.contents || '';
  const newContent = newFile.contents || '';

  const fileDiff = useMemo<FileDiffMetadata>(() => {
    return parseDiffFromFile(oldFile, newFile);
  }, [oldFile, newFile]);

  if (oldContent === newContent) {
    return null;
  }

  if (!isMounted) {
    return (
      <div className="mt-2">
        <div className="overflow-hidden border border-border/30 rounded-lg">
          <div className="p-4 text-[13px] text-muted-foreground/70 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading diff...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="overflow-hidden border border-border/30 rounded-lg">
        <div className="overflow-hidden">
          <div className="max-h-[380px] overflow-auto diff-scrollbar">
            <Suspense
              fallback={
                <div className="p-4 text-[13px] text-muted-foreground/70 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading diff...
                </div>
              }
            >
              <LazyFileDiff
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
                  fontSize: 12,
                } as React.CSSProperties}
                fileDiff={fileDiff}
                options={getDiffOptions(splitView)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PierreDiff;
