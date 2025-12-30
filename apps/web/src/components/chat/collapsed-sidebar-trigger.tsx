import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export function CollapsedSidebarTrigger() {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-10">
      <Button
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon-sm"
        className="rounded-md hover:bg-muted transition-colors shrink-0"
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    </div>
  );
}

