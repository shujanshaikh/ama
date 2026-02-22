type ResumableEntry = {
  streamId: string;
  chatId: string;
  createdAt: number;
  chunks: Uint8Array[];
  byteLength: number;
  completed: boolean;
  cleanupTimer?: ReturnType<typeof setTimeout>;
};

const entries = new Map<string, ResumableEntry>();
const latestStreamIdByChat = new Map<string, string>();

const MAX_BUFFER_BYTES = 2 * 1024 * 1024;
const COMPLETED_TTL_MS = 60 * 1000;
const ACTIVE_STALE_MS = 2 * 60 * 1000;

function scheduleCleanup(entry: ResumableEntry): void {
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
  }

  entry.cleanupTimer = setTimeout(() => {
    const current = entries.get(entry.streamId);
    if (!current) return;

    entries.delete(entry.streamId);
    if (latestStreamIdByChat.get(entry.chatId) === entry.streamId) {
      latestStreamIdByChat.delete(entry.chatId);
    }
  }, COMPLETED_TTL_MS);
}

function pruneBuffer(entry: ResumableEntry): void {
  while (entry.byteLength > MAX_BUFFER_BYTES && entry.chunks.length > 1) {
    const first = entry.chunks.shift();
    if (!first) break;
    entry.byteLength -= first.byteLength;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerResumableStream(
  streamId: string,
  chatId: string,
  stream: ReadableStream<Uint8Array>,
): { stream: ReadableStream<Uint8Array>; done: Promise<void> } {
  const [clientStream, recorderStream] = stream.tee();

  const entry: ResumableEntry = {
    streamId,
    chatId,
    createdAt: Date.now(),
    chunks: [],
    byteLength: 0,
    completed: false,
  };

  entries.set(streamId, entry);
  latestStreamIdByChat.set(chatId, streamId);

  const done = (async () => {
    const reader = recorderStream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        entry.chunks.push(value);
        entry.byteLength += value.byteLength;
        pruneBuffer(entry);
      }

      entry.completed = true;
      scheduleCleanup(entry);
    } catch (error) {
      void error;
      entry.completed = true;
      scheduleCleanup(entry);
    } finally {
      reader.releaseLock();
    }
  })();

  return { stream: clientStream, done };
}

export function getLatestStreamIdForChat(chatId: string): string | null {
  return latestStreamIdByChat.get(chatId) ?? null;
}

export function resumeResumableStream(streamId: string): ReadableStream<Uint8Array> | null {
  const snapshot = entries.get(streamId);
  if (!snapshot) return null;

  if (!snapshot.completed && Date.now() - snapshot.createdAt > ACTIVE_STALE_MS) {
    entries.delete(streamId);
    if (latestStreamIdByChat.get(snapshot.chatId) === streamId) {
      latestStreamIdByChat.delete(snapshot.chatId);
    }
    return null;
  }

  let cursor = 0;
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (!cancelled) {
        const current = entries.get(streamId);
        if (!current) {
          controller.close();
          return;
        }

        if (cursor < current.chunks.length) {
          controller.enqueue(current.chunks[cursor]);
          cursor += 1;
          return;
        }

        if (current.completed) {
          controller.close();
          return;
        }

        if (Date.now() - current.createdAt > ACTIVE_STALE_MS) {
          controller.close();
          return;
        }

        await sleep(50);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}
