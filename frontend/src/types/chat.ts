export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  sources?: DocumentSource[]
  conversationId?: string
}

export interface DocumentSource {
  filename: string
  chunk_text: string
  relevance_score: number
  document_id?: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  updatedAt: Date
  createdAt: Date
  messageCount: number
  userId?: string
  messages?: Message[]
}

export interface ChatRequest {
  message: string
  conversation_id?: string
}

export interface ChatResponse {
  response: string
  sources: DocumentSource[]
  conversation_id: string
}

export interface ConversationListResponse {
  conversations: Conversation[]
  total: number
}

export interface StreamingChatResponse {
  type: 'message' | 'source' | 'done' | 'error'
  content?: string
  source?: DocumentSource
  error?: string
}

export interface TypingIndicator {
  isTyping: boolean
  userId?: string
  conversationId: string
}

export interface ChatState {
  messages: Message[]
  currentConversationId?: string
  isLoading: boolean
  isTyping: boolean
  error?: string
}

export interface SearchFilters {
  query?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sourceDocuments?: string[]
}