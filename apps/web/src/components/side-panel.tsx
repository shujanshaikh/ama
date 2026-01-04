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
                "w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group relative flex items-center gap-2",
                isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
        >
            <MessageSquare className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive ? "text-sidebar-accent-foreground/70" : "text-muted-foreground/50 group-hover:text-muted-foreground"
            )} />
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 overflow-hidden">
                <span className={cn(
                    "text-sm truncate",
                    isActive ? "font-medium" : "font-normal"
                )}>
                    {chat.title}
                </span>
                <span className={cn(
                    "text-[10px] tabular-nums shrink-0 transition-opacity",
                    isActive ? "text-sidebar-accent-foreground/60" : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
                )}>
                    {formatRelativeTime(chat.updatedAt || chat.createdAt)}
                </span>
            </div>
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
                <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer px-1"
                >
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                        <AmaLogo size={24} />
                    </div>
                    <span className="text-lg font-semibold tracking-tight text-foreground">ama</span>
                </button>

                {projectId && (
                    <>
                        {projectData ? (
                            <div className="mb-6 px-1 space-y-1.5">
                                <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                                    Project
                                </div>
                                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 ring-2 ring-primary/20" />
                                    {projectData.name}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 px-1">
                                <Skeleton className="h-3 w-12 mb-2" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-6">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors pointer-events-none" />
                                <Input
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm bg-sidebar-accent/30 border-sidebar-border/50 focus-visible:bg-sidebar-accent/50 focus-visible:border-sidebar-ring/50 transition-all rounded-lg shadow-none placeholder:text-muted-foreground/50"
                                />
                            </div>
                            <Button
                                onClick={handleNewChat}
                                className="h-9 whitespace-nowrap bg-sidebar-accent/50 text-sidebar-accent-foreground shadow-sm hover:bg-sidebar-accent hover:text-foreground border-sidebar-border/50 px-3"
                                variant="outline"
                                disabled={isCreatingChat}
                            >
                                {isCreatingChat ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                New Chat
                            </Button>
                        </div>
                    </>
                )}

                <SidebarContent className="flex-1 min-h-0 overflow-hidden -mx-2">
                    <ScrollArea className="h-full px-2">
                        {isLoading && projectId ? (
                            <div className="space-y-4 px-2">
                                <div>
                                    <Skeleton className="h-3 w-12 mb-3" />
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-8 w-full rounded-lg" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : projectId && filteredChats.length > 0 ? (
                            <div className="space-y-6 pb-4">
                                {recentChats.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
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
                                        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-3 mb-2">
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
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-sidebar-accent/50 flex items-center justify-center mb-3">
                                    <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-foreground mb-1">No chats yet</p>
                                <p className="text-xs text-muted-foreground">Start a new conversation to get started</p>
                            </div>
                        ) : null}
                    </ScrollArea>
                </SidebarContent>
            </div>
        </Sidebar>
    )
}
