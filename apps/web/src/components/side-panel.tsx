
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";
import { Link } from "@tanstack/react-router";

export function Sidepanel() {
 
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
                    </SidebarGroupContent>
                </SidebarGroup>
                
                <SidebarSeparator />
                <SidebarGroup className="flex-1 min-h-0 flex flex-col">
                    <SidebarGroupContent className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
               
                <SidebarSeparator />
            </SidebarContent>
        </Sidebar>
    )
}