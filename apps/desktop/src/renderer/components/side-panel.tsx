import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AmaLogo } from "@/components/ama-logo";
import { api } from "../lib/trpc";
import { cn } from "@/lib/utils";
import {
  SearchIcon,
  PanelLeftIcon,
} from "lucide-react";

interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

interface SidePanelProps {
  projectName: string;
  onNewChat: () => void;
  isCreatingChat?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  refreshKey?: number;
}

function formatRelativeTime(date: string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function isRecent(date: string | null): boolean {
  if (!date) return false;
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours < 24;
}

export function SidePanel({
  projectName,
  onNewChat,
  isCreatingChat,
  collapsed,
  onToggleCollapse,
  refreshKey,
}: SidePanelProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeChatId = searchParams.get("chat");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchChats = useCallback(async () => {
    if (!projectId) return;
    try {
      const chatList = await api.getChats(projectId);
      setChats(Array.isArray(chatList) ? chatList : []);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, activeChatId, refreshKey]);

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${projectId}?chat=${chatId}`);
  };

  const filteredChats = useMemo(() => {
    let result = chats.filter((c) =>
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return result.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [chats, searchQuery]);

  const recentChats = useMemo(
    () =>
      filteredChats.filter((c) => isRecent(c.updatedAt || c.createdAt)),
    [filteredChats],
  );

  const olderChats = useMemo(
    () =>
      filteredChats.filter((c) => !isRecent(c.updatedAt || c.createdAt)),
    [filteredChats],
  );

  if (collapsed) return null;

  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-background">
      {/* Header with drag region */}
      <div className="flex flex-col p-4 pb-0">
        <div className="drag-region flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="no-drag flex items-center gap-1.5 transition-opacity hover:opacity-70"
          >
            <AmaLogo size={22} />
            <span className="text-base font-semibold tracking-tight text-foreground">
              ama
            </span>
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="no-drag rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Project name */}
        <div className="mb-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/40">
            {projectName}
          </span>
        </div>

        {/* Search */}
        <div className="no-drag relative mb-3">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-40" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-[13px] placeholder:text-foreground/25 focus:border-ring/50 transition-colors"
          />
        </div>

        {/* New Chat */}
        <Button
          onClick={onNewChat}
          disabled={isCreatingChat}
          className="no-drag mb-4 h-8 w-full rounded-lg bg-white text-black hover:bg-white/90"
        >
          {isCreatingChat ? "Creating..." : "New Chat"}
        </Button>
      </div>

      {/* Chat list */}
      <ScrollArea className="no-drag flex-1 px-2">
        {filteredChats.length > 0 ? (
          <div className="space-y-4 pb-4">
            {recentChats.length > 0 && (
              <div>
                <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-foreground/25">
                  Recent
                </div>
                <div className="space-y-0.5">
                  {recentChats.map((chat) => (
                    <ChatItemButton
                      key={chat.id}
                      chat={chat}
                      isActive={activeChatId === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {olderChats.length > 0 && (
              <div>
                <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-widest text-foreground/25">
                  Previous
                </div>
                <div className="space-y-0.5">
                  {olderChats.map((chat) => (
                    <ChatItemButton
                      key={chat.id}
                      chat={chat}
                      isActive={activeChatId === chat.id}
                      onClick={() => handleChatClick(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-[13px] text-foreground/30">
              {searchQuery ? "No matching chats" : "No chats yet"}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ChatItemButton({
  chat,
  isActive,
  onClick,
}: {
  chat: ChatItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left transition-all duration-150",
        isActive
          ? "bg-accent text-foreground"
          : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px]",
          isActive ? "font-medium" : "font-normal",
        )}
      >
        {chat.title || "Untitled Chat"}
      </span>
      <span className="shrink-0 tabular-nums text-[10px] text-foreground/40">
        {formatRelativeTime(chat.updatedAt || chat.createdAt)}
      </span>
    </button>
  );
}
