import { useState } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { api } from "@ama/backend/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { MessageSquare, Plus, Loader2, Trash2, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { useStoreValue } from "@simplestack/store/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { forThreadId } from "@/lib/store";
import { CliStatus } from "./cli-status";

export function Sidepanel() {
    const navigate = useNavigate();
    const params = useParams({ strict: false });
    const activeThreadId = params?.threadId;
    const deleteThread = useMutation(api.agent.thread.deleteThread);
    const handleDeleteThread = async (threadId: string) => {
        await deleteThread({ threadId });
    };
    const threads = useQuery(api.agent.thread.listThreads, {
        paginationOpts: {
            endCursor: null,
            numItems: 50,
            cursor: null,
            id: undefined,
            maximumRowsRead: 50,
            maximumBytesRead: 1000000,
        },
    });
    const forkThread = useMutation(api.agent.thread.forkThread);
    const forThreadIdValue = useStoreValue(forThreadId);
    
    const handleForkThread = async (threadId: string, e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (forThreadIdValue) return; 
        
        forThreadId.set(threadId);
        try {
            const newThreadId = await forkThread({ threadId });
            navigate({ 
                to: '/chat/$threadId', 
                params: { threadId: newThreadId },
                replace: false
            });
        } catch (error) {
            console.error("Failed to fork thread:", error);
        } finally {
            forThreadId.set("");
        }
    };

    
    const createThread = useMutation(api.agent.thread.createNewThread);
    const [isCreatingThread, setIsCreatingThread] = useState(false);

    const handleThreadClick = (threadId: string) => {
        console.log('Navigating to thread:', threadId);
        navigate({ 
            to: '/chat/$threadId', 
            params: { threadId },
            replace: false
        }).catch((error) => {
            console.error('Navigation error:', error);
        });
    };

    const handleNewChat = async () => {
        if (isCreatingThread) return;
        
        setIsCreatingThread(true);
        try {
            const newThreadId = await createThread({
                title: "New thread",
            });
            navigate({ 
                to: '/chat/$threadId', 
                params: { threadId: newThreadId },
                replace: false
            });
        } catch (error) {
            console.error("Failed to create thread:", error);
        } finally {
            setIsCreatingThread(false);
        }
    };

    return (
        <Sidebar
            variant="inset"
            side="left"
            className="sp-sidebar overflow-hidden"
        >
            <SidebarRail />
            <SidebarHeader className="sp-header">
                <div className="flex items-center justify-between px-2 py-3 gap-2">
                    <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-muted transition-colors flex-shrink-0" />
                    <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight flex-1 text-center">
                        <Link to="/">
                          <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                            ama
                          </span>
                        </Link>
                    </h1>
                    <div className="w-8 flex-shrink-0" />
                </div>
            </SidebarHeader>
  
        
            <SidebarContent className="sp-content px-2 py-2 overflow-hidden flex flex-col">
            <SidebarSeparator />
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {/* Navigation items - uncomment when routes are created
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="rounded-md justify-center text-center bg-sidebar-accent/50 hover:bg-sidebar-accent" tooltip="Text to Image" data-active={pathname === "/generate"}>
                                    <Link to="/generate">
                                        <span>Generate Images</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="rounded-md justify-center text-center bg-sidebar-accent/50 hover:bg-sidebar-accent" tooltip="Image to Image" data-active={pathname === "/gallery"}>
                                    <Link to="/gallery">
                                        <span>Gallery</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            */}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                
                <SidebarSeparator />
                <SidebarGroup className="flex-1 min-h-0 flex flex-col">
                    <div className="flex flex-col px-2 py-1.5 gap-2 pb-4">
                        <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
                            Threads
                        </SidebarGroupLabel>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleNewChat}
                            disabled={isCreatingThread}
                            className="h-7 rounded-md w-full justify-center bg-gradient-to-r from-primary/20 via-primary/30 to-accent/20 hover:from-primary/30 hover:via-primary/40 hover:to-accent/30"
                            title="New Thread"
                        >
                            {isCreatingThread ? (
                                <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    <span>New Thread</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="h-3 w-3 mr-1.5" />
                                    <span>New Thread</span>
                                </>
                            )}
                        </Button>
                    </div>
                    <SidebarGroupContent className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            {threads === undefined ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : threads?.page.length === 0 ? (
                                <div className="px-2 py-4 text-center">
                                    <p className="text-sm text-muted-foreground">No threads yet</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleNewChat}
                                        disabled={isCreatingThread}
                                        className="mt-2"
                                    >
                                        {isCreatingThread ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                            <Plus className="h-3 w-3 mr-1" />
                                        )}
                                        New Chat
                                    </Button>
                                </div>
                            ) : (
                                <SidebarMenu className="space-y-1">
                                    {threads.page.map((thread) => {
                                        const isActive = activeThreadId === thread._id;
                                        const displayText = thread.title || "Untitled Chat";
                                        return (
                                            <SidebarMenuItem key={thread._id}>
                                                <SidebarMenuButton
                                                    onClick={() => handleThreadClick(thread._id)}
                                                    asChild={false}
                                                    className={cn(
                                                        "rounded-md justify-start h-auto py-2.5 pr-3 pl-3 group/item relative w-full",
                                                        isActive && "bg-primary/10 text-primary font-medium"
                                                    )}
                                                    tooltip={displayText}
                                                >
                                                    <div
                                                        onClick={(e) => {
                                                            handleForkThread(thread._id, e);
                                                        }}
                                                        className="flex h-6 w-0 items-center justify-center rounded transition-all duration-200 ease-out opacity-0 scale-95 -translate-x-1 group-hover/item:opacity-100 group-hover/item:scale-100 group-hover/item:translate-x-0 group-hover/item:w-6 group-hover/item:mr-1 overflow-hidden text-muted-foreground cursor-pointer z-10 hover:bg-primary/10 hover:text-primary flex-shrink-0"
                                                        title="Fork thread"
                                                        aria-label="Fork thread"
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                handleForkThread(thread._id, e);
                                                            }
                                                        }}
                                                    >
                                                        {forThreadIdValue === thread._id ? (
                                                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                                                        ) : (
                                                            <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    {!isActive && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteThread(thread._id);
                                                            }}
                                                            className="flex h-6 w-0 items-center justify-center rounded transition-all duration-200 ease-out opacity-0 scale-95 -translate-x-1 group-hover/item:opacity-100 group-hover/item:scale-100 group-hover/item:translate-x-0 group-hover/item:w-6 group-hover/item:mr-2 overflow-hidden text-muted-foreground cursor-pointer z-10 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                                            title="Delete thread"
                                                            aria-label="Delete thread"
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === " ") {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDeleteThread(thread._id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                                                        </div>
                                                    )}
                                                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                                                    <span className="truncate text-sm flex-1 text-left">
                                                        {displayText}
                                                    </span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            )}
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
               
                <SidebarSeparator />
                
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2">
                        CLI Agent
                    </SidebarGroupLabel>
                    <CliStatus />
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {/* Settings button - uncomment when route is created
                <Button asChild className="rounded-md" variant="outline" data-active={pathname === "/setting"}>
                    <Link to="/setting">
                        <span>Settings</span>
                    </Link>
                </Button>
                */}
            </SidebarFooter>
        </Sidebar>
    )
}