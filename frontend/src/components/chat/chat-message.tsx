/**
 * Chat Message Component
 * 
 * Individual message display with user/assistant styling,
 * source citations, and interactive elements.
 */

'use client'

import React from 'react'
import { SourceCitations } from './source-citations'
import { formatDistanceToNow } from 'date-fns'

interface MessageProps {
  message: {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
    sources?: DocumentSource[]
  }
  showSources?: boolean
}

interface DocumentSource {
  filename: string
  chunk_text: string
  relevance_score: number
}

export function ChatMessage({ message, showSources }: MessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Content */}
        <div
          className={`
            px-4 py-3 rounded-lg
            ${isUser 
              ? 'bg-primary-600 text-white ml-auto' 
              : 'bg-white border border-neutral-200 text-neutral-900'
            }
          `}
        >
          <div className="prose prose-sm max-w-none">
            {message.content}
          </div>
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-neutral-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>

        {/* Source Citations */}
        {showSources && message.sources && message.sources.length > 0 && (
          <div className="mt-3">
            <SourceCitations sources={message.sources} />
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isUser 
          ? 'bg-primary-100 text-primary-700 order-1 mr-3' 
          : 'bg-neutral-200 text-neutral-700 order-2 ml-3'
      }`}>
        {isUser ? 'U' : 'AI'}
      </div>
    </div>
  )
}