'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Input } from './input'
import { Progress } from './progress'
import { 
  testEmbedding, 
  testSimilarity, 
  runVectorBenchmark, 
  vectorSearch 
} from '@/lib/api'
import { 
  EmbeddingTestRequest, 
  EmbeddingTestResponse, 
  VectorSimilarityTest, 
  VectorBenchmarkResult,
  VectorTestingPanelProps 
} from '@/types/vector'

const EmbeddingTestCard: React.FC<{
  defaultText?: string
}> = ({ defaultText = '' }) => {
  const [testText, setTestText] = useState(defaultText)
  const [result, setResult] = useState<EmbeddingTestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!testText.trim()) {
      setError('Please enter text to test')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await testEmbedding({ text: testText })
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Embedding test failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embedding Generation Test</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Test Text
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to generate embeddings for..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !testText.trim()}
            className="w-full"
          >
            {loading ? 'Generating Embedding...' : 'Test Embedding'}
          </Button>

          {error && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Status</p>
                  <p className={`text-sm font-medium mt-1 ${result.success ? 'text-success-600' : 'text-error-600'}`}>
                    {result.success ? 'Success' : 'Failed'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Processing Time</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.processing_time_ms}ms</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Dimensions</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.embedding_dimensions}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Text Length</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{testText.length} chars</p>
                </div>
              </div>

              {result.embedding_preview && result.embedding_preview.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-2">
                    Embedding Preview (first 10 dimensions)
                  </p>
                  <div className="bg-white rounded border p-3">
                    <code className="text-xs font-mono text-neutral-700">
                      [{result.embedding_preview.slice(0, 10).map(v => v.toFixed(6)).join(', ')}...]
                    </code>
                  </div>
                </div>
              )}

              {result.error_message && (
                <Alert className="border-error-200 bg-error-50">
                  <AlertDescription className="text-error-800">
                    {result.error_message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

const SimilarityTestCard: React.FC = () => {
  const [text1, setText1] = useState('')
  const [text2, setText2] = useState('')
  const [result, setResult] = useState<VectorSimilarityTest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text1.trim() || !text2.trim()) {
      setError('Please enter both texts to compare')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await testSimilarity(text1, text2)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Similarity test failed')
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-success-600'
    if (score >= 0.6) return 'text-warning-600'
    return 'text-error-600'
  }

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return 'High Similarity'
    if (score >= 0.6) return 'Moderate Similarity'
    if (score >= 0.3) return 'Low Similarity'
    return 'Very Low Similarity'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similarity Test</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Text 1
            </label>
            <textarea
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="Enter first text..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Text 2
            </label>
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="Enter second text..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !text1.trim() || !text2.trim()}
            className="w-full"
          >
            {loading ? 'Calculating Similarity...' : 'Test Similarity'}
          </Button>

          {error && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getSimilarityColor(result.similarity_score)} mb-2`}>
                  {(result.similarity_score * 100).toFixed(1)}%
                </div>
                <div className={`text-sm font-medium ${getSimilarityColor(result.similarity_score)} mb-4`}>
                  {getSimilarityLabel(result.similarity_score)}
                </div>
                <Progress 
                  value={result.similarity_score * 100} 
                  max={100} 
                  className="mb-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Distance</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.distance.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Processing Time</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.processing_time_ms}ms</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

const BenchmarkTestCard: React.FC<{
  showBenchmarks?: boolean
}> = ({ showBenchmarks = true }) => {
  const [operation, setOperation] = useState<'search' | 'insert' | 'update' | 'delete'>('search')
  const [iterations, setIterations] = useState(100)
  const [result, setResult] = useState<VectorBenchmarkResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBenchmark = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      const response = await runVectorBenchmark(operation, iterations)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Benchmark test failed')
    } finally {
      setLoading(false)
    }
  }

  if (!showBenchmarks) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Benchmark</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBenchmark} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Operation
              </label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loading}
              >
                <option value="search">Search</option>
                <option value="insert">Insert</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Iterations
              </label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value) || 100)}
                min={1}
                max={1000}
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Running Benchmark...' : 'Run Benchmark'}
          </Button>

          {error && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Total Time</p>
                  <p className="text-lg font-bold text-neutral-900 mt-1">{result.total_time_ms.toFixed(0)}ms</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Average Time</p>
                  <p className="text-lg font-bold text-neutral-900 mt-1">{result.average_time_ms.toFixed(2)}ms</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Ops/Second</p>
                  <p className="text-lg font-bold text-primary-600 mt-1">{result.operations_per_second.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Success Rate</p>
                  <p className={`text-lg font-bold mt-1 ${result.success_rate === 1 ? 'text-success-600' : 'text-warning-600'}`}>
                    {(result.success_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Min Time</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.min_time_ms.toFixed(2)}ms</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Max Time</p>
                  <p className="text-sm font-medium text-neutral-900 mt-1">{result.max_time_ms.toFixed(2)}ms</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-2">Errors</p>
                  <div className="bg-error-50 border border-error-200 rounded p-3 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <p key={index} className="text-xs text-error-700 mb-1">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

const QuickSearchTest: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleQuickSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await vectorSearch({
        query: query,
        n_results: 3,
        include_metadata: true,
        include_documents: true,
        include_distances: true
      })
      setResults(response)
    } catch (err: any) {
      setError(err.message || 'Search test failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Search Test</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleQuickSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter test search query..."
              className="flex-1"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
            >
              {loading ? 'Searching...' : 'Test Search'}
            </Button>
          </div>

          {error && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-neutral-900">Search Results</h4>
                <span className="text-sm text-neutral-600">
                  {results.total_results} results in {results.search_time_ms}ms
                </span>
              </div>
              
              {results.results && results.results.length > 0 ? (
                <div className="space-y-3">
                  {results.results.map((result: any, index: number) => (
                    <div key={result.id} className="bg-white rounded border p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-neutral-900">
                          Result {index + 1}
                        </span>
                        <span className="text-xs text-success-600 font-medium">
                          {(result.similarity_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 line-clamp-2">
                        {result.document.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-600">No results found</p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export const VectorTestingPanel: React.FC<VectorTestingPanelProps> = ({
  showBenchmarks = true,
  defaultTestText = '',
  onTestComplete
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmbeddingTestCard defaultText={defaultTestText} />
        <SimilarityTestCard />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickSearchTest />
        <BenchmarkTestCard showBenchmarks={showBenchmarks} />
      </div>
    </div>
  )
}