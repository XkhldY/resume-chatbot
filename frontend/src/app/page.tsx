'use client'

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Alert, AlertDescription, FileUpload } from '@/components/ui'
import { DocumentArrowUpIcon, ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { UploadFile } from '@/types/upload'
import { processDocuments } from '@/lib/api'
import React from 'react'

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadFile[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [processingError, setProcessingError] = React.useState<string | null>(null)
  const [processingSuccess, setProcessingSuccess] = React.useState(false)

  const handleUploadComplete = React.useCallback((files: UploadFile[]) => {
    setUploadedFiles(files)
    setProcessingError(null)
    setProcessingSuccess(false)
  }, [])

  const handleUploadError = React.useCallback((error: string) => {
    setProcessingError(error)
  }, [])

  const handleProcessDocuments = React.useCallback(async () => {
    const successfulUploads = uploadedFiles.filter(f => f.status === 'success')
    if (successfulUploads.length === 0) return

    setIsProcessing(true)
    setProcessingError(null)
    
    try {
      await processDocuments()
      setProcessingSuccess(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process documents'
      setProcessingError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFiles])

  const successfulUploads = uploadedFiles.filter(f => f.status === 'success')
  const hasUploads = successfulUploads.length > 0

  return (
    <main className="min-h-screen bg-neutral-light">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="mb-4">Document Chatbot</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Upload your documents and start intelligent conversations with them using advanced AI technology.
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentArrowUpIcon className="w-6 h-6 text-primary" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Transform your documents into interactive conversations. Upload PDFs, Word docs, or text files and get instant answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
              maxFiles={5}
            />
            
            {hasUploads && (
              <div className="mt-6 pt-6 border-t border-secondary-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900 mb-1">
                      Process Documents for Chat
                    </h4>
                    <p className="text-xs text-neutral-600">
                      Process {successfulUploads.length} uploaded document{successfulUploads.length !== 1 ? 's' : ''} to enable AI chat functionality.
                    </p>
                  </div>
                  <Button
                    onClick={handleProcessDocuments}
                    disabled={isProcessing || processingSuccess}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : processingSuccess ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Processing...' : processingSuccess ? 'Ready for Chat' : 'Process Documents'}
                  </Button>
                </div>
                
                {processingError && (
                  <Alert variant="error" className="mb-4">
                    <AlertDescription>{processingError}</AlertDescription>
                  </Alert>
                )}
                
                {processingSuccess && (
                  <Alert variant="success" className="mb-4">
                    <CheckCircleIcon className="w-4 h-4" />
                    <AlertDescription>
                      Documents processed successfully! You can now chat with your documents below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {!hasUploads && (
          <Alert className="mb-6">
            <AlertDescription>
              <strong>Pro tip:</strong> For best results, upload documents with clear text content. Images and scanned PDFs work better when they contain searchable text.
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
              {hasUploads ? 'Chat with Your Documents' : 'Quick Start'}
            </CardTitle>
            <CardDescription>
              {hasUploads 
                ? 'Ask questions about your uploaded documents to get instant answers.' 
                : 'Upload documents above to start chatting with them.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input 
                placeholder={hasUploads 
                  ? "Ask a question about your documents..." 
                  : "Upload documents first to enable chat..."
                }
                className="w-full"
                disabled={!hasUploads || !processingSuccess}
              />
              <Button 
                className="w-full sm:w-auto"
                disabled={!hasUploads || !processingSuccess}
              >
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}