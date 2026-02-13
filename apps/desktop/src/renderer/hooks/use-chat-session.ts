import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { API_URL } from "../lib/constants";
import { api } from "../lib/trpc";
import { models } from "../lib/models";

interface UseChatSessionOptions {
  chatId: string | null;
  hasGatewayKey: boolean;
  onTitleGenerated: () => void;
}

export function useChatSession({
  chatId,
  hasGatewayKey,
  onTitleGenerated,
}: UseChatSessionOptions) {
  const [model, setModel] = useState(models[0].id);
  const modelRef = useRef(model);
  modelRef.current = model;

  const gatewayTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (hasGatewayKey) {
      api.getGatewayToken().then((t) => {
        gatewayTokenRef.current = t;
      });
    } else {
      gatewayTokenRef.current = null;
    }
  }, [hasGatewayKey]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/v1/agent-proxy`,
        credentials: "include",
        headers: () => {
          const token = gatewayTokenRef.current;
          if (token) {
            return { Authorization: `Bearer ${token}` };
          }
          return {} as Record<string, string>;
        },
        prepareSendMessagesRequest({ messages, body }) {
          const lastMessage = messages.at(-1);
          return {
            body: {
              chatId,
              message: lastMessage,
              model: modelRef.current,
              ...body,
            },
          };
        },
      }),
    [chatId],
  );

  const {
    messages,
    sendMessage,
    stop,
    error,
    regenerate,
    status,
    setMessages,
  } = useChat({
    transport,
    id: chatId || "new-chat",
  });

  // Load existing messages when chat is selected
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const hasInitializedRef = useRef(false);
  const hasGeneratedTitleRef = useRef(false);
  const currentChatIdRef = useRef<string | undefined>(chatId ?? undefined);

  useEffect(() => {
    if (chatId !== currentChatIdRef.current) {
      currentChatIdRef.current = chatId ?? undefined;
      hasInitializedRef.current = false;
      hasGeneratedTitleRef.current = false;
      setMessages([]);
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    if (!chatId || isLoadingMessages) return;
    if (hasInitializedRef.current && currentChatIdRef.current === chatId)
      return;
    if (status === "streaming" || status === "submitted") return;

    let cancelled = false;
    setIsLoadingMessages(true);
    api
      .getMessages(chatId)
      .then((initialMessages) => {
        if (cancelled) return;
        if (Array.isArray(initialMessages) && initialMessages.length > 0) {
          setMessages(initialMessages as any);
        }
        hasInitializedRef.current = true;
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load messages:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, status, setMessages]);

  const handleSubmit = useCallback(
    (text: string) => {
      const isFirstMessage =
        messages.length === 0 && !isLoadingMessages;

      sendMessage({ text });

      if (
        isFirstMessage &&
        chatId &&
        !hasGeneratedTitleRef.current
      ) {
        hasGeneratedTitleRef.current = true;
        api
          .generateTitle({ chatId, message: text })
          .then(() => onTitleGenerated())
          .catch(console.error);
      }
    },
    [messages.length, isLoadingMessages, sendMessage, chatId, onTitleGenerated],
  );

  return {
    messages,
    setMessages,
    sendMessage,
    handleSubmit,
    stop,
    regenerate,
    status,
    error,
    isLoadingMessages,
    model,
    setModel,
  };
}
