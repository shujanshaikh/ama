import type { ChatMessage } from "./tool-types";
import type { DBMessage } from "@/db/schema";
import type { UIMessagePart } from "ai";
import type { CustomUIDataTypes } from "./tool-types";
import type { ChatTools } from "./tool-types";

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
    return messages.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: message.createdAt.toISOString(),
      },
    }));
  }