// Modal component for image block creation with URL input, live preview, and automatic dimension detection
// Integrates with inline block creation flow (BlockMenu, EmptyBlock)
// Dimension detection is automatic but can be overridden manually
// Error handling: CORS, timeouts, invalid URLs - all allow user to proceed with manual input

'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { loadImageDimensions } from '@/lib/client/imageUtils'

interface ImageModalProps {
  isOpen: boolean
  onConfirm: (url: string, width: number, height: number) => void
  onClose: () => void
  initialUrl?: string
  initialWidth?: number
  initialHeight?: number
}

export default function ImageModal({
  isOpen,
  onConfirm,
  onClose,
  initialUrl = '',
  initialWidth,
  initialHeight
}: ImageModalProps) {
  // State management for URL input, dimension detection, and error handling
  const [url, setUrl] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false)
  const [dimensionError, setDimensionError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Request ID ref to guard against stale responses
  const requestIdRef = useRef(0)

  // Initialize form fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl)
      setWidth(initialWidth ? initialWidth.toString() : '')
      setHeight(initialHeight ? initialHeight.toString() : '')
      setDimensionError(null)
      setUrlError(null)
      setShowPreview(false)
    }
  }, [isOpen, initialUrl, initialWidth, initialHeight])

  // Client-side URL validation before attempting load
  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return null
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'Image URL must start with http:// or https://'
    }
    return null
  }

  // Auto-detect dimensions when URL changes, with debouncing to reduce load
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Don't attempt to load if URL is empty
    if (!url.trim()) {
      setShowPreview(false)
      setDimensionError(null)
      setUrlError(null)
      return
    }

    // Validate URL format
    const validationError = validateUrl(url)
    if (validationError) {
      setUrlError(validationError)
      setShowPreview(false)
      return
    }

    // Clear URL error if validation passed
    setUrlError(null)

    // Debounce dimension detection (500ms delay)
    debounceTimerRef.current = setTimeout(async () => {
      // Increment request ID for this new request
      const currentRequestId = ++requestIdRef.current
      const urlAtRequestTime = url

      setIsLoadingDimensions(true)
      setDimensionError(null)

      try {
        const dimensions = await loadImageDimensions(urlAtRequestTime)

        // Guard against stale responses: only apply if this is still the latest request and URL hasn't changed
        if (currentRequestId === requestIdRef.current && urlAtRequestTime === url) {
          setWidth(dimensions.width.toString())
          setHeight(dimensions.height.toString())
          setShowPreview(true)
          setDimensionError(null)
        }
      } catch (error) {
        // Only set error for the active request
        if (currentRequestId === requestIdRef.current && urlAtRequestTime === url) {
          setDimensionError(error instanceof Error ? error.message : 'Failed to load image')
          setShowPreview(false)
        }
      } finally {
        // Only clear loading state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsLoadingDimensions(false)
        }
      }
    }, 500)

    // Cleanup on unmount or URL change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [url])

  // Validate inputs and confirm image block creation
  const handleConfirm = (e: FormEvent) => {
    e.preventDefault()

    // Validate URL
    const urlValidationError = validateUrl(url)
    if (urlValidationError) {
      setUrlError(urlValidationError)
      return
    }

    // Validate dimensions
    const widthNum = parseInt(width)
    const heightNum = parseInt(height)

    if (!widthNum || widthNum <= 0) {
      setDimensionError('Width must be a positive number')
      return
    }

    if (!heightNum || heightNum <= 0) {
      setDimensionError('Height must be a positive number')
      return
    }

    // All validations passed
    onConfirm(url, widthNum, heightNum)
    handleClose()
  }

  // Clean up state when modal closes
  const handleClose = () => {
    setUrl('')
    setWidth('')
    setHeight('')
    setIsLoadingDimensions(false)
    setDimensionError(null)
    setUrlError(null)
    setShowPreview(false)
    onClose()
  }

  // Don't render if modal is closed
  if (!isOpen) return null

  return (
    <>
      {/* Modal overlay for click-away-to-close behavior */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal content container, prevents click-through to overlay */}
        <div
          className="bg-white dark:bg-notion-dark-sidebar rounded-lg shadow-xl max-w-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-modal-title"
        >
          {/* Modal header with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id="image-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-notion-dark-text"
            >
              Add Image Block
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form for image URL and dimensions */}
          <form onSubmit={handleConfirm} className="space-y-4">
            {/* URL input with validation feedback */}
            <div>
              <label
                htmlFor="image-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Image URL
              </label>
              <input
                id="image-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setUrlError(null)
                }}
                placeholder="https://example.com/image.jpg"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-notion-dark-bg text-gray-900 dark:text-notion-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
              />
              {urlError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{urlError}</p>
              )}
            </div>

            {/* Live preview of image with size constraints */}
            {showPreview && (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-notion-dark-bg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview:
                </p>
                <div className="flex items-center justify-center">
                  <img
                    src={url}
                    alt="Image preview"
                    className="max-w-full max-h-[300px] object-contain rounded"
                    onError={() => setShowPreview(false)}
                  />
                </div>
              </div>
            )}

            {/* Loading indicator during dimension detection */}
            {isLoadingDimensions && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Detecting dimensions...
                </p>
              </div>
            )}

            {/* Error feedback with option to proceed manually */}
            {dimensionError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  {dimensionError}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  You can enter dimensions manually below.
                </p>
              </div>
            )}

            {/* Dimension inputs, pre-filled with detected values or manually entered */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="image-width"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Width (px)
                </label>
                <input
                  id="image-width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  min="1"
                  required
                  disabled={isLoadingDimensions}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-notion-dark-bg text-gray-900 dark:text-notion-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label
                  htmlFor="image-height"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Height (px)
                </label>
                <input
                  id="image-height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="1"
                  required
                  disabled={isLoadingDimensions}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-notion-dark-bg text-gray-900 dark:text-notion-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Explain auto-detection and manual override capability */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dimensions are auto-detected. You can override them if needed.
            </p>

            {/* Action buttons for confirming or canceling image creation */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoadingDimensions || !url.trim()}
                className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingDimensions ? 'Loading...' : 'Add Image'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
