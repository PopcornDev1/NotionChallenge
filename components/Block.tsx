// Block component that renders a single block based on its type
// Uses TypeScript discriminated unions for type-safe rendering
// Supports inline editing and drag-and-drop reordering
// Hover '+' button triggers inline block creation via BlockMenu
// Slash commands (/h1, /h2, /h3, /paragraph, /image) transform block type/variant
// Enter key creates new paragraph block after current block
// ContentEditable enables inline typing while preserving display styling
// Distinction between inline creation (display mode) and full editing (edit mode)

'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import type { FormEvent } from 'react'
import type { Block } from '@/lib/types'
import { validateBlockEdit } from '@/lib/client/validation'
import { loadImageDimensions } from '@/lib/client/imageUtils' // Image dimension detection utility

interface BlockProps {
  block: Block
  onUpdate: (id: string, updates: Omit<Block, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: (id: string, position: 'before' | 'after') => void
  onDragLeave: (id: string) => void
  onDrop: (id: string) => void
  isDragging: boolean
  isDragOver: boolean
  dropPosition: 'before' | 'after' | null
  onInsertBlockAfter: (currentBlockId: string, type: 'text' | 'image', variant?: 'h1' | 'h2' | 'h3' | 'paragraph') => void
  onOpenMenuForBlock: (blockId: string, position: { x: number; y: number }) => void
  shouldFocus?: boolean
  onFocusComplete?: () => void
  isSelected: boolean // Selection props enable clean UX with contextual controls
  onSelect: () => void // Selection props enable clean UX with contextual controls
}

export function Block({
  block,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver,
  dropPosition,
  onInsertBlockAfter,
  onOpenMenuForBlock,
  shouldFocus,
  onFocusComplete,
  isSelected,
  onSelect
}: BlockProps) {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Text block edit fields
  const [editTextContent, setEditTextContent] = useState('')
  const [editTextVariant, setEditTextVariant] = useState<'h1' | 'h2' | 'h3' | 'paragraph'>('paragraph')

  // Image block edit fields
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editImageWidth, setEditImageWidth] = useState('')
  const [editImageHeight, setEditImageHeight] = useState('')

  // State for auto-detecting image dimensions during edit
  const [isDetectingDimensions, setIsDetectingDimensions] = useState(false)
  const [dimensionDetectionError, setDimensionDetectionError] = useState<string | null>(null)
  // Detected dimension placeholders (used when fields are empty)
  const [detectedWidth, setDetectedWidth] = useState<string>('')
  const [detectedHeight, setDetectedHeight] = useState<string>('')

  // Inline content editing (for text blocks only)
  const [inlineContent, setInlineContent] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus management - auto-focus newly created blocks
  useEffect(() => {
    if (shouldFocus && contentRef.current && block.type === 'text') {
      contentRef.current.focus()
      // Move cursor to end of content
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(contentRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)

      // Notify parent that focus is complete
      onFocusComplete?.()
    }
  }, [shouldFocus, block.type, onFocusComplete])

  // Enter edit mode and populate form fields
  const handleEdit = async () => {
    setError(null)

    if (block.type === 'text') {
      setEditTextContent(block.content)
      setEditTextVariant(block.styles.variant)
    } else if (block.type === 'image') {
      setEditImageUrl(block.content)
      setEditImageWidth(block.styles.width.toString())
      setEditImageHeight(block.styles.height.toString())

      // Auto-detect dimensions when entering edit mode
      setIsDetectingDimensions(true)
      setDimensionDetectionError(null)
      setDetectedWidth('')
      setDetectedHeight('')

      try {
        const dimensions = await loadImageDimensions(block.content)
        // Store detected dimensions as placeholders
        setDetectedWidth(dimensions.width.toString())
        setDetectedHeight(dimensions.height.toString())
      } catch (err) {
        // On failure, set error but keep existing values
        setDimensionDetectionError(err instanceof Error ? err.message : 'Failed to detect dimensions')
      } finally {
        setIsDetectingDimensions(false)
      }
    }

    setIsEditing(true)
  }

  // Cancel edit mode and discard changes
  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    setDimensionDetectionError(null)
    setDetectedWidth('')
    setDetectedHeight('')
  }

  // Save edited block
  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Build complete update payload based on block type (without id)
    let updates: Omit<Block, 'id'>

    if (block.type === 'text') {
      updates = {
        type: 'text' as const,
        content: editTextContent.trim(),
        styles: { variant: editTextVariant }
      }
    } else {
      // Use placeholder values if fields are empty
      const finalWidth = editImageWidth || detectedWidth
      const finalHeight = editImageHeight || detectedHeight

      // Runtime validation: ensure dimensions are positive numbers
      if (!finalWidth || !finalHeight) {
        setError('Width and height are required. Click "Detect Size" to auto-detect dimensions.')
        return
      }

      const widthNum = parseInt(finalWidth)
      const heightNum = parseInt(finalHeight)

      if (isNaN(widthNum) || widthNum <= 0) {
        setError('Width must be a positive number')
        return
      }

      if (isNaN(heightNum) || heightNum <= 0) {
        setError('Height must be a positive number')
        return
      }

      updates = {
        type: 'image' as const,
        content: editImageUrl,
        styles: {
          width: widthNum,
          height: heightNum
        }
      }
    }

    // Validate using client-side validation
    const validationError = validateBlockEdit(
      updates.type,
      updates.content,
      updates.styles
    )

    if (validationError) {
      setError(validationError)
      return
    }

    // Trigger update via parent callback with saving state
    setIsSaving(true)
    try {
      await onUpdate(block.id, updates)
      // Success: exit edit mode
      setIsEditing(false)
      setIsSaving(false)
    } catch (err) {
      // Error: keep edit mode open and show error
      setIsSaving(false)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    }
  }

  // Auto-detect image dimensions from URL using loadImageDimensions utility
  const handleDetectDimensions = async () => {
    // Clear previous dimension detection error
    setDimensionDetectionError(null)

    // Validate URL is not empty and starts with http/https
    if (!editImageUrl.trim()) {
      setDimensionDetectionError('Please enter a valid image URL first')
      return
    }

    if (!editImageUrl.startsWith('http://') && !editImageUrl.startsWith('https://')) {
      setDimensionDetectionError('Image URL must start with http:// or https://')
      return
    }

    setIsDetectingDimensions(true)

    try {
      const dimensions = await loadImageDimensions(editImageUrl)
      // Store detected dimensions as placeholders
      setDetectedWidth(dimensions.width.toString())
      setDetectedHeight(dimensions.height.toString())
      setDimensionDetectionError(null)
    } catch (err) {
      setDimensionDetectionError(err instanceof Error ? err.message : 'Failed to detect dimensions')
    } finally {
      setIsDetectingDimensions(false)
    }
  }

  // Slash command detection for text blocks
  // Supported commands: /h1, /h2, /h3, /paragraph, /image
  // Handles both exact match and space-separated content (e.g., "/h1 My title")
  const detectSlashCommand = (text: string): { variant?: 'h1' | 'h2' | 'h3' | 'paragraph'; isImage?: boolean; remainingContent?: string } | null => {
    const trimmed = text.trim()
    if (!trimmed.startsWith('/')) return null

    // Extract first word (command) and remainder
    const spaceIndex = trimmed.indexOf(' ')
    const command = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex)
    const remainder = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex + 1).trim()

    // Match commands
    if (command === '/h1') return { variant: 'h1', remainingContent: remainder }
    if (command === '/h2') return { variant: 'h2', remainingContent: remainder }
    if (command === '/h3') return { variant: 'h3', remainingContent: remainder }
    if (command === '/paragraph' || command === '/p') return { variant: 'paragraph', remainingContent: remainder }
    if (command === '/image' || command === '/img') return { isImage: true, remainingContent: remainder }

    return null
  }

  // Handle inline content changes for slash command detection
  const handleInlineInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || ''
    setInlineContent(text)
  }

  // Handle Enter key to create new block after current block
  // Shift+Enter inserts line break (default behavior)
  const handleInlineKeyDown = async (e: KeyboardEvent<HTMLDivElement>) => {
    if (block.type !== 'text') return

    // Enter key without Shift creates new paragraph block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const currentContent = inlineContent.trim()

      // Check for slash command first
      const command = detectSlashCommand(currentContent)
      if (command) {
        if (command.isImage) {
          // Convert to image block (requires update to image type)
          // For now, create new image block after this one
          onInsertBlockAfter(block.id, 'image')
          // Clear content
          setInlineContent('')
          if (contentRef.current) {
            contentRef.current.textContent = ''
          }
        } else if (command.variant) {
          // Transform current block's variant, preserving remainder content
          const updates = {
            type: 'text' as const,
            content: command.remainingContent || '',
            styles: { variant: command.variant }
          }

          // Validate before updating
          const validationError = validateBlockEdit(updates.type, updates.content, updates.styles)
          if (validationError) {
            // Revert to previous content on validation error
            setInlineContent(block.content)
            if (contentRef.current) {
              contentRef.current.textContent = block.content
            }
            return
          }

          await onUpdate(block.id, updates)
          // Update UI with new content
          setInlineContent(command.remainingContent || '')
          if (contentRef.current) {
            contentRef.current.textContent = command.remainingContent || ''
          }
        }
        return
      }

      // Save current content if changed (allow empty content for blank space)
      // Don't trim here - save exactly what the user typed (even if empty)
      if (inlineContent !== block.content) {
        const updates = {
          type: 'text' as const,
          content: inlineContent,
          styles: block.styles
        }

        await onUpdate(block.id, updates)
      }

      // Create new paragraph block after this one
      onInsertBlockAfter(block.id, 'text', 'paragraph')
    }

    // Backspace key on empty block deletes it
    if (e.key === 'Backspace') {
      const currentContent = inlineContent.trim()
      // Only delete if block is completely empty
      if (currentContent.length === 0) {
        e.preventDefault()
        onDelete(block.id)
        return
      }
    }

    // Space key after slash command
    // When user types space after a command, transform and allow them to continue typing
    if (e.key === ' ' && inlineContent.startsWith('/')) {
      const command = detectSlashCommand(inlineContent)
      if (command) {
        e.preventDefault()
        if (command.isImage) {
          onInsertBlockAfter(block.id, 'image')
          setInlineContent('')
          if (contentRef.current) {
            contentRef.current.textContent = ''
          }
        } else if (command.variant) {
          // Transform to the variant, preserving any content after the command
          const updates = {
            type: 'text' as const,
            content: command.remainingContent || '',
            styles: { variant: command.variant }
          }

          // Validate before updating
          const validationError = validateBlockEdit(updates.type, updates.content, updates.styles)
          if (validationError) {
            // Revert to previous content on validation error
            setInlineContent(block.content)
            if (contentRef.current) {
              contentRef.current.textContent = block.content
            }
            return
          }

          await onUpdate(block.id, updates)
          // Clear slate for user to continue typing
          setInlineContent(command.remainingContent || '')
          if (contentRef.current) {
            contentRef.current.textContent = command.remainingContent || ''
            // Focus at end of content
            const range = document.createRange()
            const selection = window.getSelection()
            range.selectNodeContents(contentRef.current)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
          }
        }
      }
    }
  }

  // Handle blur to save inline content changes
  const handleInlineBlur = async () => {
    if (block.type !== 'text') return

    const currentContent = inlineContent.trim()
    if (currentContent !== block.content && !currentContent.startsWith('/')) {
      const updates = {
        type: 'text' as const,
        content: currentContent,
        styles: block.styles
      }

      // Validate before updating
      const validationError = validateBlockEdit(updates.type, updates.content, updates.styles)
      if (validationError) {
        // Revert to previous content on validation error
        setInlineContent(block.content)
        if (contentRef.current) {
          contentRef.current.textContent = block.content
        }
        return
      }

      try {
        await onUpdate(block.id, updates)
      } catch (err) {
        // Revert on error
        setInlineContent(block.content)
        if (contentRef.current) {
          contentRef.current.textContent = block.content
        }
      }
    }
  }

  // Handle '+' button click to open BlockMenu
  // Initial positioning - menu will self-adjust to viewport bounds after render
  const handlePlusClick = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const menuWidth = 256 // w-64 in Tailwind
      const padding = 8

      // Try to position menu to the left of the trigger
      let x = rect.left - menuWidth - padding
      const y = rect.top

      // If menu would overflow left edge, position to the right instead
      if (x < padding) {
        x = rect.right + padding
      }

      // Menu will dynamically adjust for viewport overflow after rendering
      onOpenMenuForBlock(block.id, { x, y })
    }
  }

  // Drag-and-drop handlers
  const handleDragStartEvent = (e: React.DragEvent) => {
    // Set data for cross-browser compatibility
    e.dataTransfer.setData('text/plain', block.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(block.id)
  }

  const handleDragEndEvent = () => {
    onDragEnd()
  }

  const handleDragOverEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    // Calculate drop position based on cursor position relative to block height
    const rect = e.currentTarget.getBoundingClientRect()
    const cursorY = e.clientY
    const blockMiddle = rect.top + rect.height / 2

    const position = cursorY < blockMiddle ? 'before' : 'after'
    onDragOver(block.id, position)
  }

  const handleDragLeaveEvent = (e: React.DragEvent) => {
    // Only trigger if leaving this specific element (not entering a child)
    if (e.currentTarget === e.target) {
      onDragLeave(block.id)
    }
  }

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault()
    onDrop(block.id)
  }

  // Container classes with drag states and selection
  // No borders by default, only on hover or selection (border-2 prevents layout shift)
  // Subtle shadow on hover for interactivity feedback
  // Clear visual indicator for selected block
  const containerClasses = `
    p-4 rounded-lg transition-all relative
    ${
      isSelected
        ? 'bg-gray-100 dark:bg-gray-800'
        : 'bg-white dark:bg-notion-dark-bg'
    }
    ${isDragging ? 'opacity-40' : ''}
    ${isDragOver ? 'bg-gray-100 dark:bg-gray-800' : ''}
  `.trim()

  // Edit mode rendering
  if (isEditing) {
    return (
      <div className="p-4 bg-white dark:bg-notion-dark-bg border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-gray-900/50">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            <div className="flex justify-between items-start">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 ml-2"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Text block edit form */}
          {block.type === 'text' && (
            <>
              <div>
                <label htmlFor={`edit-content-${block.id}`} className="block text-sm font-semibold text-gray-700 dark:text-notion-dark-textSoft mb-2">
                  Content
                </label>
                <textarea
                  id={`edit-content-${block.id}`}
                  value={editTextContent}
                  onChange={(e) => setEditTextContent(e.target.value)}
                  placeholder="Enter your text..."
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-white dark:bg-notion-dark-sidebar text-gray-900 dark:text-notion-dark-textSoft border border-gray-300 dark:border-notion-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent resize-vertical placeholder:text-gray-400 dark:placeholder:text-notion-dark-textMuted"
                />
              </div>
              <div>
                <label htmlFor={`edit-variant-${block.id}`} className="block text-sm font-semibold text-gray-700 dark:text-notion-dark-textSoft mb-2">
                  Style
                </label>
                <select
                  id={`edit-variant-${block.id}`}
                  value={editTextVariant}
                  onChange={(e) => setEditTextVariant(e.target.value as 'h1' | 'h2' | 'h3' | 'paragraph')}
                  className="w-full px-3 py-2 bg-white dark:bg-notion-dark-sidebar text-gray-900 dark:text-notion-dark-textSoft border border-gray-300 dark:border-notion-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="paragraph">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
              </div>
            </>
          )}

          {/* Image block edit form */}
          {block.type === 'image' && (
            <>
              <div>
                <label htmlFor={`edit-url-${block.id}`} className="block text-sm font-semibold text-gray-700 dark:text-notion-dark-textSoft mb-2">
                  Image URL
                </label>
                <input
                  id={`edit-url-${block.id}`}
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-notion-dark-sidebar text-gray-900 dark:text-notion-dark-textSoft border border-gray-300 dark:border-notion-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-notion-dark-textMuted"
                />
                {/* Button to trigger dimension auto-detection from URL */}
                <button
                  type="button"
                  onClick={handleDetectDimensions}
                  disabled={isDetectingDimensions || !editImageUrl.trim()}
                  className="mt-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDetectingDimensions ? 'Detecting...' : 'Detect Size'}
                </button>
              </div>

              {/* Show dimension detection errors with option to proceed manually */}
              {dimensionDetectionError && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    {dimensionDetectionError}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    You can enter dimensions manually below.
                  </p>
                </div>
              )}

              {/* Dimension inputs with auto-detection helper text */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`edit-width-${block.id}`} className="block text-sm font-semibold text-gray-700 dark:text-notion-dark-textSoft mb-2">
                    Width (px)
                  </label>
                  <input
                    id={`edit-width-${block.id}`}
                    type="number"
                    value={editImageWidth}
                    onChange={(e) => setEditImageWidth(e.target.value)}
                    placeholder={detectedWidth || undefined}
                    min="1"
                    className="w-full px-3 py-2 bg-white dark:bg-notion-dark-sidebar text-gray-900 dark:text-notion-dark-textSoft border border-gray-300 dark:border-notion-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-notion-dark-textMuted"
                  />
                </div>
                <div>
                  <label htmlFor={`edit-height-${block.id}`} className="block text-sm font-semibold text-gray-700 dark:text-notion-dark-textSoft mb-2">
                    Height (px)
                  </label>
                  <input
                    id={`edit-height-${block.id}`}
                    type="number"
                    value={editImageHeight}
                    onChange={(e) => setEditImageHeight(e.target.value)}
                    placeholder={detectedHeight || undefined}
                    min="1"
                    className="w-full px-3 py-2 bg-white dark:bg-notion-dark-sidebar text-gray-900 dark:text-notion-dark-textSoft border border-gray-300 dark:border-notion-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-notion-dark-textMuted"
                  />
                </div>
              </div>

              {/* Helper text explaining auto-detection */}
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {detectedWidth && detectedHeight ? (
                  <>Auto-detected dimensions shown as placeholders. Leave fields empty to use them, or enter custom values.</>
                ) : (
                  <>Dimensions will auto-detect when entering edit mode. Click 'Detect Size' to re-run detection.</>
                )}
              </p>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-notion-dark-textSoft font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Display mode rendering with drag-and-drop support
  // Select block on click to show Edit/Delete buttons
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't auto-select when clicking in the container
    // Selection only happens when clicking the drag handle
    return
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onDragOver={handleDragOverEvent}
      onDragLeave={handleDragLeaveEvent}
      onDrop={handleDropEvent}
      className={`${containerClasses} group`}
      role="article"
      aria-selected={isSelected}
      data-block-container
    >
      {/* Drop position indicator line */}
      {isDragOver && dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500 dark:bg-gray-400 -mt-0.5 rounded-full z-10" />
      )}
      {isDragOver && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-500 dark:bg-gray-400 -mb-0.5 rounded-full z-10" />
      )}

      {/* Hover '+' button for inline block creation */}
      <button
        onClick={handlePlusClick}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 hover:text-white text-gray-600 dark:text-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
        aria-label="Insert block"
        title="Add block below"
      >
        +
      </button>

      <div className="flex items-start gap-3">
        {/* Drag handle - appears on hover or when block is selected */}
        <div
          draggable
          onDragStart={handleDragStartEvent}
          onDragEnd={handleDragEndEvent}
          onClick={(e) => {
            e.stopPropagation()
            // Only select if not dragging
            if (!isDragging) {
              onSelect()
            }
          }}
          role="button"
          aria-label="Drag to reorder"
          tabIndex={0}
          className={`
            flex-shrink-0 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 select-none
            cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 rounded
            transition-opacity duration-200
            ${isDragging ? 'cursor-grabbing opacity-100' : ''}
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `.trim()}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          <span className="text-lg leading-none">⋮⋮</span>
        </div>

        {/* Block content wrapper */}
        <div className="flex-1 min-w-0">
          {/* Edit/Delete buttons only visible when block is selected */}
          {isSelected && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                  handleEdit()
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(block.id)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}

      {/* Block content rendering using discriminated union */}
      {/* Text blocks use contentEditable for inline typing, slash commands, and Enter key */}
      {block.type === 'text' && (
        <>
          {block.styles.variant === 'h1' && (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInlineInput}
              onKeyDown={handleInlineKeyDown}
              onBlur={handleInlineBlur}
              onFocus={() => setInlineContent(block.content)}
              onClick={(e) => e.stopPropagation()}
              suppressContentEditableWarning
              className="m-0 text-3xl font-bold leading-tight text-gray-900 dark:text-notion-dark-textSoft outline-none"
            >
              {block.content}
            </div>
          )}
          {block.styles.variant === 'h2' && (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInlineInput}
              onKeyDown={handleInlineKeyDown}
              onBlur={handleInlineBlur}
              onFocus={() => setInlineContent(block.content)}
              onClick={(e) => e.stopPropagation()}
              suppressContentEditableWarning
              className="m-0 text-2xl font-bold leading-snug text-gray-900 dark:text-notion-dark-textSoft outline-none"
            >
              {block.content}
            </div>
          )}
          {block.styles.variant === 'h3' && (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInlineInput}
              onKeyDown={handleInlineKeyDown}
              onBlur={handleInlineBlur}
              onFocus={() => setInlineContent(block.content)}
              onClick={(e) => e.stopPropagation()}
              suppressContentEditableWarning
              className="m-0 text-xl font-semibold leading-normal text-gray-900 dark:text-notion-dark-textSoft outline-none"
            >
              {block.content}
            </div>
          )}
          {block.styles.variant === 'paragraph' && (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInlineInput}
              onKeyDown={handleInlineKeyDown}
              onBlur={handleInlineBlur}
              onFocus={() => setInlineContent(block.content)}
              onClick={(e) => e.stopPropagation()}
              suppressContentEditableWarning
              className="m-0 text-base font-normal leading-relaxed text-gray-900 dark:text-notion-dark-textSoft outline-none"
            >
              {block.content}
            </div>
          )}
        </>
      )}

      {/* Image blocks remain static in display mode */}
      {block.type === 'image' && (
        <img
          src={block.content}
          width={block.styles.width}
          height={block.styles.height}
          alt="Block image"
          loading="lazy"
          decoding="async"
          className="block max-w-full h-auto rounded object-cover shadow-sm"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E'
          }}
        />
      )}
        </div>
      </div>
    </div>
  )
}
