import { Realtime } from 'appwrite'
import { isMpWeixinRuntime } from '@/utils/appwrite'
import sdkClient from '@/utils/appwrite-sdk'
import {
  CONVERSATION_MEMBERS_TABLE_ID,
  CONVERSATIONS_TABLE_ID,
  MESSAGES_TABLE_ID,
  MINDGUARD_DATABASE_ID
} from '@/utils/appwrite-shared'

export const isRealtimeSupported = !isMpWeixinRuntime

export function createRealtimeClient() {
  if (!isRealtimeSupported) {
    return null
  }
  return new Realtime(sdkClient)
}

export function messagesChannel() {
  return tableRowsChannel(MESSAGES_TABLE_ID)
}

export function conversationsChannel() {
  return tableRowsChannel(CONVERSATIONS_TABLE_ID)
}

export function conversationMembersChannel() {
  return tableRowsChannel(CONVERSATION_MEMBERS_TABLE_ID)
}

function tableRowsChannel(tableId: string) {
  return `tablesdb.${MINDGUARD_DATABASE_ID}.tables.${String(tableId || '').trim()}.rows`
}
