export interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export interface UploadedFileInfo {
  original_filename: string
  saved_filename: string
  file_size: number
  content_type: string
  upload_timestamp: string
  document_id: string
}

export interface UploadResponse {
  message: string
  uploaded_files: UploadedFileInfo[]
  success_count: number
  error_count: number
  errors?: string[] | null
}

export interface FileValidationError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED'
  message: string
}

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error'

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes