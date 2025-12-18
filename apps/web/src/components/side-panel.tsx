import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";
import { AmaLogo } from "./ama-logo";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { MessageSquare, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chat {
    id: string;
    title: string;
    projectId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export function Sidepanel() {
    const params = useParams({ strict: false });
    const projectId = params.projectId as string | undefined;
    const search = useSearch({ strict: false }) as { chat?: string };
    const activeChatId = search?.chat;
    const trpc = useTRPC();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: chatsData, isLoading } = useQuery({
        ...trpc.chat.getChats.queryOptions({ projectId: projectId || "" }),
        enabled: !!projectId,
    });

    const chats: Chat[] = (chatsData as Chat[] | undefined) ?? [];

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

    return (
        <Sidebar
            variant="sidebar"
            side="left"
            className="sp-sidebar overflow-hidden"

        >
            <SidebarRail />
            <SidebarHeader className="sp-header">
                <div className="flex items-center justify-between px-2 py-3 gap-2">
                    <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex-shrink-0" />
                    <div className="flex items-center gap-0">
                        <AmaLogo size={32} />
                        <span className="text-[32px] font-medium leading-[32px] h-[32px] flex items-center">ma</span>
                    </div>
                    <div className="w-8 flex-shrink-0" />
                </div>
            </SidebarHeader>


            <SidebarContent className="sp-content px-2 py-2 overflow-hidden flex flex-col">
                <SidebarGroup>
                    <SidebarGroupContent>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="flex-1 min-h-0 flex flex-col">
                    {projectId && (
                        <div className="flex items-center justify-between px-2 mb-2">
                            <SidebarGroupLabel className="text-xs text-muted-foreground">
                                Chats
                            </SidebarGroupLabel>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleNewChat}
                                disabled={isCreatingChat}
                            >
                                {isCreatingChat ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Plus className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                    )}
                    <SidebarGroupContent className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            {isLoading && projectId ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : projectId && chats.length > 0 ? (
                                <div className="space-y-1">
                                    {chats.map((chat: Chat) => (
                                        <Button
                                            key={chat.id}
                                            variant={activeChatId === chat.id ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal gap-2 h-auto py-2 px-2",
                                                activeChatId === chat.id && "bg-muted"
                                            )}
                                            onClick={() => handleChatClick(chat.id)}
                                        >
                                            <MessageSquare className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{chat.title}</span>
                                        </Button>
                                    ))}
                                </div>
                            ) : projectId ? (
                                <div className="text-sm text-muted-foreground px-2 py-4 text-center">
                                    No chats yet
                                </div>
                            ) : null}
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}