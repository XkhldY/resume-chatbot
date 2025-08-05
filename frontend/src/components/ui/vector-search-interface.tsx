'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Input } from './input'
import { vectorSearch, getVectorCollections } from '@/lib/api'
import { VectorSearchQuery, VectorSearchResponse, VectorSearchResult, VectorCollection, VectorSearchInterfaceProps } from '@/types/vector'

const SearchResultCard: React.FC<{
  result: VectorSearchResult
  index: number
}> = ({ result, index }) => {
  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-success-600 bg-success-50'
    if (score >= 0.6) return 'text-warning-600 bg-warning-50'
    return 'text-error-600 bg-error-50'
  }

  const formatSimilarity = (score: number) => {
    return `${(score * 100).toFixed(1)}%`
  }

  const formatDistance = (distance: number) => {
    return distance.toFixed(4)
  }

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-neutral-900 truncate">
                {result.document_info.filename}
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Chunk {result.chunk.metadata.chunk_index + 1}
                {result.chunk.metadata.page_number && ` • Page ${result.chunk.metadata.page_number}`}
                {result.chunk.metadata.section && ` • ${result.chunk.metadata.section}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getSimilarityColor(result.similarity_score)}`}>
              {formatSimilarity(result.similarity_score)}
            </span>
            <span className="text-xs text-neutral-500">
              Distance: {formatDistance(result.distance)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-sm text-neutral-700 leading-relaxed">
            {truncateText(result.document)}
          </div>
          
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center space-x-4">
              <span>{result.chunk.metadata.word_count} words</span>
              <span>{result.chunk.metadata.character_count} chars</span>
            </div>
            <div>
              ID: {result.id.substring(0, 8)}...
            </div>
          </div>

          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="pt-2 border-t border-neutral-100">
              <details className="group">
                <summary className="text-xs font-medium text-neutral-600 cursor-pointer hover:text-neutral-900">
                  View Metadata
                  <span className="ml-1 group-open:rotate-90 transition-transform">▶</span>
                </summary>
                <div className="mt-2 p-2 bg-neutral-50 rounded text-xs font-mono">
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const AdvancedSearchOptions: React.FC<{
  query: VectorSearchQuery
  onQueryChange: (query: VectorSearchQuery) => void
  collections: VectorCollection[]
  isVisible: boolean
}> = ({ query, onQueryChange, collections, isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      <h4 className="text-sm font-medium text-neutral-900">Advanced Options</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Collection
          </label>
          <select
            value={query.collection_name || ''}
            onChange={(e) => onQueryChange({
              ...query,
              collection_name: e.target.value || undefined
            })}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.name}>
                {collection.name} ({collection.document_count} docs)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Number of Results
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={query.n_results || 10}
            onChange={(e) => onQueryChange({
              ...query,
              n_results: parseInt(e.target.value) || 10
            })}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={query.include_metadata !== false}
              onChange={(e) => onQueryChange({
                ...query,
                include_metadata: e.target.checked
              })}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-xs text-neutral-700">Include Metadata</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={query.include_documents !== false}
              onChange={(e) => onQueryChange({
                ...query,
                include_documents: e.target.checked
              })}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-xs text-neutral-700">Include Documents</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={query.include_distances !== false}
              onChange={(e) => onQueryChange({
                ...query,
                include_distances: e.target.checked
              })}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-xs text-neutral-700">Include Distances</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-2">
          Document Filter (JSON)
        </label>
        <textarea
          value={query.where_document ? JSON.stringify(query.where_document, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = e.target.value ? JSON.parse(e.target.value) : undefined
              onQueryChange({
                ...query,
                where_document: parsed
              })
            } catch {
              // Invalid JSON, ignore for now
            }
          }}
          placeholder='{"$contains": "keyword"}'
          rows={3}
          className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-2">
          Metadata Filter (JSON)
        </label>
        <textarea
          value={query.where_metadata ? JSON.stringify(query.where_metadata, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = e.target.value ? JSON.parse(e.target.value) : undefined
              onQueryChange({
                ...query,
                where_metadata: parsed
              })
            } catch {
              // Invalid JSON, ignore for now
            }
          }}
          placeholder='{"page_number": {"$gt": 5}}'
          rows={3}
          className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    </div>
  )
}

export const VectorSearchInterface: React.FC<VectorSearchInterfaceProps> = ({
  defaultCollection,
  maxResults = 10,
  showAdvancedOptions = true,
  onSearchComplete
}) => {
  const [query, setQuery] = useState<VectorSearchQuery>({
    query: '',
    n_results: maxResults,
    collection_name: defaultCollection,
    include_metadata: true,
    include_documents: true,
    include_distances: true
  })
  const [searchResults, setSearchResults] = useState<VectorSearchResponse | null>(null)
  const [collections, setCollections] = useState<VectorCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchCollections = async () => {
    try {
      const collectionsData = await getVectorCollections()
      setCollections(collectionsData.collections)
    } catch (err: any) {
      console.warn('Failed to fetch collections:', err.message)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.query.trim()) {
      setError('Please enter a search query')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const results = await vectorSearch(query)
      setSearchResults(results)
      onSearchComplete?.(results)
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setQuery({
      ...query,
      query: ''
    })
    setSearchResults(null)
    setError(null)
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  const hasResults = searchResults && searchResults.results.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vector Search</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter your search query..."
                value={query.query}
                onChange={(e) => setQuery({ ...query, query: e.target.value })}
                className="flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !query.query.trim()}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </Button>
            </div>

            {showAdvancedOptions && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </Button>
                <AdvancedSearchOptions
                  query={query}
                  onQueryChange={setQuery}
                  collections={collections}
                  isVisible={showAdvanced}
                />
              </div>
            )}
          </form>

          {error && (
            <Alert className="mt-4 border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {searchResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search Results</CardTitle>
              <div className="text-sm text-neutral-600">
                {searchResults.total_results} results in {searchResults.search_time_ms}ms
                {searchResults.collection_name && (
                  <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    {searchResults.collection_name}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasResults ? (
              <div className="space-y-4">
                {searchResults.results.map((result, index) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    index={index}
                  />
                ))}
                
                {searchResults.results.length < searchResults.total_results && (
                  <div className="text-center py-4 border-t border-neutral-200">
                    <p className="text-sm text-neutral-600">
                      Showing {searchResults.results.length} of {searchResults.total_results} results
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Increase "Number of Results" in advanced options to see more
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-600">No results found for "{searchResults.query}"</p>
                <p className="text-sm text-neutral-500 mt-2">
                  Try adjusting your search query or check if documents have been processed for embedding.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}