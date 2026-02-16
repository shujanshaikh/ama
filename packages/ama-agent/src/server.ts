import WebSocket from 'ws'
import { read_file } from './tools/read-file'
import { apply_patch } from './tools/apply-patch'
import { DEFAULT_SERVER_URL } from './constant'
import { editFiles } from './tools/edit-file'
import { deleteFile } from './tools/delete-file'
import { grepTool } from './tools/grep'
import { globTool } from './tools/glob'
import { list } from './tools/ls-dir'
import pc from 'picocolors'
import { startHttpServer } from './http'
import { getTokens } from './lib/auth-login'
import { runTerminalCommand } from './tools/runTerminalCommand'
import { connectToUserStreams } from './lib/userStreams'
import { rpcHandlers } from './lib/rpc-handlers'
import { batchTool } from './tools/batch'
import {
  executeTool,
  parseToolCall,
  ValidationError,
  type ToolExecutorFn,
} from './lib/tool-executor'


// Reconnection config
const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 60000
const BACKOFF_MULTIPLIER = 2

let reconnectAttempts = 0

function getReconnectDelay(): number {
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttempts),
    MAX_RECONNECT_DELAY
  )
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1)
  return Math.floor(delay + jitter)
}

interface RpcCall {
  type: 'rpc_call'
  id: string
  method: string
  args: Record<string, any>
}

export const toolExecutors: Record<string, ToolExecutorFn> = {
  editFile: editFiles,
  deleteFile: deleteFile,
  grep: grepTool,
  glob: globTool,
  listDirectory: list,
  readFile: read_file,
  stringReplace: apply_patch,
  runTerminalCommand: runTerminalCommand,
  batch: batchTool,
}

export function getConnectionStatus(ws: WebSocket): 'connecting' | 'open' | 'closing' | 'closed' {
  return ws.readyState === WebSocket.CONNECTING ? 'connecting' :
    ws.readyState === WebSocket.OPEN ? 'open' :
      ws.readyState === WebSocket.CLOSING ? 'closing' : 'closed'
}

export function connectToServer(serverUrl: string = DEFAULT_SERVER_URL) {
  const tokens = getTokens()
  if (!tokens) {
    throw new Error('No tokens found')
  }
  const wsUrl = `${serverUrl}/agent-streams`
  const ws = new WebSocket(wsUrl, {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  })

  ws.on('open', () => {
    reconnectAttempts = 0 // Reset on successful connection
    console.log(pc.cyan('connected to server'))
  })

  ws.on('message', async (data) => {
    let message: any
    try {
      message = JSON.parse(data.toString())
    } catch {
      console.error(pc.red('failed to parse incoming message'))
      return
    }

    if (message.type === 'tool_call') {
      // Validate the tool_call payload with Zod
      const validated = parseToolCall(message)
      if (validated instanceof ValidationError) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id ?? 'unknown',
          error: validated.message,
        }))
        console.error(pc.red(`  validation error: ${validated.message}`))
        return
      }

      console.log(pc.gray(`> ${validated.tool}`))

      // Execute through centralized engine (timeout + envelope)
      const response = await executeTool(
        validated.tool,
        validated.args,
        validated.projectCwd,
        toolExecutors,
      )

      if (response.success) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: validated.id,
          result: response.data,
        }))
      } else {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: validated.id,
          error: response.error?.message ?? 'Unknown error',
        }))
        console.error(pc.red(`  ${validated.tool} failed: ${response.error?.message}`))
      }

      if (response.metadata?.durationMs && response.metadata.durationMs > 5000) {
        console.log(pc.yellow(`  ${validated.tool} took ${response.metadata.durationMs}ms`))
      }

    } else if (message.type === 'rpc_call') {
      console.log(pc.gray(`> rpc: ${message.method}`))

      try {
        const handler = rpcHandlers[message.method]
        if (!handler) {
          throw new Error(`Unknown RPC method: ${message.method}`)
        }

        const result = await handler(message.args)

        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          result,
        }))

      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          error: error.message,
        }))

        console.error(pc.red(`  rpc failed: ${message.method}`))
      }
    }
  })

  ws.on('close', () => {
    const delay = getReconnectDelay()
    reconnectAttempts++
    console.log(pc.gray(`disconnected, reconnecting in ${Math.round(delay / 1000)}s...`))
    setTimeout(() => connectToServer(serverUrl), delay)
  })

  ws.on('error', (error) => {
    console.error(pc.red(`connection error: ${error.message}`))
  })

  return ws
}


export async function main() {
  const serverUrl = DEFAULT_SERVER_URL
  console.log(pc.gray('starting ama...'))
  connectToServer(serverUrl)
  await connectToUserStreams(serverUrl)
  startHttpServer()
}
