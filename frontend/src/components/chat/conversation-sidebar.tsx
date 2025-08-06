/**
 * Conversation Sidebar Component
 * 
 * Enhanced sidebar for managing conversations, creating new chats,
 * searching conversation history, and navigating between conversations.
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  PlusIcon, 
  ChatBubbleLeftIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Conversation, SearchFilters } from '@/types/chat'
import { getConversations, deleteConversation, ApiError } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

interface ConversationSidebarProps {
  onNewConversation: () => void
  currentConversationId?: string
  onSelectConversation?: (conversationId: string) => void
  userId?: string
}

export function ConversationSidebar({ 
  onNewConversation, 
  currentConversationId,
  onSelectConversation,
  userId
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  
  // Pagination
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Load conversations on mount and when userId changes
  useEffect(() => {
    loadConversations(true)
  }, [userId])

  // Filter conversations based on search query and filters
  useEffect(() => {
    let filtered = [...conversations]
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
      )
    }
    
    if (filters.dateRange) {
      filtered = filtered.filter(conv => 
        conv.updatedAt >= filters.dateRange!.start && 
        conv.updatedAt <= filters.dateRange!.end
      )
    }
    
    // Sort by most recent
    filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    
    setFilteredConversations(filtered)
  }, [conversations, searchQuery, filters])

  const loadConversations = useCallback(async (reset: boolean = false) => {
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const currentPage = reset ? 1 : page
      const response = await getConversations(userId, 50)
      
      if (reset) {
        setConversations(response.conversations)
        setPage(1)
      } else {
        setConversations(prev => [...prev, ...response.conversations])
        setPage(currentPage + 1)
      }
      
      setTotal(response.total)
      setHasMore(response.conversations.length === 50)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, page, userId])

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return
    }
    
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      
      // If deleting current conversation, create a new one
      if (currentConversationId === conversationId) {
        onNewConversation()
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to delete conversation')
    }
  }

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadConversations(false)
    }
  }

  const handleRefresh = () => {
    loadConversations(true)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowSearch(false)
  }

  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true })
    }
    
    if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const conversationGroups = useMemo(() => {
    const groups: { [key: string]: Conversation[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Older': []
    }
    
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    filteredConversations.forEach(conv => {
      if (conv.updatedAt.toDateString() === now.toDateString()) {
        groups['Today'].push(conv)
      } else if (conv.updatedAt.toDateString() === yesterday.toDateString()) {
        groups['Yesterday'].push(conv)
      } else if (conv.updatedAt > weekAgo) {
        groups['This Week'].push(conv)
      } else {
        groups['Older'].push(conv)
      }
    })
    
    return Object.entries(groups).filter(([, convs]) => convs.length > 0)
  }, [filteredConversations])

  if (isCollapsed) {
    return (
      <div className="w-16 bg-neutral-900 flex flex-col items-center py-4 border-r border-neutral-700">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
        
        <button
          onClick={onNewConversation}
          className="mt-4 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          title="New conversation"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-neutral-900 text-white flex flex-col border-r border-neutral-700">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors rounded"
              title="Search conversations"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors rounded"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="
                w-full px-3 py-2 pl-9 pr-9
                bg-neutral-800 border border-neutral-700 rounded-lg
                text-white placeholder-neutral-400
                focus:border-primary-500 focus:ring-1 focus:ring-primary-500
              "
              autoFocus
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        
        <button
          onClick={onNewConversation}
          className="
            w-full px-3 py-2 
            bg-primary-600 hover:bg-primary-700
            rounded-lg flex items-center justify-center space-x-2
            transition-colors duration-200
          "
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Conversation</span>
        </button>
        
        {total > 0 && (
          <p className="text-xs text-neutral-400 mt-2 text-center">
            {filteredConversations.length} of {total} conversations
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-900/50 border-b border-red-800">
          <p className="text-red-200 text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-red-300 hover:text-red-100 text-xs mt-1 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-4 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-neutral-300 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-neutral-400 text-sm">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-neutral-400">
            <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            {searchQuery ? (
              <>
                <p>No conversations found</p>
                <p className="text-sm">Try a different search term</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary-400 hover:text-primary-300 text-sm mt-2 underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to begin</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {conversationGroups.map(([groupName, groupConversations]) => (
              <div key={groupName} className="mb-4">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide px-3 mb-2">
                  {groupName}
                </h3>
                <div className="space-y-1">
                  {groupConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`
                        group relative p-3 rounded-lg cursor-pointer transition-all duration-200
                        ${currentConversationId === conversation.id 
                          ? 'bg-primary-600 shadow-lg' 
                          : 'hover:bg-neutral-800'
                        }
                      `}
                      onClick={() => onSelectConversation?.(conversation.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm">
                            {conversation.title}
                          </h4>
                          {conversation.lastMessage && (
                            <p className="text-xs text-neutral-400 truncate mt-1 leading-tight">
                              {conversation.lastMessage}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-neutral-500">
                              {formatDate(conversation.updatedAt)}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {conversation.messageCount} msgs
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          className="
                            opacity-0 group-hover:opacity-100 transition-opacity
                            p-1.5 text-neutral-400 hover:text-red-400
                            ml-2 rounded
                          "
                          title="Delete conversation"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-3 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="
                    text-sm text-neutral-400 hover:text-white 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  {isLoading ? 'Loading...' : 'Load more conversations'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}