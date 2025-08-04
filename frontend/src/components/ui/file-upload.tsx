import * as React from 'react'
import { 
  CloudArrowUpIcon, 
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { 
  UploadFile, 
  UploadStatus, 
  ACCEPTED_FILE_TYPES, 
  MAX_FILE_SIZE,
  FileValidationError 
} from '@/types/upload'
import { uploadFile, ApiError } from '@/lib/api'
import { Button } from './button'
import { Alert, AlertDescription } from './alert'
import { FileListItem } from './file-list-item'

export interface FileUploadProps {
  onUploadComplete?: (files: UploadFile[]) => void
  onUploadProgress?: (files: UploadFile[]) => void
  onError?: (error: string) => void
  maxFiles?: number
  disabled?: boolean
  className?: string
}

function validateFile(file: File): FileValidationError | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File ${file.name} is too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`
    }
  }

  // Check file type
  const fileType = file.type
  const fileName = file.name.toLowerCase()
  const isValidType = Object.keys(ACCEPTED_FILE_TYPES).some(type => {
    if (fileType === type) return true
    const extensions = ACCEPTED_FILE_TYPES[type as keyof typeof ACCEPTED_FILE_TYPES]
    return extensions.some(ext => fileName.endsWith(ext))
  })

  if (!isValidType) {
    return {
      code: 'INVALID_TYPE',
      message: `File ${file.name} has an unsupported format. Please upload PDF, DOCX, TXT, or MD files only.`
    }
  }

  return null
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({ 
    onUploadComplete, 
    onUploadProgress, 
    onError, 
    maxFiles = 10, 
    disabled = false,
    className 
  }, ref) => {
    const [files, setFiles] = React.useState<UploadFile[]>([])
    const [isDragActive, setIsDragActive] = React.useState(false)
    const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>('idle')
    const [globalError, setGlobalError] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const dragCounter = React.useRef(0)

    const addFiles = React.useCallback((newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      const validFiles: UploadFile[] = []
      const errors: string[] = []

      // Check if adding these files would exceed maxFiles
      if (files.length + fileArray.length > maxFiles) {
        errors.push(`Cannot upload more than ${maxFiles} files at once.`)
      } else {
        fileArray.forEach((file) => {
          // Check for duplicates
          const isDuplicate = files.some(existingFile => 
            existingFile.file.name === file.name && 
            existingFile.file.size === file.size
          )
          
          if (isDuplicate) {
            errors.push(`File ${file.name} is already in the upload queue.`)
            return
          }

          // Validate file
          const validationError = validateFile(file)
          if (validationError) {
            errors.push(validationError.message)
            return
          }

          // Add valid file
          validFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            status: 'pending',
            progress: 0
          })
        })
      }

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles])
        setGlobalError(null)
      }

      if (errors.length > 0) {
        const errorMessage = errors.join(' ')
        setGlobalError(errorMessage)
        onError?.(errorMessage)
      }
    }, [files, maxFiles, onError])

    const removeFile = React.useCallback((fileId: string) => {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    }, [])

    const updateFileStatus = React.useCallback((fileId: string, updates: Partial<UploadFile>) => {
      setFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
      )
    }, [])

    const uploadSingleFile = React.useCallback(async (file: UploadFile) => {
      updateFileStatus(file.id, { status: 'uploading', progress: 0 })

      try {
        await uploadFile(file.file, (progress) => {
          updateFileStatus(file.id, { progress })
        })
        
        updateFileStatus(file.id, { status: 'success', progress: 100 })
      } catch (error) {
        const errorMessage = error instanceof ApiError 
          ? error.message 
          : 'Upload failed. Please try again.'
        
        updateFileStatus(file.id, { 
          status: 'error', 
          error: errorMessage 
        })
        throw error
      }
    }, [updateFileStatus])

    const startUpload = React.useCallback(async () => {
      const pendingFiles = files.filter(f => f.status === 'pending')
      if (pendingFiles.length === 0) return

      setUploadStatus('uploading')
      setGlobalError(null)

      const uploadPromises = pendingFiles.map(file => uploadSingleFile(file))
      
      try {
        await Promise.allSettled(uploadPromises)
        const updatedFiles = files.map(f => 
          pendingFiles.find(pf => pf.id === f.id) ? 
          { ...f, status: f.status === 'uploading' ? 'success' : f.status } as UploadFile : f
        )
        
        setUploadStatus('completed')
        onUploadComplete?.(updatedFiles)
      } catch (error) {
        setUploadStatus('error')
        const errorMessage = 'Some files failed to upload. Please check individual file statuses.'
        setGlobalError(errorMessage)
        onError?.(errorMessage)
      }
    }, [files, uploadSingleFile, onUploadComplete, onError])

    const retryFile = React.useCallback(async (fileId: string) => {
      const file = files.find(f => f.id === fileId)
      if (!file) return

      try {
        await uploadSingleFile(file)
      } catch (error) {
        // Error handling is done in uploadSingleFile
      }
    }, [files, uploadSingleFile])

    const clearAll = React.useCallback(() => {
      setFiles([])
      setGlobalError(null)
      setUploadStatus('idle')
    }, [])

    // Drag and drop handlers
    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragActive(true)
      }
    }, [])

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragActive(false)
      }
    }, [])

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, [])

    const handleDrop = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      dragCounter.current = 0

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    }, [disabled, addFiles])

    const handleFileInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(selectedFiles)
      }
      // Reset input value to allow re-selecting the same file
      e.target.value = ''
    }, [addFiles])

    const openFileDialog = React.useCallback(() => {
      fileInputRef.current?.click()
    }, [])

    // Update progress callback
    React.useEffect(() => {
      onUploadProgress?.(files)
    }, [files, onUploadProgress])

    const pendingFilesCount = files.filter(f => f.status === 'pending').length
    const uploadingFilesCount = files.filter(f => f.status === 'uploading').length
    const successFilesCount = files.filter(f => f.status === 'success').length
    const errorFilesCount = files.filter(f => f.status === 'error').length

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {/* Drop Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
            {
              'border-secondary-300 bg-neutral-50': !isDragActive && !disabled,
              'border-primary bg-primary-50': isDragActive && !disabled,
              'border-secondary-200 bg-secondary-100 opacity-50': disabled,
            }
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'p-3 rounded-full',
              {
                'bg-primary-100': isDragActive && !disabled,
                'bg-secondary-200': !isDragActive || disabled,
              }
            )}>
              <CloudArrowUpIcon className={cn(
                'w-8 h-8',
                {
                  'text-primary': isDragActive && !disabled,
                  'text-secondary-600': !isDragActive || disabled,
                }
              )} />
            </div>
            
            <div className="space-y-2">
              <p className={cn(
                'text-lg font-medium',
                {
                  'text-primary': isDragActive && !disabled,
                  'text-neutral-900': !isDragActive && !disabled,
                  'text-secondary-600': disabled,
                }
              )}>
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              
              <p className="text-sm text-neutral-600">
                or{' '}
                <button
                  type="button"
                  onClick={openFileDialog}
                  disabled={disabled}
                  className="text-primary hover:text-primary-dark underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  browse files
                </button>
              </p>
              
              <p className="text-xs text-neutral-500">
                Supports PDF, DOCX, TXT, MD files up to {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB each
              </p>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Global Error Alert */}
        {globalError && (
          <Alert variant="error">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        {/* Upload Status Summary */}
        {files.length > 0 && (
          <Alert variant={uploadStatus === 'error' ? 'error' : uploadStatus === 'completed' ? 'success' : 'default'}>
            {uploadStatus === 'completed' ? (
              <CheckCircleIcon className="w-4 h-4" />
            ) : uploadStatus === 'error' ? (
              <ExclamationTriangleIcon className="w-4 h-4" />
            ) : (
              <DocumentArrowUpIcon className="w-4 h-4" />
            )}
            <AlertDescription>
              {uploadStatus === 'uploading' && `Uploading ${uploadingFilesCount} file${uploadingFilesCount !== 1 ? 's' : ''}...`}
              {uploadStatus === 'completed' && `Successfully uploaded ${successFilesCount} file${successFilesCount !== 1 ? 's' : ''}`}
              {uploadStatus === 'error' && `Upload completed with ${errorFilesCount} error${errorFilesCount !== 1 ? 's' : ''}`}
              {uploadStatus === 'idle' && `${files.length} file${files.length !== 1 ? 's' : ''} ready to upload`}
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-neutral-900">
                Files ({files.length}/{maxFiles})
              </h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearAll}
                disabled={uploadingFilesCount > 0}
              >
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((file) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  onRemove={file.status !== 'uploading' ? removeFile : undefined}
                  onRetry={file.status === 'error' ? retryFile : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upload Actions */}
        {pendingFilesCount > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={startUpload}
              disabled={disabled || uploadStatus === 'uploading'}
              className="flex items-center gap-2"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              Upload {pendingFilesCount} File{pendingFilesCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    )
  }
)
FileUpload.displayName = 'FileUpload'