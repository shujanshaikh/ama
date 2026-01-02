import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export function CollapsedSidebarTrigger() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <div className="absolute top-3 left-3 z-20">
      <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        className="rounded-md hover:bg-muted transition-colors shrink-0"
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
        <span className="sr-only">{state === "expanded" ? "Close Sidebar" : "Open Sidebar"}</span>
      </Button>
    </div>
  );
}

