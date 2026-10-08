import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../services/auth'

export type NewRoomMessageData = {
  roomId: string
  messageId: string
  licenseeId: string
  text?: string | null
  url?: string | null
  fileName?: string | null
  kind?: string
  destination?: string
  createdAt?: string
  sended?: boolean
  contact?: { id: string; name: string } | null
}

export function useChatSocket(
  licenseeId: string | undefined,
  onNewRoomMessage: (data: NewRoomMessageData) => void,
) {
  const callbackRef = useRef(onNewRoomMessage)

  useEffect(() => {
    callbackRef.current = onNewRoomMessage
  })

  useEffect(() => {
    if (!licenseeId) return

    const socket = io({ auth: { token: getToken() } })
    socket.emit('join-licensee', licenseeId)
    socket.on('new-room-message', (data: NewRoomMessageData) => callbackRef.current(data))

    return () => {
      socket.disconnect()
    }
  }, [licenseeId])
}
