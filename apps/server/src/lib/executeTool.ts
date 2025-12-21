import { agentStreams } from "../index"
import { getToken, getProjectInfo } from "./context"

export const pendingToolCalls = new Map<string, {
    resolve: (result: any) => void
    reject: (error: Error) => void
}>()


export const executeTool = async (
  toolName: string, 
  inputParameters: Object
) => {
   const token = getToken()
   const { projectId, projectCwd } = getProjectInfo()
   const wsConnection = agentStreams.get(token)
   if(!wsConnection) {
    throw new Error("No WebSocket connection found");
   }
   const callId = crypto.randomUUID()
   wsConnection.send(JSON.stringify({
    type: "tool_call",
    id: callId,
    tool: toolName,
    args: inputParameters,
    projectId,
    projectCwd,
   }))

   return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingToolCalls.delete(callId)
      reject(new Error(`Tool call timed out: ${toolName}`))
    }, 60000) // 60s timeout
    
    pendingToolCalls.set(callId, {
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(result)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })
  })
}