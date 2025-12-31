import { memo, useMemo, lazy, Suspense, useState, useEffect } from 'react';
import {
  type FileDiffMetadata,
  parseDiffFromFile,
} from '@pierre/diffs';
import type { FileContents, FileDiffProps } from '@pierre/diffs/react';
import { Loader2 } from 'lucide-react';


const LazyFileDiff = lazy(() =>
  import('@pierre/diffs/react').then((module) => ({ default: module.FileDiff }))
);

interface PierreDiffProps {
  oldFile: FileContents;
  newFile: FileContents;
}

const DIFF_OPTIONS: FileDiffProps<undefined>['options'] = {
  theme: { dark: "material-theme-darker", light: "material-theme-darker" },
  diffStyle: "unified",
  diffIndicators: "classic",
  expandUnchanged: true,
  lineDiffType: "word",
};

export const PierreDiff = memo(function PierreDiff({
  oldFile,
  newFile,
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
                fileDiff={fileDiff}
                options={DIFF_OPTIONS}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PierreDiff;
