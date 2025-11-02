// Block component that renders a single block based on its type
// Uses TypeScript discriminated unions for type-safe rendering
// Supports drag-and-drop reordering

'use client'

import type { Block } from '@/lib/types'

interface BlockProps {
  block: Block
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: (id: string, position: 'before' | 'after') => void
  onDragLeave: (id: string) => void
  onDrop: (id: string) => void
  isDragging: boolean
  isDragOver: boolean
  dropPosition: 'before' | 'after' | null
}

export function Block({
  block,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  isDragOver,
  dropPosition
}: BlockProps) {
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

  return (
    <div
      onDragOver={handleDragOverEvent}
      onDragLeave={handleDragLeaveEvent}
      onDrop={handleDropEvent}
      className={containerClasses}
      role="article"
    >
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
