import { useState, useCallback } from "react";

export function useContextInput() {
  const [input, setInput] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedContextFiles, setSelectedContextFiles] = useState<string[]>(
    [],
  );
  const [showContextSelector, setShowContextSelector] = useState(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      setInput(value);
      setCursorPosition(cursorPos);

      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        const hasSpace = textAfterAt.includes(" ");
        if (!hasSpace) {
          setShowContextSelector(true);
        } else {
          setShowContextSelector(false);
        }
      } else {
        setShowContextSelector(false);
      }
    },
    [],
  );

  const handleFileSelect = useCallback(
    (file: string) => {
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      const textAfterCursor = input.slice(cursorPosition);

      if (lastAtIndex !== -1) {
        const newInput =
          input.slice(0, lastAtIndex) + "@" + file + " " + textAfterCursor;
        setInput(newInput);
      } else {
        const newInput =
          input.slice(0, cursorPosition) +
          "@" +
          file +
          " " +
          textAfterCursor;
        setInput(newInput);
      }

      if (!selectedContextFiles.includes(file)) {
        setSelectedContextFiles((prev) => [...prev, file]);
      }

      setShowContextSelector(false);

      setTimeout(() => {
        const textarea = document.querySelector(
          "textarea",
        ) as HTMLTextAreaElement;
        textarea?.focus();
      }, 0);
    },
    [input, cursorPosition, selectedContextFiles],
  );

  const handleToggleContextFile = useCallback(
    (file: string) => {
      const isRemoving = selectedContextFiles.includes(file);

      setSelectedContextFiles((prev) =>
        prev.includes(file)
          ? prev.filter((f) => f !== file)
          : [...prev, file],
      );

      if (isRemoving) {
        const fileName = file.split("/").pop() || file;
        const regex = new RegExp(
          `@${fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`,
          "g",
        );
        setInput((prev) => prev.replace(regex, ""));
      }
    },
    [selectedContextFiles],
  );

  const clearInput = useCallback(() => {
    setInput("");
    setSelectedContextFiles([]);
  }, []);

  return {
    input,
    setInput,
    cursorPosition,
    selectedContextFiles,
    showContextSelector,
    setShowContextSelector,
    handleInputChange,
    handleFileSelect,
    handleToggleContextFile,
    clearInput,
  };
}
