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

interface ToolCall {
  type: 'tool_call'
  id: string
  tool: string
  args: Record<string, any>
  projectId?: string
  projectCwd?: string
}

interface RpcCall {
  type: 'rpc_call'
  id: string
  method: string
  args: Record<string, any>
}


const toolExecutors: Record<string, (args: any, projectCwd?: string) => Promise<any>> = {
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
    const message = JSON.parse(data.toString()) as ToolCall | RpcCall

    if (message.type === 'tool_call') {
      console.log(pc.gray(`> ${message.tool}`))

      try {
        const executor = toolExecutors[message.tool]
        if (!executor) {
          throw new Error(`Unknown tool: ${message.tool}`)
        }

        const result = await executor(message.args, message.projectCwd)

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

        console.error(pc.red(`  ${message.tool} failed: ${error.message}`))
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


