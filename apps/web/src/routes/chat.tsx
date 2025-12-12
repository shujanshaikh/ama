import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/chat')({
  component: ChatDefault,
})

function ChatDefault() {
  const location = useLocation();
  const hasThreadId = location.pathname !== '/chat';
  
  if (hasThreadId) {
    return <Outlet />;
  }
  
  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Select a chat to start...</p>
          </div>
        </div>
      </div>
    </div>
  );
}




