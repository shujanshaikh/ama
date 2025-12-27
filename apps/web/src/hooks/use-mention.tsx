import { useState, useRef } from 'react';
import type { RefObject } from 'react';

interface UseMentionsReturn {
  cursorPosition: number;
  showMentionPopover: boolean;
  mentionPopoverRef: RefObject<HTMLDivElement | null>;
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCursorPositionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleFileSelect: (file: string, text: string, textareaRef: RefObject<HTMLTextAreaElement | null>) => void;
  setShowMentionPopover: (show: boolean) => void;
}

export function useMentions(
  text: string,
  setText: (text: string) => void
): UseMentionsReturn {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const mentionPopoverRef = useRef<HTMLDivElement>(null);

  const checkMentionTrigger = (textValue: string, selectionStart: number) => {
    const textBeforeCursor = textValue.slice(0, selectionStart);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const lastCharBeforeCursor = textBeforeCursor[textBeforeCursor.length - 1];
    const isLastCharSpace = lastCharBeforeCursor === ' ' || lastCharBeforeCursor === '\n';

    return atIndex !== -1 && !isLastCharSpace && textBeforeCursor.slice(atIndex + 1).indexOf(' ') === -1;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setCursorPosition(e.target.selectionStart);
    setShowMentionPopover(checkMentionTrigger(newText, e.target.selectionStart));
  };

  const handleCursorPositionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart);
    setShowMentionPopover(checkMentionTrigger(e.target.value, e.target.selectionStart));
  };

  const handleFileSelect = (
    file: string,
    currentText: string,
    textareaRef: RefObject<HTMLTextAreaElement | null>
  ) => {
    const textBeforeCursor = currentText.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const textAfterCursor = currentText.slice(cursorPosition);
      const newText = currentText.slice(0, atIndex) + `@${file} ` + textAfterCursor;
      setText(newText);
      setShowMentionPopover(false);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = atIndex + file.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  return {
    cursorPosition,
    showMentionPopover,
    mentionPopoverRef,
    handleTextChange,
    handleCursorPositionChange,
    handleFileSelect,
    setShowMentionPopover,
  };
}
