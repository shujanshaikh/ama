
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "./ui/scroll-area";
import { AmaLogo } from "./ama-logo";

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
                    <SidebarGroupContent className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}