// Client component that fetches and displays blocks with drag-and-drop reordering

'use client'

import { useState, useEffect } from 'react'
import type { Block } from '@/lib/types'
import { Block as BlockComponent } from '@/components/Block'

export default function Home() {
  // State management for blocks, loading, and error states
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drag-and-drop state
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

  // Fetch blocks on component mount
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await fetch('/api/blocks')

        if (!response.ok) {
          throw new Error('Failed to fetch blocks')
        }

        const data = await response.json()

        // Validate response is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid response: expected an array of blocks')
        }

        setBlocks(data as Block[])
        setLoading(false)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }

    fetchBlocks()
  }, [])

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setDraggedBlockId(id)
  }

  const handleDragEnd = () => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
    setDropPosition(null)
  }

  const handleDragOver = (id: string, position: 'before' | 'after') => {
    if (draggedBlockId && draggedBlockId !== id) {
      setDragOverBlockId(id)
      setDropPosition(position)
    }
  }

  const handleDragLeave = (id: string) => {
    // Clear drag-over highlight only if leaving the current drag-over block
    if (dragOverBlockId === id) {
      setDragOverBlockId(null)
      setDropPosition(null)
    }
  }

  const handleDrop = async (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) {
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      setDropPosition(null)
      return
    }

    // Reorder blocks in memory
    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId)
    const targetIndex = blocks.findIndex((b) => b.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBlockId(null)
      setDragOverBlockId(null)
      setDropPosition(null)
      return
    }

    const reorderedBlocks = [...blocks]
    const [draggedBlock] = reorderedBlocks.splice(draggedIndex, 1)

    // Calculate insert position based on drop position
    let insertIndex = targetIndex
    if (dropPosition === 'after') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    }

    reorderedBlocks.splice(insertIndex, 0, draggedBlock)

    // Clear drag state
    setDraggedBlockId(null)
    setDragOverBlockId(null)
    setDropPosition(null)

    // Update local state optimistically
    setBlocks(reorderedBlocks)

    // Persist new order to server
    try {
      const response = await fetch('/api/blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderedBlocks.map(b => b.id))
      })

      if (!response.ok) {
        throw new Error('Failed to reorder blocks')
      }
    } catch (err) {
      // Rollback on error
      setError(err instanceof Error ? err.message : 'Failed to reorder blocks')
      // Refetch to restore correct order
      const response = await fetch('/api/blocks')
      if (response.ok) {
        const data = await response.json()
        setBlocks(data)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto p-8">
        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-gray-500">
            <p>Loading blocks...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
            <p>Failed to load blocks. Please try again.</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success state: render blocks */}
        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {blocks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No blocks yet. Start by creating some content!</p>
              </div>
            ) : (
              blocks.map((block) => (
                <BlockComponent
                  key={block.id}
                  block={block}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  isDragging={draggedBlockId === block.id}
                  isDragOver={dragOverBlockId === block.id}
                  dropPosition={dragOverBlockId === block.id ? dropPosition : null}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
