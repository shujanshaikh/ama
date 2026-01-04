import { useState, useEffect } from "react"
import { Terminal, AlertTriangle, Copy, Check, Download } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useUserStreamContextOptional } from "@/components/user-stream-provider"

const CURL_SCRIPT = "curl -fsSL https://ama.shujan.xyz/install.sh | bash"

export function FetchConnection() {
	const [open, setOpen] = useState(true)
	const [copiedRun, setCopiedRun] = useState(false)
	const [copiedCurl, setCopiedCurl] = useState(false)
	const userStream = useUserStreamContextOptional()

	const cliConnected = userStream?.cliConnected ?? false
	const wsStatus = userStream?.status ?? 'disconnected'

	useEffect(() => {
		if (cliConnected) {
			setOpen(false)
		}
	}, [cliConnected])

	const copyToClipboard = async (text: string, type: 'run' | 'curl') => {
		await navigator.clipboard.writeText(text)
		if (type === 'run') {
			setCopiedRun(true)
			setTimeout(() => setCopiedRun(false), 2000)
		} else {
			setCopiedCurl(true)
			setTimeout(() => setCopiedCurl(false), 2000)
		}
	}

	if (cliConnected) {
		return null
	}

	const isConnecting = wsStatus === 'connecting'

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
						{isConnecting ? 'Connecting...' : 'CLI disconnected'}
					</span>
					<span className="text-amber-200/50 hidden sm:inline">
						—
					</span>
					<span className="text-amber-200/50 hidden sm:inline">
						run <code className="font-mono text-amber-200/70 group-hover:text-amber-100 transition-colors">amai</code> to connect
					</span>
				</button>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="max-w-sm border-border/50 bg-card/95 backdrop-blur-md p-0 gap-0 overflow-hidden"
				>
					<DialogHeader className="p-5 pb-4">
						<DialogTitle className="flex items-center gap-3 text-sm font-medium tracking-tight">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
								<AlertTriangle className="h-3 w-3 text-amber-400" />
							</span>
							Connect your CLI
						</DialogTitle>
					</DialogHeader>

					<div className="px-5 pb-5 space-y-5">
						{/* Run Command Section */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Terminal className="h-3 w-3 text-muted-foreground" />
								<span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
									Run in your project
								</span>
							</div>
							<button
								type="button"
								onClick={() => copyToClipboard('amai', 'run')}
								className="group relative w-full flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 hover:bg-muted/50 hover:border-border transition-all duration-200"
							>
								<code className="text-xs font-mono text-foreground tracking-wide">amai</code>
								<span className="flex items-center gap-1.5 text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
									{copiedRun ? (
										<>
											<Check className="h-3 w-3 text-emerald-400" />
											<span className="text-emerald-400">Copied!</span>
										</>
									) : (
										<>
											<Copy className="h-3 w-3" />
											<span>Copy</span>
										</>
									)}
								</span>
							</button>
						</div>

						<div className="flex items-center gap-3">
							<div className="h-px flex-1 bg-border/30" />
							<span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">or</span>
							<div className="h-px flex-1 bg-border/30" />
						</div>

						{/* Install Script Section */}
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Download className="h-3 w-3 text-muted-foreground" />
								<span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
									Install the CLI first
								</span>
							</div>
							<button
								type="button"
								onClick={() => copyToClipboard(CURL_SCRIPT, 'curl')}
								className="group relative w-full flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 hover:bg-muted/50 hover:border-border transition-all duration-200"
							>
								<code className="text-[11px] font-mono text-foreground/80 tracking-wide truncate">
									{CURL_SCRIPT}
								</code>
								<span className="flex items-center gap-1.5 text-[10px] text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
									{copiedCurl ? (
										<>
											<Check className="h-3 w-3 text-emerald-400" />
											<span className="text-emerald-400">Copied!</span>
										</>
									) : (
										<>
											<Copy className="h-3 w-3" />
											<span>Copy</span>
										</>
									)}
								</span>
							</button>
							<p className="text-[10px] text-muted-foreground/60 leading-relaxed">
								Then run <code className="font-mono text-muted-foreground">amai</code> in your project root.
							</p>
						</div>

						<p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center pt-1">
							This dialog will close automatically once connected.
						</p>
					</div>

					<div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

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
