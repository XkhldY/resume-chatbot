/**
 * Advanced Search Component
 * 
 * Comprehensive search interface with filters, facets, date ranges,
 * and multiple search modes (vector, text, hybrid).
 */

'use client'

import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface SearchFilters {
  dateRange: { start: Date | null; end: Date | null }
  documentTypes: string[]
  authors: string[]
  tags: string[]
  searchMode: 'vector' | 'text' | 'hybrid'
}

interface SearchResult {
  id: string
  title: string
  content: string
  filename: string
  relevance_score: number
  document_type: string
  created_at: Date
}

export function AdvancedSearch() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: { start: null, end: null },
    documentTypes: [],
    authors: [],
    tags: [],
    searchMode: 'hybrid'
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [facets, setFacets] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    try {
      // API call to search endpoint
      // const response = await fetch('/api/search', { ... })
      // const data = await response.json()
      // setResults(data.results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSearchFacets = async () => {
    if (!query.trim()) return
    
    try {
      // API call to get facets
      // const response = await fetch(`/api/search/facets?query=${query}`)
      // const data = await response.json()
      // setFacets(data)
    } catch (error) {
      console.error('Failed to load facets:', error)
    }
  }

  useEffect(() => {
    if (query.trim()) {
      loadSearchFacets()
    }
  }, [query])

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Document Search
        </h1>
        
        {/* Search Input */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search documents..."
              className="
                w-full pl-10 pr-4 py-3 
                border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                text-neutral-900
              "
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-4 py-3 rounded-lg flex items-center space-x-2
              ${showFilters 
                ? 'bg-primary-600 text-white' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }
            `}
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
            className="
              px-6 py-3 bg-primary-600 text-white rounded-lg
              hover:bg-primary-700 disabled:opacity-50
              transition-colors duration-200
            "
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 bg-white border border-neutral-200 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 mb-4">Search Filters</h3>
            
            {/* Search Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Search Mode
              </label>
              <select
                value={filters.searchMode}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  searchMode: e.target.value as any
                }))}
                className="w-full p-2 border border-neutral-300 rounded-lg"
              >
                <option value="hybrid">Hybrid (Vector + Text)</option>
                <option value="vector">Vector Similarity</option>
                <option value="text">Text Search</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      start: e.target.value ? new Date(e.target.value) : null
                    }
                  }))}
                  className="w-full p-2 border border-neutral-300 rounded-lg"
                />
                <input
                  type="date"
                  value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      end: e.target.value ? new Date(e.target.value) : null
                    }
                  }))}
                  className="w-full p-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>

            {/* Document Types */}
            {facets.documentTypes && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Document Types
                </label>
                <div className="space-y-2">
                  {facets.documentTypes.map((type: string) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.documentTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              documentTypes: [...prev.documentTypes, type]
                            }))
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              documentTypes: prev.documentTypes.filter(t => t !== type)
                            }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-neutral-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        <div className="flex-1">
          {results.length > 0 && (
            <div className="mb-4 text-sm text-neutral-600">
              Found {results.length} results
            </div>
          )}
          
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900">
                    {result.title}
                  </h3>
                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                    {Math.round(result.relevance_score * 100)}% match
                  </span>
                </div>
                
                <p className="text-neutral-700 mb-3 line-clamp-3">
                  {result.content}
                </p>
                
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>{result.filename}</span>
                  <span>{result.created_at.toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            
            {query && results.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No results found for "{query}"</p>
                <p className="text-sm text-neutral-400 mt-2">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}