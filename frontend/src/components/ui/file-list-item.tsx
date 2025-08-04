import * as React from 'react'
import { 
  DocumentIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { UploadFile } from '@/types/upload'
import { Progress } from './progress'
import { Button } from './button'

export interface FileListItemProps {
  file: UploadFile
  onRemove?: (fileId: string) => void
  onRetry?: (fileId: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileTypeIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'pdf':
      return <DocumentIcon className="w-8 h-8 text-error" />
    case 'docx':
      return <DocumentIcon className="w-8 h-8 text-primary" />
    case 'txt':
    case 'md':
      return <DocumentIcon className="w-8 h-8 text-neutral-600" />
    default:
      return <DocumentIcon className="w-8 h-8 text-neutral-400" />
  }
}

export const FileListItem = React.forwardRef<HTMLDivElement, FileListItemProps>(
  ({ file, onRemove, onRetry }, ref) => {
    const statusIcon = () => {
      switch (file.status) {
        case 'success':
          return <CheckCircleIcon className="w-5 h-5 text-success" />
        case 'error':
          return <ExclamationCircleIcon className="w-5 h-5 text-error" />
        case 'uploading':
          return (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )
        default:
          return null
      }
    }

    const progressVariant = () => {
      switch (file.status) {
        case 'success':
          return 'success'
        case 'error':
          return 'error'
        default:
          return 'default'
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all duration-150',
          {
            'border-secondary-200 bg-white': file.status === 'pending',
            'border-primary-200 bg-primary-50': file.status === 'uploading',
            'border-success-200 bg-success-50': file.status === 'success',
            'border-error-200 bg-error-50': file.status === 'error',
          }
        )}
      >
        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileTypeIcon(file.file.name)}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-neutral-900 truncate">
              {file.file.name}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {statusIcon()}
              {onRemove && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                  className="p-1 h-6 w-6 min-w-0"
                  disabled={file.status === 'uploading'}
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-2">
            <span>{formatFileSize(file.file.size)}</span>
            {file.status === 'uploading' && (
              <span>{file.progress}%</span>
            )}
            {file.status === 'success' && (
              <span className="text-success-600">Upload complete</span>
            )}
            {file.status === 'error' && (
              <span className="text-error-600">Failed</span>
            )}
          </div>

          {/* Progress Bar */}
          {(file.status === 'uploading' || file.status === 'success' || file.status === 'error') && (
            <Progress
              value={file.status === 'success' ? 100 : file.progress}
              variant={progressVariant()}
              size="sm"
              className="mb-1"
            />
          )}

          {/* Error Message */}
          {file.status === 'error' && file.error && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-error-600">{file.error}</p>
              {onRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRetry(file.id)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)
FileListItem.displayName = 'FileListItem'