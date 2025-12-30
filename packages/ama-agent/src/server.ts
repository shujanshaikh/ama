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
    console.log(pc.green('Connected to server agent streams'))
  })

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString()) as ToolCall | RpcCall

    if (message.type === 'tool_call') {
      console.log(`tool call: ${message.tool}${message.projectCwd ? ` (project: ${message.projectCwd})` : ''}`)

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

        console.log(pc.green(`tool call completed: ${message.tool}`))
      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          error: error.message,
        }))

        console.error(pc.red(`tool call failed: ${message.tool} ${error.message}`))
      }
    } else if (message.type === 'rpc_call') {
      console.log(`rpc call: ${message.method}`)

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

        console.log(pc.green(`rpc call completed: ${message.method}`))
      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          error: error.message,
        }))

        console.error(pc.red(`rpc call failed: ${message.method} ${error.message}`))
      }
    }
  })

  ws.on('close', () => {
    console.log(pc.red('disconnected from server. reconnecting in 5s...'))
    setTimeout(() => connectToServer(serverUrl), 5000)
  })

  ws.on('error', (error) => {
    console.error(pc.red(`web socket error: ${error.message}`))
  })

  return ws
}


export async function main() {
  const serverUrl = DEFAULT_SERVER_URL
  console.log(pc.green('starting local amai...'))
  connectToServer(serverUrl)
  await connectToUserStreams(serverUrl)
  startHttpServer()
}


