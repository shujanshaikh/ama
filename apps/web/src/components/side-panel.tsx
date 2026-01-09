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
import { Skeleton } from "./ui/skeleton";
import { Loader2, Plus, Search, MessageSquare } from "lucide-react";
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

    const { data: projectData } = useQuery({
        ...trpc.project.getProject.queryOptions({ projectId: projectId || "" }),
        enabled: !!projectId,
    });

    const chats: Chat[] = (chatsData as Chat[] | undefined) ?? [];

    const filteredChats = useMemo(() => {
        let result = chats;
        if (searchQuery.trim()) {
            result = result.filter(chat =>
                chat.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return result.sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt;
            const dateB = b.updatedAt || b.createdAt;

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
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
                "w-full text-left px-3 py-2 rounded-lg transition-colors group flex items-center gap-3",
                isActive
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
        >
            <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
            <span className={cn(
                "flex-1 text-sm truncate",
                isActive && "font-medium"
            )}>
                {chat.title}
            </span>
            <span className="text-[10px] opacity-40 tabular-nums">
                {formatRelativeTime(chat.updatedAt || chat.createdAt)}
            </span>
        </button>
    );

    return (
        <Sidebar
            variant="sidebar"
            side="left"
            className="bg-sidebar border-r border-sidebar-border"
        >
            <SidebarRail />
            <div className="flex flex-col h-full p-4">
                {/* Header */}
                <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
                >
                    <AmaLogo size={28} />
                    <span className="text-lg font-semibold text-foreground tracking-tight">ama</span>
                </button>

                {projectId && (
                    <>
                        {/* Project name */}
                        {projectData ? (
                            <div className="mb-4">
                                <span className="inline-block px-2.5 py-1 rounded-md bg-sidebar-accent/50 border border-sidebar-border/50 text-xs font-medium text-foreground truncate max-w-full">
                                    {projectData.name}
                                </span>
                            </div>
                        ) : (
                            <Skeleton className="h-6 w-24 mb-4 rounded-md" />
                        )}

                        {/* New chat button */}
                        <Button
                            onClick={handleNewChat}
                            variant="outline"
                            className="w-full h-9 mb-3 rounded-lg text-sm font-medium"
                            disabled={isCreatingChat}
                        >
                            {isCreatingChat ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            New chat
                        </Button>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-9 rounded-lg text-sm bg-transparent border-sidebar-border"
                            />
                        </div>
                    </>
                )}

                {/* Chat list */}
                <SidebarContent className="flex-1 min-h-0 -mx-2">
                    <ScrollArea className="h-full px-2">
                        {isLoading && projectId ? (
                            <div className="space-y-1">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-9 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : projectId && filteredChats.length > 0 ? (
                            <div className="space-y-4">
                                {recentChats.length > 0 && (
                                    <div>
                                        <div className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide px-3 mb-1">
                                            Recent
                                        </div>
                                        <div className="space-y-0.5">
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
                                        <div className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide px-3 mb-1">
                                            Older
                                        </div>
                                        <div className="space-y-0.5">
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
                            <div className="text-center py-12 text-muted-foreground">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No chats yet</p>
                            </div>
                        ) : null}
                    </ScrollArea>
                </SidebarContent>
            </div>
        </Sidebar>
    )
}
