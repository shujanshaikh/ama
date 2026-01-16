import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarRail,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";
import { AmaLogo } from "./ama-logo";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { SearchIcon } from "lucide-react";

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

    if (seconds < 60) return "now";
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
                "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 group flex items-center gap-2",
                isActive
                    ? "bg-primary-foreground text-foreground"
                    : "text-foreground/80 hover:text-foreground"
            )}
        >
            <span className={cn(
                "flex-1 text-[13px] truncate",
                isActive ? "font-medium" : "font-normal"
            )}>
                {chat.title}
            </span>
            <span className="text-[10px] text-foreground/40 tabular-nums shrink-0">
                {formatRelativeTime(chat.updatedAt || chat.createdAt)}
            </span>
        </button>
    );

    return (
        <Sidebar
            variant="sidebar"
            side="left"
            className="bg-background border-r"
        >
            <SidebarRail />
            <div className="flex flex-col h-full p-4">
                <button
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="flex items-center gap-1.5 mb-6 hover:opacity-70 transition-opacity"
                >
                    <AmaLogo size={24} />
                    <span className="text-base font-semibold text-foreground tracking-tight">ama</span>
                </button>

                {projectId && (
                    <>
                        {projectData ? (
                            <div className="mb-4">
                                <span className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider">
                                    {projectData.name}
                                </span>
                            </div>
                        ) : (
                            <Skeleton className="h-4 w-20 mb-4" />
                        )}
                        <div className="flex items-center gap-2 mb-5">
                            <div className="flex-1 relative">
                                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 opacity-50 pointer-events-none" />
                                <Input
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 w-full rounded-lg text-[13px] pl-8 pr-2.5 bg-background border border-border placeholder:text-foreground/25 focus:bg-background focus:border-primary transition-colors duration-150"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleNewChat}
                                disabled={isCreatingChat}
                                size="default"
                                className="h-8 rounded-lg px-3"
                            >
                                {isCreatingChat ? "..." : "New Chat"}
                            </Button>
                        </div>
                    </>
                )}

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
                                        <div className="text-[10px] font-medium text-foreground/25 uppercase tracking-widest px-3 mb-1.5">
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
                                        <div className="text-[10px] font-medium text-foreground/25 uppercase tracking-widest px-3 mb-1.5">
                                            Previous
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
                            <div className="text-center py-12">
                                <p className="text-[13px] text-foreground/30">No chats yet</p>
                            </div>
                        ) : null}
                    </ScrollArea>
                </SidebarContent>
                <SidebarFooter>
                   
                </SidebarFooter>
            </div>
        </Sidebar>
    )
}
