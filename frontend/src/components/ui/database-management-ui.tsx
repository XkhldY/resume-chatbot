'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './card'
import { Alert, AlertDescription } from './alert'
import { Button } from './button'
import { Input } from './input'
import { Progress } from './progress'
import { 
  getVectorCollections, 
  createCollection, 
  updateCollection, 
  deleteCollection, 
  clearCollection 
} from '@/lib/api'
import { 
  VectorCollection, 
  VectorCollectionStats, 
  CreateCollectionRequest, 
  UpdateCollectionRequest,
  DatabaseManagementUIProps 
} from '@/types/vector'

const CollectionCard: React.FC<{
  collection: VectorCollection
  onUpdate: () => void
  onDelete: (name: string) => void
  onClear: (name: string) => void
  allowDangerous: boolean
}> = ({ collection, onUpdate, onDelete, onClear, allowDangerous }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(collection.name)
  const [isUpdating, setIsUpdating] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const handleUpdate = async () => {
    if (editName === collection.name) {
      setIsEditing(false)
      return
    }

    try {
      setIsUpdating(true)
      await updateCollection(collection.name, { name: editName })
      onUpdate()
      setIsEditing(false)
    } catch (err: any) {
      console.error('Failed to update collection:', err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setEditName(collection.name)
    setIsEditing(false)
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-sm font-medium"
                  disabled={isUpdating}
                />
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  disabled={isUpdating || !editName.trim()}
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-neutral-900">{collection.name}</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  Edit
                </Button>
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              ID: {collection.id}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClear(collection.name)}
              disabled={!allowDangerous || collection.vector_count === 0}
              className="text-warning-600 hover:text-warning-700 hover:bg-warning-50"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(collection.name)}
              disabled={!allowDangerous}
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Documents</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{collection.document_count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Vectors</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{collection.vector_count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Dimensions</p>
              <p className="text-lg font-semibold text-neutral-900 mt-1">{collection.dimensions}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Function</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">{collection.distance_function}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-100">
            <div>
              <p className="text-xs text-neutral-600">Embedding Function</p>
              <p className="text-sm font-medium text-neutral-900">{collection.embedding_function}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Created</p>
              <p className="text-sm font-medium text-neutral-900">{formatDate(collection.created_at)}</p>
            </div>
          </div>

          {collection.last_modified !== collection.created_at && (
            <div>
              <p className="text-xs text-neutral-600">Last Modified</p>
              <p className="text-sm font-medium text-neutral-900">{formatDate(collection.last_modified)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const CreateCollectionForm: React.FC<{
  onSuccess: () => void
  onCancel: () => void
}> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<CreateCollectionRequest>({
    name: '',
    embedding_function: 'default',
    distance_function: 'cosine'
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Collection name is required')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      await createCollection(formData)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to create collection')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Collection Name
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter collection name"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Distance Function
            </label>
            <select
              value={formData.distance_function}
              onChange={(e) => setFormData({ 
                ...formData, 
                distance_function: e.target.value as 'cosine' | 'l2' | 'ip' 
              })}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isCreating}
            >
              <option value="cosine">Cosine</option>
              <option value="l2">L2 (Euclidean)</option>
              <option value="ip">Inner Product</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Embedding Function
            </label>
            <Input
              type="text"
              value={formData.embedding_function}
              onChange={(e) => setFormData({ ...formData, embedding_function: e.target.value })}
              placeholder="default"
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.name.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

const ConfirmationModal: React.FC<{
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}> = ({ isOpen, title, message, confirmText, onConfirm, onCancel, isDestructive = false }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
          <p className="text-sm text-neutral-600 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className={isDestructive ? 'bg-error-600 hover:bg-error-700 text-white' : ''}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DatabaseManagementUI: React.FC<DatabaseManagementUIProps> = ({
  allowDangerousOperations = false,
  onCollectionChange
}) => {
  const [collections, setCollections] = useState<VectorCollection[]>([])
  const [stats, setStats] = useState<VectorCollectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    action: () => void
    isDestructive: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    action: () => {},
    isDestructive: false
  })

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const collectionsData = await getVectorCollections()
      setCollections(collectionsData.collections)
      setStats(collectionsData)
      onCollectionChange?.(collectionsData.collections)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collections')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = (collectionName: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Collection',
      message: `Are you sure you want to delete the collection "${collectionName}"? This action cannot be undone and will permanently remove all vectors and documents.`,
      confirmText: 'Delete Collection',
      isDestructive: true,
      action: async () => {
        try {
          await deleteCollection(collectionName)
          await fetchCollections()
        } catch (err: any) {
          setError(err.message || 'Failed to delete collection')
        }
        setConfirmation({ ...confirmation, isOpen: false })
      }
    })
  }

  const handleClearCollection = (collectionName: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Clear Collection',
      message: `Are you sure you want to clear all data from the collection "${collectionName}"? This will remove all vectors and documents but keep the collection structure.`,
      confirmText: 'Clear Collection',
      isDestructive: true,
      action: async () => {
        try {
          await clearCollection({ collection_name: collectionName, confirm: true })
          await fetchCollections()
        } catch (err: any) {
          setError(err.message || 'Failed to clear collection')
        }
        setConfirmation({ ...confirmation, isOpen: false })
      }
    })
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  if (loading && collections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-neutral-600">Loading collections...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Database Management</CardTitle>
          <div className="flex items-center space-x-2">
            {!allowDangerousOperations && (
              <Alert className="p-2 border-warning-200 bg-warning-50 mr-4">
                <AlertDescription className="text-warning-800 text-xs">
                  Dangerous operations are disabled
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCollections}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
            >
              Create Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-error-200 bg-error-50">
              <AlertDescription className="text-error-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{stats.total_collections}</p>
                <p className="text-sm text-neutral-600">Collections</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{stats.total_documents.toLocaleString()}</p>
                <p className="text-sm text-neutral-600">Documents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">{stats.total_vectors.toLocaleString()}</p>
                <p className="text-sm text-neutral-600">Vectors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neutral-900">
                  {(stats.total_size_bytes / (1024 * 1024)).toFixed(1)} MB
                </p>
                <p className="text-sm text-neutral-600">Storage</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateForm && (
        <CreateCollectionForm
          onSuccess={() => {
            setShowCreateForm(false)
            fetchCollections()
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {collections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-neutral-600 mb-4">No collections found</p>
            <Button onClick={() => setShowCreateForm(true)}>
              Create Your First Collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onUpdate={fetchCollections}
              onDelete={handleDeleteCollection}
              onClear={handleClearCollection}
              allowDangerous={allowDangerousOperations}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
        onConfirm={confirmation.action}
        onCancel={() => setConfirmation({ ...confirmation, isOpen: false })}
        isDestructive={confirmation.isDestructive}
      />
    </div>
  )
}