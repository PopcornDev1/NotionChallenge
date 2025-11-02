// Client component that manages multi-page block editor with sidebar

'use client'

import { useState, useEffect } from 'react'
import type { Block, Page } from '@/lib/types'
import { Block as BlockComponent } from '@/components/Block'
import { Sidebar } from '@/components/Sidebar'
import BlockMenu from '@/components/BlockMenu'
import EmptyBlock from '@/components/EmptyBlock'
import { generateBlockId } from '@/lib/client/uuid'

export default function Home() {
  // Pages state - list of all pages
  const [pages, setPages] = useState<Page[]>([])
  // Currently selected page ID
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  // Loading state for pages fetch
  const [pagesLoading, setPagesLoading] = useState(true)
  // Error state for pages fetch
  const [pagesError, setPagesError] = useState<string | null>(null)

  // State management for blocks (now page-specific), loading, and error states
  const [blocks, setBlocks] = useState<Block[]>([]) // Now represents current page's blocks
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drag-and-drop state (scoped to current page)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

  // Block menu state for inline creation
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [menuInsertPosition, setMenuInsertPosition] = useState<{ afterBlockId: string | null }>({ afterBlockId: null })

  // Fetch pages on component mount
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('/api/pages')

        if (!response.ok) {
          throw new Error('Failed to fetch pages')
        }

        const data = await response.json()

        // Validate response is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid response: expected an array of pages')
        }

        setPages(data as Page[])
        setPagesLoading(false)
        setPagesError(null)
      } catch (err) {
        setPagesError(err instanceof Error ? err.message : 'An error occurred')
        setPagesLoading(false)
      }
    }

    fetchPages()
  }, [])

  // Auto-select first page
  useEffect(() => {
    if (pages.length > 0 && selectedPageId === null) {
      setSelectedPageId(pages[0].id)
    }
  }, [pages, selectedPageId])

  // Load sidebar collapse state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Load page blocks when selectedPageId changes
  useEffect(() => {
    if (selectedPageId === null) {
      setBlocks([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Blocks are now extracted from selected page
    const page = pages.find((p) => p.id === selectedPageId)
    if (!page) {
      setError('Page not found')
      setLoading(false)
      return
    }

    setBlocks(page.blocks)
    setLoading(false)
    setError(null)
  }, [selectedPageId, pages])

  // Sidebar collapse handler
  const handleToggleSidebar = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    // Persist to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

  // Page selection handler
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId)
    setError(null)
  }

  // Page creation handler
  const handleCreatePage = async () => {
    const title = window.prompt('Enter page title:')
    if (!title || title.trim().length === 0) {
      return
    }

    // Generate page ID client-side
    const newPageId = Date.now().toString()
    const newPage: Page = {
      id: newPageId,
      title: title.trim(),
      blocks: []
    }

    // Optimistically add to UI
    setPages((prevPages) => [...prevPages, newPage])
    setSelectedPageId(newPageId)

    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPage)
      })

      if (!response.ok) {
        // Rollback on error
        setPages((prevPages) => prevPages.filter((p) => p.id !== newPageId))
        setSelectedPageId(null)
        throw new Error('Failed to create page')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create page')
    }
  }

  // Update page in pages state helper with error rollback
  const updatePageBlocks = async (pageId: string, newBlocks: Block[]) => {
    // Capture snapshot of previous state BEFORE applying optimistic changes
    const previousPages = [...pages]
    const previousBlocks = [...blocks]

    // Apply optimistic updates to both pages and blocks state
    const updatedPages = pages.map((p) =>
      p.id === pageId ? { ...p, blocks: newBlocks } : p
    )
    setPages(updatedPages)
    setBlocks(newBlocks)

    // Persist single updated page to server
    try {
      const page = updatedPages.find((p) => p.id === pageId)
      if (!page) return

      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page)
      })

      if (!response.ok) {
        let errorMessage = 'Failed to persist page changes'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // JSON parsing failed, use default message
        }
        throw new Error(errorMessage)
      }
    } catch (err) {
      // Rollback to previous state on error
      console.error('Failed to persist page changes:', err)
      setPages(previousPages)
      setBlocks(previousBlocks)

      // Surface error to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      setError(errorMessage)

      // Re-throw to allow callers to handle if needed
      throw err
    }
  }

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

  const handleDrop = (targetId: string) => {
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

    // Persist new order to server
    if (selectedPageId) {
      updatePageBlocks(selectedPageId, reorderedBlocks)
    }
  }

  // Update block handler - page-scoped block updates
  const handleUpdateBlock = async (id: string, updates: Omit<Block, 'id'>): Promise<void> => {
    // Calculate updated blocks
    const updatedBlocks = blocks.map((block) =>
      block.id === id ? { id, ...updates } : block
    )

    // Update the selected page's blocks in pages state
    if (selectedPageId) {
      await updatePageBlocks(selectedPageId, updatedBlocks)
    }
  }

  // Delete block handler - page-scoped block deletion
  const handleDeleteBlock = async (id: string): Promise<void> => {
    // Calculate updated blocks with deleted block removed
    const updatedBlocks = blocks.filter((block) => block.id !== id)

    // Update the selected page's blocks in pages state
    if (selectedPageId) {
      await updatePageBlocks(selectedPageId, updatedBlocks)
    }
  }

  // Menu handlers for inline block creation
  const handleOpenMenuForBlock = (blockId: string, position: { x: number; y: number }) => {
    setMenuPosition(position)
    setMenuInsertPosition({ afterBlockId: blockId })
    setIsMenuOpen(true)
  }

  const handleOpenMenuForEmpty = (position: { x: number; y: number }) => {
    setMenuPosition(position)
    setMenuInsertPosition({ afterBlockId: null })
    setIsMenuOpen(true)
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  const handleSelectBlockType = (type: 'text' | 'image', variant?: 'h1' | 'h2' | 'h3' | 'paragraph') => {
    if (!selectedPageId) return

    const newBlockId = generateBlockId()

    let newBlock: Block
    if (type === 'text') {
      newBlock = {
        id: newBlockId,
        type: 'text',
        content: '',
        styles: { variant: variant || 'paragraph' }
      }
    } else {
      // For image, prompt for URL
      const url = window.prompt('Enter image URL:')
      if (!url || !url.trim()) {
        setIsMenuOpen(false)
        return
      }

      newBlock = {
        id: newBlockId,
        type: 'image',
        content: url.trim(),
        styles: { width: 600, height: 400 }
      }
    }

    // Insert block at the correct position
    let updatedBlocks: Block[]
    if (menuInsertPosition.afterBlockId === null) {
      // Insert at end (from EmptyBlock)
      updatedBlocks = [...blocks, newBlock]
    } else {
      // Insert after specific block
      const insertIndex = blocks.findIndex(b => b.id === menuInsertPosition.afterBlockId)
      if (insertIndex !== -1) {
        updatedBlocks = [
          ...blocks.slice(0, insertIndex + 1),
          newBlock,
          ...blocks.slice(insertIndex + 1)
        ]
      } else {
        updatedBlocks = [...blocks, newBlock]
      }
    }

    // Update page blocks
    updatePageBlocks(selectedPageId, updatedBlocks)
    setIsMenuOpen(false)
  }

  const handleCreateBlockFromEmpty = (content: string, variant: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image') => {
    if (!selectedPageId) return

    const newBlockId = generateBlockId()

    let newBlock: Block
    if (variant === 'image') {
      // For image, use content as URL
      newBlock = {
        id: newBlockId,
        type: 'image',
        content: content,
        styles: { width: 600, height: 400 }
      }
    } else {
      newBlock = {
        id: newBlockId,
        type: 'text',
        content: content,
        styles: { variant }
      }
    }

    const updatedBlocks = [...blocks, newBlock]
    updatePageBlocks(selectedPageId, updatedBlocks)
  }

  return (
    // Two-column layout with sidebar
    <div className="flex min-h-screen bg-white">
      {/* Sidebar integration for page navigation */}
      <Sidebar
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main content area */}
      <main
        className={`flex-1 p-8 text-gray-900 ${isSidebarCollapsed ? 'ml-12' : 'ml-64'} transition-all duration-300 ease-in-out`}
      >
        {/* Dual loading states for pages and blocks */}
        {pagesLoading && (
          <div className="text-center py-8 text-gray-500">
            <p>Loading pages...</p>
          </div>
        )}

        {/* Separate error handling for pages and blocks */}
        {pagesError && (
          <div className="max-w-3xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
            <p>Failed to load pages. Please refresh the page.</p>
            <p className="mt-2 text-sm text-red-600">{pagesError}</p>
          </div>
        )}

        {/* Empty state guidance */}
        {!pagesLoading && !pagesError && pages.length === 0 && (
          <div className="text-center py-12 px-8 text-gray-500 text-lg">
            <p className="mb-4">No pages yet. Create your first page!</p>
            <button
              onClick={handleCreatePage}
              className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              + Create Page
            </button>
          </div>
        )}

        {/* Page-specific content display */}
        {!pagesLoading && !pagesError && pages.length > 0 && (
          <>
            {/* No page selected state */}
            {!selectedPageId ? (
              <div className="text-center py-12 px-8 text-gray-500 text-lg">
                <p>Select a page from the sidebar to get started</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {/* Page context propagation to child components */}
                {selectedPageId && (
                  <>
                    {/* Loading state for page blocks */}
                    {loading && (
                      <div className="text-center py-8 text-gray-500">
                        <p>Loading blocks...</p>
                      </div>
                    )}

                    {/* Error state for blocks */}
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                        <p>Failed to load blocks. Please try again.</p>
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {/* Success state: render blocks */}
                    {!loading && !error && (
                      <div className="flex flex-col gap-4">
                        {blocks.map((block) => (
                          <BlockComponent
                            key={block.id}
                            block={block}
                            onUpdate={handleUpdateBlock}
                            onDelete={handleDeleteBlock}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            isDragging={draggedBlockId === block.id}
                            isDragOver={dragOverBlockId === block.id}
                            dropPosition={dragOverBlockId === block.id ? dropPosition : null}
                            onOpenMenuForBlock={handleOpenMenuForBlock}
                          />
                        ))}

                        {/* Empty block placeholder for creating new content */}
                        <EmptyBlock
                          onCreateBlock={handleCreateBlockFromEmpty}
                          onOpenMenu={handleOpenMenuForEmpty}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Block menu for inline creation */}
      <BlockMenu
        isOpen={isMenuOpen}
        position={menuPosition}
        onSelectType={handleSelectBlockType}
        onClose={handleCloseMenu}
      />
    </div>
  )
}
