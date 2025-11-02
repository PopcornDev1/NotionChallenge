// Block component that renders a single block based on its type
// Uses TypeScript discriminated unions for type-safe rendering
// Supports drag-and-drop reordering and inline editing

'use client'

import { useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { Block } from '@/lib/types'
import { validateBlockEdit } from '@/lib/client/validation'

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
  onOpenMenuForBlock: (blockId: string, position: { x: number; y: number }) => void
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
  onOpenMenuForBlock
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

  // Enter edit mode and populate form fields
  const handleEdit = () => {
    setError(null)

    if (block.type === 'text') {
      setEditTextContent(block.content)
      setEditTextVariant(block.styles.variant)
    } else if (block.type === 'image') {
      setEditImageUrl(block.content)
      setEditImageWidth(block.styles.width.toString())
      setEditImageHeight(block.styles.height.toString())
    }

    setIsEditing(true)
  }

  // Cancel edit mode and discard changes
  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
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
      const widthNum = parseInt(editImageWidth)
      const heightNum = parseInt(editImageHeight)

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

  // Container ref for menu positioning
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle '+' button click to open menu
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

  // Container classes with drag states
  const containerClasses = `
    p-4 rounded-lg transition-all relative group
    ${isDragging ? 'opacity-40' : 'bg-white'}
    ${isDragOver ? 'bg-gray-100' : ''}
  `.trim()

  // Edit mode rendering
  if (isEditing) {
    return (
      <div className="p-4 bg-white border-2 border-gray-400 rounded-lg shadow-lg">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <div className="flex justify-between items-start">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 ml-2"
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
                <label htmlFor={`edit-content-${block.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id={`edit-content-${block.id}`}
                  value={editTextContent}
                  onChange={(e) => setEditTextContent(e.target.value)}
                  placeholder="Enter your text..."
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-vertical placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor={`edit-variant-${block.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                  Style
                </label>
                <select
                  id={`edit-variant-${block.id}`}
                  value={editTextVariant}
                  onChange={(e) => setEditTextVariant(e.target.value as 'h1' | 'h2' | 'h3' | 'paragraph')}
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
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
                <label htmlFor={`edit-url-${block.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  id={`edit-url-${block.id}`}
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`edit-width-${block.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                    Width (px)
                  </label>
                  <input
                    id={`edit-width-${block.id}`}
                    type="number"
                    value={editImageWidth}
                    onChange={(e) => setEditImageWidth(e.target.value)}
                    placeholder="800"
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor={`edit-height-${block.id}`} className="block text-sm font-semibold text-gray-700 mb-2">
                    Height (px)
                  </label>
                  <input
                    id={`edit-height-${block.id}`}
                    type="number"
                    value={editImageHeight}
                    onChange={(e) => setEditImageHeight(e.target.value)}
                    placeholder="600"
                    min="1"
                    required
                    className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent placeholder:text-gray-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Display mode rendering with drag-and-drop support
  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOverEvent}
      onDragLeave={handleDragLeaveEvent}
      onDrop={handleDropEvent}
      className={containerClasses}
      role="article"
    >
      {/* Hover '+' button for inline block creation */}
      <button
        onClick={handlePlusClick}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-400 hover:text-white text-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
        aria-label="Open block menu"
        title="Add block"
      >
        +
      </button>

      {/* Drop position indicator line */}
      {isDragOver && dropPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-500 -mt-0.5 rounded-full z-10" />
      )}
      {isDragOver && dropPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-500 -mb-0.5 rounded-full z-10" />
      )}

      <div className="flex items-start gap-3">
        {/* Drag handle - appears on hover */}
        <div
          draggable
          onDragStart={handleDragStartEvent}
          onDragEnd={handleDragEndEvent}
          role="button"
          aria-label="Drag to reorder"
          tabIndex={0}
          className={`
            flex-shrink-0 text-gray-400 hover:text-gray-600 select-none
            cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded
            transition-opacity duration-200
            ${isDragging ? 'cursor-grabbing opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `.trim()}
        >
          <span className="text-lg leading-none">⋮⋮</span>
        </div>

        {/* Block content wrapper */}
        <div className="flex-1 min-w-0">
          {/* Edit/Delete buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleEdit}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-semibold rounded hover:bg-gray-300 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(block.id)}
              className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          </div>

          {/* Block content rendering using discriminated union */}
          {/* Text blocks display with appropriate heading or paragraph styles */}
          {block.type === 'text' && (
            <>
              {block.styles.variant === 'h1' && (
                <div className="m-0 text-3xl font-bold leading-tight text-gray-900">
                  {block.content}
                </div>
              )}
              {block.styles.variant === 'h2' && (
                <div className="m-0 text-2xl font-bold leading-snug text-gray-900">
                  {block.content}
                </div>
              )}
              {block.styles.variant === 'h3' && (
                <div className="m-0 text-xl font-semibold leading-normal text-gray-900">
                  {block.content}
                </div>
              )}
              {block.styles.variant === 'paragraph' && (
                <div className="m-0 text-base font-normal leading-relaxed text-gray-900">
                  {block.content}
                </div>
              )}
            </>
          )}

          {/* Image blocks display with specified dimensions */}
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
