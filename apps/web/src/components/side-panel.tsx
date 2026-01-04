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
import { Loader2, Plus } from "lucide-react";
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
                "w-full text-left px-3 py-1.5 rounded-md transition-colors",
                isActive
                    ? "bg-muted text-foreground"
                    : "hover:bg-muted/50 text-foreground/70"
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        "text-sm truncate",
                        isActive ? "font-medium" : ""
                    )}>
                        {chat.title}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(chat.updatedAt || chat.createdAt)}
                </span>
            </div>
        </button>
    );

    return (
        <Sidebar
            variant="sidebar"
            side="left"
        >
            <SidebarRail />
            <div className="flex flex-col h-full p-4">
                <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="mb-6 flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                >
                    <AmaLogo size={36} />
                    <span className="text-xl font-medium text-foreground">ama</span>
                </button>

                {projectId && (
                    <>
                        {projectData ? (
                            <div className="mb-4">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                    Project
                                </div>
                                <div className="text-sm text-foreground">
                                    {projectData.name}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <Skeleton className="h-4 w-16 mb-1.5" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        )}

                        <div className="flex gap-2 mb-6">
                            <Input
                                placeholder="Search chats"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 text-sm rounded-lg"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 shrink-0"
                                onClick={handleNewChat}
                                disabled={isCreatingChat}
                            >
                                {isCreatingChat ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="text-sm">New</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}

                <SidebarContent className="flex-1 min-h-0 overflow-hidden -mx-2">
                    <ScrollArea className="h-full px-2">
                        {isLoading && projectId ? (
                            <div className="space-y-4">
                                <div>
                                    <Skeleton className="h-3 w-16 mb-2 ml-3" />
                                    <div className="space-y-1">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-8 mx-3 rounded-md" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : projectId && filteredChats.length > 0 ? (
                            <div className="space-y-4">
                                {recentChats.length > 0 && (
                                    <div>
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
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
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
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
