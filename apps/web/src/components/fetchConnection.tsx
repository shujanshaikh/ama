import { useState, useEffect } from "react"
import { Terminal, AlertTriangle } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

export function FetchConnection() {
	const [open, setOpen] = useState(true)
	const [connected, setConnected] = useState(false)

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;

		let eventSource: EventSource | null = null;

		const createSSEFromFetch = async () => {
			try {
				const response = await fetch('http://localhost:3456/daemon/status/stream', {
					method: 'POST',
					headers: {
						'Accept': 'text/event-stream',
					},
					signal,
				});

				if (!response.body) {
					throw new Error('No response body for SSE');
				}

				const reader = response.body.getReader();
				let buffer = '';

				const read = async () => {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						const chunk = new TextDecoder().decode(value);
						buffer += chunk;

						let split;
						while ((split = buffer.indexOf('\n\n')) !== -1) {
							const eventChunk = buffer.slice(0, split).trim();
							buffer = buffer.slice(split + 2);

							if (eventChunk.startsWith('data:')) {
								try {
									const jsonString = eventChunk.replace(/^data:\s*/, '');
									const { connected: isConnected } = JSON.parse(jsonString);
									setConnected(isConnected);

									// Auto-close dialog when connected
									if (isConnected) {
										setOpen(false);
									}
								} catch (error) {
									console.error('Failed to parse EventSource message:', error);
								}
							}
						}
					}
				};
				read();
			} catch (error) {
				console.error('SSE fetch error:', error);
			}
		};

		createSSEFromFetch();

		return () => {
			controller.abort();
		};
	}, []);

	// Don't render anything if connected
	if (connected) {
		return null
	}



	return (
		<>
			<div className="absolute inset-x-0 top-0 z-40">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="group flex w-full items-center justify-center gap-2.5 border-b border-amber-500/20 bg-amber-500/5 backdrop-blur-sm px-4 py-2 text-xs text-amber-200/80 hover:bg-amber-500/10 hover:text-amber-100 transition-all duration-200"
				>
					<AlertTriangle className="h-3 w-3 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
					<span className="font-medium tracking-wide">
						CLI disconnected
					</span>
					<span className="text-amber-200/50 hidden sm:inline">
						—
					</span>
					<span className="text-amber-200/50 hidden sm:inline">
						run <code className="font-mono text-amber-200/70 group-hover:text-amber-100 transition-colors">ama</code> to connect
					</span>
				</button>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="max-w-xs border-border/50 bg-card/95 backdrop-blur-md p-0 gap-0 overflow-hidden"
				>
					<DialogHeader className="p-5 pb-4">
						<DialogTitle className="flex items-center gap-3 text-sm font-medium tracking-tight">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
								<AlertTriangle className="h-3 w-3 text-amber-400" />
							</span>
							Connect your CLI
						</DialogTitle>
					</DialogHeader>

					<div className="px-5 pb-5 space-y-4">
						<p className="text-xs text-muted-foreground leading-relaxed">
							Start the CLI to connect your local environment.
						</p>

						<div className="group relative">
							<div className="absolute inset-0 rounded-md from-muted/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
							<div className="relative flex items-center gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2.5">
								<Terminal className="h-3.5 w-3.5 text-muted-foreground" />
								<code className="text-xs font-mono text-foreground tracking-wide">ama</code>
							</div>
						</div>

						<p className="text-[11px] text-muted-foreground/70 leading-relaxed">
							Run in your project root. This dialog will close automatically.
						</p>
					</div>

					<div className="h-px from-transparent via-border/50 to-transparent" />

					<button
						onClick={() => setOpen(false)}
						className="w-full py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
					>
						Dismiss
					</button>
				</DialogContent>
			</Dialog>
		</>
	)
}
