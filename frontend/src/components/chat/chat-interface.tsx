/**
 * Chat Interface Component
 * 
 * Main chat interface with message history, input, and real-time messaging.
 * Supports streaming responses, source citations, and conversation management.
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { ConversationSidebar } from './conversation-sidebar'
import { AlertCircleIcon, RefreshCcwIcon } from '@heroicons/react/24/outline'
import { Message, Conversation, StreamingChatResponse } from '@/types/chat'
import { sendMessage, createStreamingChat, getConversation, createConversation, ApiError } from '@/lib/api'

interface ChatInterfaceProps {
  initialConversationId?: string
  onConversationChange?: (conversationId: string) => void
}

export function ChatInterface({ initialConversationId, onConversationChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
      onConversationChange?.(conversationId)
    }
  }, [conversationId, onConversationChange])

  const loadConversation = async (id: string) => {
    try {
      setError(null)
      const conversation = await getConversation(id)
      setCurrentConversation(conversation)
      
      if (conversation.messages) {
        setMessages(conversation.messages)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load conversation')
      setMessages([])
    }
  }

  const handleSendMessage = async (content: string, attachedFiles?: File[]) => {
    if (!content.trim() || isLoading || isStreaming) return

    // Cancel any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setError(null)
    setIsLoading(true)

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      conversationId
    }
    
    setMessages(prev => [...prev, userMessage])

    try {
      // Create conversation if none exists
      let currentConvId = conversationId
      if (!currentConvId) {
        const newConversation = await createConversation(
          content.length > 50 ? content.substring(0, 47) + '...' : content
        )
        currentConvId = newConversation.conversation_id
        setConversationId(currentConvId)
      }

      // Use streaming for better UX
      if (process.env.NEXT_PUBLIC_ENABLE_STREAMING === 'true') {
        await handleStreamingResponse(content, currentConvId!)
      } else {
        await handleRegularResponse(content, currentConvId!)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to send message'
      setError(errorMessage)
      
      // Add error message to chat
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        role: 'assistant',
        timestamp: new Date(),
        conversationId: currentConvId
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreamingResponse = async (message: string, convId: string) => {
    setIsStreaming(true)
    setStreamingMessage('')
    
    const streamingSources: any[] = []
    
    const handleStreamMessage = (response: StreamingChatResponse) => {
      switch (response.type) {
        case 'message':
          if (response.content) {
            setStreamingMessage(prev => prev + response.content)
          }
          break
        case 'source':
          if (response.source) {
            streamingSources.push(response.source)
          }
          break
        case 'done':
          // Finalize the streaming message
          const assistantMessage: Message = {
            id: Date.now().toString(),
            content: streamingMessage,
            role: 'assistant',
            timestamp: new Date(),
            sources: streamingSources,
            conversationId: convId
          }
          setMessages(prev => [...prev, assistantMessage])
          setStreamingMessage('')
          setIsStreaming(false)
          break
        case 'error':
          throw new Error(response.error || 'Streaming error occurred')
      }
    }

    const handleStreamError = (error: Error) => {
      console.error('Streaming error:', error)
      setError(error.message)
      setIsStreaming(false)
      setStreamingMessage('')
    }

    await createStreamingChat(
      { message, conversation_id: convId },
      handleStreamMessage,
      handleStreamError
    )
  }

  const handleRegularResponse = async (message: string, convId: string) => {
    const response = await sendMessage({
      message,
      conversation_id: convId
    })

    const assistantMessage: Message = {
      id: Date.now().toString(),
      content: response.response,
      role: 'assistant',
      timestamp: new Date(),
      sources: response.sources,
      conversationId: convId
    }

    setMessages(prev => [...prev, assistantMessage])
  }

  const handleNewConversation = async () => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    setConversationId(undefined)
    setCurrentConversation(null)
    setMessages([])
    setError(null)
    setIsLoading(false)
    setIsStreaming(false)
    setStreamingMessage('')
    onConversationChange?.('')
  }

  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return
    setConversationId(id)
  }

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages
        .filter(m => m.role === 'user')
        .pop()
      
      if (lastUserMessage) {
        // Remove the last assistant message if it was an error
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === 'assistant' && lastMessage.content.includes('error')) {
            return prev.slice(0, -1)
          }
          return prev
        })
        
        handleSendMessage(lastUserMessage.content)
      }
    }
  }

  return (
    <div className="flex h-screen bg-neutral-light">
      <ConversationSidebar 
        onNewConversation={handleNewConversation}
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Error Banner */}
        {error && (
          <div className="bg-error-50 border-b border-error-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircleIcon className="h-5 w-5 text-error-500 mr-2" />
                <span className="text-error-700 text-sm">{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className="
                  text-error-700 hover:text-error-800 text-sm 
                  flex items-center space-x-1 transition-colors
                "
              >
                <RefreshCcwIcon className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Conversation Header */}
        {currentConversation && (
          <div className="border-b border-neutral-200 px-6 py-3 bg-white">
            <h1 className="text-lg font-semibold text-neutral-900 truncate">
              {currentConversation.title}
            </h1>
            {messages.length > 0 && (
              <p className="text-sm text-neutral-500">
                {messages.length} messages
              </p>
            )}
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="max-w-md">
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-neutral-600">
                  Ask questions about your documents and I'll help you find the information you need.
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage 
              key={message.id}
              message={message}
              showSources={message.role === 'assistant' && !!message.sources}
            />
          ))}

          {/* Streaming Message Display */}
          {isStreaming && streamingMessage && (
            <div className="flex justify-start mb-4">
              <div className="max-w-3xl">
                <div className="bg-white border border-neutral-200 text-neutral-900 px-4 py-3 rounded-lg">
                  <div className="prose prose-sm max-w-none">
                    {streamingMessage}
                    <span className="inline-block w-2 h-5 bg-primary-500 animate-pulse ml-1" />
                  </div>
                </div>
                <div className="text-xs text-neutral-500 mt-1 text-left">
                  AI is typing...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-neutral-200 p-4 bg-white">
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading || isStreaming}
            placeholder="Ask a question about your documents..."
            disabled={!!error}
          />
        </div>
      </div>
    </div>
  )
}