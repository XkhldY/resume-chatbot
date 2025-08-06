/**
 * Chat Input Component
 * 
 * Enhanced message input field with send button, typing indicators,
 * keyboard shortcuts, auto-complete, and file attachment support.
 */

'use client'

import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { CommandIcon } from '@heroicons/react/20/solid'

interface ChatInputProps {
  onSendMessage: (message: string, attachedFiles?: File[]) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  suggestions?: string[]
  onTyping?: (isTyping: boolean) => void
}

interface Suggestion {
  text: string
  type: 'command' | 'document' | 'suggestion'
}

const COMMON_SUGGESTIONS: Suggestion[] = [
  { text: 'Summarize the main points from', type: 'command' },
  { text: 'What does this document say about', type: 'command' },
  { text: 'Find information related to', type: 'command' },
  { text: 'Compare the information between', type: 'command' },
  { text: 'List the key findings from', type: 'command' },
  { text: 'Explain the concept of', type: 'command' }
]

export function ChatInput({ 
  onSendMessage, 
  isLoading = false, 
  placeholder = "Type a message...",
  disabled = false,
  suggestions = [],
  onTyping
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [isTypingTimeout, setIsTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Handle typing indicator
  const handleTypingIndicator = useCallback((typing: boolean) => {
    if (onTyping) {
      onTyping(typing)
      
      if (typing) {
        // Clear existing timeout
        if (isTypingTimeout) {
          clearTimeout(isTypingTimeout)
        }
        
        // Set new timeout to stop typing indicator
        const timeout = setTimeout(() => {
          onTyping(false)
        }, 3000)
        
        setIsTypingTimeout(timeout)
      }
    }
  }, [onTyping, isTypingTimeout])

  // Auto-complete logic
  useEffect(() => {
    const words = message.toLowerCase().split(' ')
    const currentWord = words[words.length - 1]
    
    if (currentWord.length > 0) {
      const filtered = COMMON_SUGGESTIONS.filter(suggestion =>
        suggestion.text.toLowerCase().includes(currentWord)
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
      setSelectedSuggestion(0)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }, [message])

  // Focus management for suggestions
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedSuggestion] as HTMLElement
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedSuggestion, showSuggestions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim(), attachedFiles.length > 0 ? attachedFiles : undefined)
      setMessage('')
      setAttachedFiles([])
      setShowSuggestions(false)
      handleTypingIndicator(false)
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestion(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          )
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedSuggestion(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'Tab':
        case 'Enter':
          if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault()
            const selectedSug = filteredSuggestions[selectedSuggestion]
            if (selectedSug) {
              const words = message.split(' ')
              words[words.length - 1] = selectedSug.text
              setMessage(words.join(' ') + ' ')
              setShowSuggestions(false)
            }
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          break
      }
    } else {
      // Standard keyboard shortcuts
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e as any)
      } else if (e.key === 'Enter' && e.shiftKey) {
        // Allow line break
        return
      }
      
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShowSuggestions(true)
        setFilteredSuggestions(COMMON_SUGGESTIONS)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value
    setMessage(newMessage)
    
    // Handle typing indicator
    if (newMessage.length > 0) {
      handleTypingIndicator(true)
    } else {
      handleTypingIndicator(false)
    }
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 10MB)`)
        return false
      }
      
      // Only allow certain file types
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported`)
        return false
      }
      
      return true
    })
    
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5)) // Max 5 files
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const applySuggestion = (suggestion: Suggestion) => {
    const words = message.split(' ')
    words[words.length - 1] = suggestion.text
    setMessage(words.join(' ') + ' ')
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10"
        >
          <div className="p-2 border-b border-neutral-100 flex items-center text-xs text-neutral-500">
            <CommandIcon className="h-3 w-3 mr-1" />
            Use Tab or Enter to select, Esc to cancel
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={`
                w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors
                ${index === selectedSuggestion ? 'bg-primary-50 text-primary-700' : 'text-neutral-700'}
              `}
              onClick={() => applySuggestion(suggestion)}
            >
              <div className="flex items-center">
                <span className={`
                  text-xs px-2 py-1 rounded mr-2
                  ${suggestion.type === 'command' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'}
                `}>
                  {suggestion.type}
                </span>
                {suggestion.text}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center bg-neutral-100 rounded-lg px-3 py-2 text-sm">
              <DocumentIcon className="h-4 w-4 mr-2 text-neutral-500" />
              <span className="text-neutral-700 truncate max-w-32">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-2 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat is disabled" : placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className="
              w-full px-4 py-3 pr-12
              border border-neutral-300 rounded-lg 
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none overflow-hidden
              text-neutral-900 placeholder-neutral-500
            "
            maxLength={1000}
          />
          
          {/* Character count indicator */}
          {message.length > 500 && (
            <div className={`absolute bottom-1 right-14 text-xs ${
              message.length > 900 ? 'text-warning-600' : 'text-neutral-400'
            }`}>
              {message.length}/1000
            </div>
          )}

          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || disabled || attachedFiles.length >= 5}
            className="
              absolute bottom-2 right-2 p-2 
              text-neutral-400 hover:text-neutral-600
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-colors rounded
            "
            title="Attach file (max 5 files, 10MB each)"
          >
            <PaperClipIcon className="h-4 w-4" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className="
            px-4 py-3 
            bg-primary-600 text-white rounded-lg
            hover:bg-primary-700 focus:ring-2 focus:ring-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            flex items-center justify-center
          "
          title="Send message (Enter) or Shift+Enter for new line"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <PaperAirplaneIcon className="h-4 w-4" />
          )}
          <span className="sr-only">Send message</span>
        </button>
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.pdf,.doc,.docx,.md"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-2">
        <div className="flex items-center space-x-4">
          <span>Enter to send, Shift+Enter for new line</span>
          <span>Cmd+/ for suggestions</span>
        </div>
        {attachedFiles.length > 0 && (
          <span>{attachedFiles.length}/5 files attached</span>
        )}
      </div>
    </div>
  )
}