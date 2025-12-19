import {
    Sidebar,
    SidebarContent,
    SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";
import { AmaLogo } from "./ama-logo";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

interface Chat {
    id: string;
    title: string;
    projectId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}

function formatRelativeTime(date: Date | null): string {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

function isRecent(date: Date | null): boolean {
    if (!date) return false;
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours < 24;
}

export function Sidepanel() {
    const params = useParams({ strict: false });
    const projectId = params.projectId as string | undefined;
    const search = useSearch({ strict: false }) as { chat?: string };
    const activeChatId = search?.chat;
    const trpc = useTRPC();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: chatsData, isLoading } = useQuery({
        ...trpc.chat.getChats.queryOptions({ projectId: projectId || "" }),
        enabled: !!projectId,
    });

    const chats: Chat[] = (chatsData as Chat[] | undefined) ?? [];

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        return chats.filter(chat =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [chats, searchQuery]);

    const recentChats = useMemo(() =>
        filteredChats.filter(chat => isRecent(chat.updatedAt || chat.createdAt)),
        [filteredChats]
    );

    const olderChats = useMemo(() =>
        filteredChats.filter(chat => !isRecent(chat.updatedAt || chat.createdAt)),
        [filteredChats]
    );

    const { mutate: createChat, isPending: isCreatingChat } = useMutation({
        ...trpc.chat.createChat.mutationOptions(),
        onSuccess: (chatId) => {
            if (chatId && projectId) {
                queryClient.invalidateQueries({
                    queryKey: trpc.chat.getChats.queryKey({ projectId }),
                });
                navigate({
                    to: '/chat/$projectId',
                    params: { projectId },
                    search: { chat: chatId },
                });
            }
        },
    });

    const handleChatClick = (chatId: string) => {
        if (projectId) {
            navigate({
                to: '/chat/$projectId',
                params: { projectId },
                search: { chat: chatId },
            });
        }
    };

    const handleNewChat = () => {
        if (projectId) {
            createChat({
                title: "New Chat",
                projectId,
            });
        }
    };

    const ChatItem = ({ chat, isActive }: { chat: Chat; isActive: boolean }) => (
        <button
            onClick={() => handleChatClick(chat.id)}
            className={cn(
                "w-full text-left px-3 py-1.5 rounded-md transition-colors group relative",
                isActive
                    ? "bg-muted/60"
                    : "hover:bg-muted/40"
            )}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-foreground/60 rounded-full" />
            )}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        "text-sm truncate",
                        isActive ? "text-foreground font-medium" : "text-foreground/80"
                    )}>
                        {chat.title}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {formatRelativeTime(chat.updatedAt || chat.createdAt)}
                </span>
            </div>
        </button>
    );

    return (
        <Sidebar
            variant="sidebar"
            side="left"
            className="border-r-0"
        >
            <SidebarRail />
            <div className="flex flex-col h-full p-4">
                <div className="mb-4">
                    <AmaLogo size={40} />
                </div>

                {projectId && (
                    <>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 hover:bg-muted/40 transition-colors mb-4 w-fit">
                            <div className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                            <span className="text-sm text-foreground/90">ama</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </button>

                        <div className="flex gap-2 mb-6">
                            <Input
                                placeholder="Search chats"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 text-sm bg-transparent border-border/50 placeholder:text-muted-foreground/60"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 shrink-0 border-border/50 hover:bg-muted/40"
                                onClick={handleNewChat}
                                disabled={isCreatingChat}
                            >
                                {isCreatingChat ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="h-3 w-3 mr-1" />
                                        <span className="text-sm">New Chat</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}

                <SidebarContent className="flex-1 min-h-0 overflow-hidden -mx-2">
                    <ScrollArea className="h-full px-2">
                        {isLoading && projectId ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : projectId && filteredChats.length > 0 ? (
                            <div className="space-y-4">
                                {recentChats.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase px-3 mb-2">
                                            Recent
                                        </div>
                                        <div className="space-y-0">
                                            {recentChats.map((chat: Chat) => (
                                                <ChatItem
                                                    key={chat.id}
                                                    chat={chat}
                                                    isActive={activeChatId === chat.id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {olderChats.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase px-3 mb-2">
                                            Older
                                        </div>
                                        <div className="space-y-0">
                                            {olderChats.map((chat: Chat) => (
                                                <ChatItem
                                                    key={chat.id}
                                                    chat={chat}
                                                    isActive={activeChatId === chat.id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : projectId ? (
                            <div className="text-sm text-muted-foreground px-3 py-8 text-center">
                                No chats yet
                            </div>
                        ) : null}
                    </ScrollArea>
                </SidebarContent>
            </div>
        </Sidebar>
    )
}
