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
  if (!wsConnection) {
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

export const createSnapshot = async (token: string, projectId: string): Promise<string | null> => {
  const wsConnection = agentStreams.get(token)
  if (!wsConnection) {
    console.warn("No WebSocket connection found for snapshot creation")
    return null
  }

  const callId = crypto.randomUUID()
  wsConnection.send(JSON.stringify({
    type: "rpc_call",
    id: callId,
    method: "daemon:snapshot_track",
    args: { projectId },
  }))

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingToolCalls.delete(callId)
      console.warn("Snapshot creation timed out")
      resolve(null)
    }, 10000)

    pendingToolCalls.set(callId, {
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(result?.hash || null)
      },
      reject: () => {
        clearTimeout(timeout)
        resolve(null)
      },
    })
  })
}

export const restoreSnapshot = async (projectId: string, snapshotHash: string): Promise<boolean> => {
  const [token] = agentStreams.keys()
  if (!token) {
    console.error("No daemon connection available for restore")
    return false
  }

  const wsConnection = agentStreams.get(token)
  if (!wsConnection) {
    console.error("No WebSocket connection found for restore")
    return false
  }

  const callId = crypto.randomUUID()
  wsConnection.send(JSON.stringify({
    type: "rpc_call",
    id: callId,
    method: "daemon:snapshot_restore",
    args: { projectId, snapshot: snapshotHash },
  }))

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingToolCalls.delete(callId)
      console.error("Snapshot restore timed out")
      resolve(false)
    }, 30000)

    pendingToolCalls.set(callId, {
      resolve: (result) => {
        clearTimeout(timeout)
        console.log("[snapshot] Restore result:", result)
        resolve(result?.success === true)
      },
      reject: (error) => {
        clearTimeout(timeout)
        console.error("[snapshot] Restore failed:", error)
        resolve(false)
      },
    })
  })
}