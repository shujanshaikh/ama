import WebSocket from 'ws'
import { read_file } from './tools/read-file'
import { apply_patch } from './tools/apply-patch'


interface ToolCall {
  type: 'tool_call'
  id: string
  tool: string
  args: Record<string, any>
}


const toolExecutors: Record<string, (args: any) => Promise<any>> = {
  
  readFile: read_file,
  stringReplace: apply_patch,
}



export function connectToServer(serverUrl: string) {
  const wsUrl = `${serverUrl}/rpc`
  const ws = new WebSocket(wsUrl)
  
  ws.on('open', () => {
    console.log('Connected to server RPC bridge')
  })
  
  ws.on('message', async (data) => {
    const message: ToolCall = JSON.parse(data.toString())
    
    if (message.type === 'tool_call') {
      console.log(`Executing tool: ${message.tool}`)
      
      try {
        const executor = toolExecutors[message.tool]
        if (!executor) {
          throw new Error(`Unknown tool: ${message.tool}`)
        }
        
        const result = await executor(message.args)
        
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          result,
        }))
        
        console.log(`Tool completed: ${message.tool}`)
      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'tool_result',
          id: message.id,
          error: error.message,
        }))
        
        console.error(`Tool failed: ${message.tool}`, error.message)
      }
    }
  })
  
  ws.on('close', () => {
    console.log('Disconnected from server. Reconnecting in 5s...')
    setTimeout(() => connectToServer(serverUrl), 5000)
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message)
  })
  
  return ws
}

export async function main() {
 const serverUrl = 'ws://localhost:3000'
  console.log('Starting local ama-agent...')
  connectToServer(serverUrl)
}