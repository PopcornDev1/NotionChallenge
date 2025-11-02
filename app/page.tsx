// Client component that manages multi-page block editor
// Implements pages with sidebar navigation and page-scoped block management
// Inline block creation via hover '+' buttons, BlockMenu, slash commands, and Enter key
// Flow: hover '+' → menu → block creation → persistence
//
// ID GENERATION CONTRACT:
// - All block and page IDs are client-generated using crypto.randomUUID()
// - Server accepts and preserves client-supplied UUIDs without reassignment
// - This enables optimistic UI where blocks/pages appear immediately with final IDs
// - Never use Date.now() for ID generation (not guaranteed unique)

'use client'

import { useState, useEffect, useRef } from 'react'
import type { Block, Page } from '@/lib/types' // New imports for multi-page functionality
import { Block as BlockComponent } from '@/components/Block'
import BlockMenu from '@/components/BlockMenu' // Inline creation menu
import EmptyBlock from '@/components/EmptyBlock' // Placeholder at page bottom
import { Sidebar } from '@/components/Sidebar' // Sidebar navigation
import { generateBlockId, generatePageId } from '@/lib/client/uuid' // UUID generation
import ThemeToggle from '@/components/ThemeToggle' // Theme toggle component
import ImageModal from '@/components/ImageModal' // Image modal for URL input and dimension detection

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

  // Inline creation state - BlockMenu management
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false)
  const [blockMenuPosition, setBlockMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [blockMenuContext, setBlockMenuContext] = useState<{ blockId: string | null; insertPosition: 'after' | 'bottom' }>({
    blockId: null,
    insertPosition: 'bottom'
  })

  // Focus management for newly created blocks
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)

  // Selection state for clean block UX - only one block selected at a time
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  // Image modal state for inline image block creation with dimension detection
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [imageModalContext, setImageModalContext] = useState<{ blockId: string | null; insertPosition: 'after' | 'bottom' }>({
    blockId: null,
    insertPosition: 'bottom'
  })

  // Page title editing state for inline renaming in main content area
  const [isEditingPageTitle, setIsEditingPageTitle] = useState(false)
  const [editingPageTitle, setEditingPageTitle] = useState('')
  const [pageTitleError, setPageTitleError] = useState<string | null>(null)

  // State for showing EmptyBlock (only show when user clicks the empty area)
  const [showEmptyBlock, setShowEmptyBlock] = useState(false)

  // Ref to track background refresh AbortController
  const refreshControllerRef = useRef<AbortController | null>(null)

  // Fetch pages on component mount - pages fetch
  useEffect(() => {
    const fetchPages = async (signal?: AbortSignal) => {
      try {
        const response = await fetch('/api/pages', { signal })

        if (!response.ok) {
          throw new Error('Failed to fetch pages')
        }

        const data = await response.json()

        // Validate response is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid response: expected an array of pages')
        }

        if (!signal?.aborted) {
          setPages(data as Page[])
          setPagesLoading(false)
          setPagesError(null)
        }
      } catch (err) {
        // Ignore AbortError - component was unmounted
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }

        // Handle other errors
        if (!signal?.aborted) {
          setPagesError(err instanceof Error ? err.message : 'An error occurred')
          setPagesLoading(false)
        }
      }
    }

    const controller = new AbortController()
    fetchPages(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  // Auto-select first page - auto-selection of first page for better UX
  useEffect(() => {
    if (pages.length > 0 && selectedPageId === null) {
      setSelectedPageId(pages[0].id)
    }
  }, [pages, selectedPageId])

  // Load sidebar collapse state from localStorage on mount - persistent sidebar state across sessions
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Load page blocks when selectedPageId changes - page-specific block loading on page selection
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

  // Global keyboard shortcuts - Escape key closes ImageModal or BlockMenu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageModalOpen) {
          handleCloseImageModal()
        } else if (isBlockMenuOpen) {
          handleCloseMenu()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isImageModalOpen, isBlockMenuOpen])

  // Sidebar collapse handler
  const handleToggleSidebar = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    // Persist to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

  // Page selection handler - page selection triggers block loading
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId)
    setError(null)
  }

  // Page creation handler - page creation with immediate selection
  const handleCreatePage = async () => {
    const title = window.prompt('Enter page title:')
    if (!title || title.trim().length === 0) {
      return
    }

    // Generate page ID client-side - preserved by server
    const newPageId = generatePageId()
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
  // Uses single-page endpoint for efficiency instead of bulk updates
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

    // Persist single updated page to server (more efficient than bulk update)
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

  // Inline creation handlers

  // Opens BlockMenu for inserting block after specific block
  const handleOpenMenuForBlock = (blockId: string, position: { x: number; y: number }) => {
    setIsBlockMenuOpen(true)
    setBlockMenuPosition(position)
    setBlockMenuContext({ blockId, insertPosition: 'after' })
  }

  // Opens BlockMenu for inserting block at page bottom (from EmptyBlock)
  const handleOpenMenuForEmpty = (position: { x: number; y: number }) => {
    setIsBlockMenuOpen(true)
    setBlockMenuPosition(position)
    setBlockMenuContext({ blockId: null, insertPosition: 'bottom' })
  }

  // Closes BlockMenu and clears context
  const handleCloseMenu = () => {
    setIsBlockMenuOpen(false)
    setBlockMenuPosition(null)
    setBlockMenuContext({ blockId: null, insertPosition: 'bottom' })
  }

  // Opens ImageModal for image block creation, preserving insertion context
  const handleOpenImageModal = (context: { blockId: string | null; insertPosition: 'after' | 'bottom' }) => {
    setIsImageModalOpen(true)
    setImageModalContext(context)
  }

  // Closes ImageModal and clears context
  const handleCloseImageModal = () => {
    setIsImageModalOpen(false)
    setImageModalContext({ blockId: null, insertPosition: 'bottom' })
  }

  // Creates image block with user-provided URL and dimensions, inserts at correct position
  const handleConfirmImageModal = async (url: string, width: number, height: number) => {
    if (!selectedPageId) return

    // Generate new block ID - client-generated, preserved by server
    const newBlockId = generateBlockId()

    // Create new ImageBlock
    const newBlock: Block = {
      id: newBlockId,
      type: 'image',
      content: url,
      styles: { width, height }
    }

    // Determine insertion position from imageModalContext
    let updatedBlocks: Block[]
    if (imageModalContext.blockId) {
      // Insert after specific block
      const blockIndex = blocks.findIndex((b) => b.id === imageModalContext.blockId)
      if (blockIndex !== -1) {
        updatedBlocks = [
          ...blocks.slice(0, blockIndex + 1),
          newBlock,
          ...blocks.slice(blockIndex + 1)
        ]
      } else {
        updatedBlocks = [...blocks, newBlock]
      }
    } else {
      // Append to end
      updatedBlocks = [...blocks, newBlock]
    }

    // Close modal immediately for better UX
    handleCloseImageModal()

    // Update local state and persist
    await updatePageBlocks(selectedPageId, updatedBlocks)

    // Focus newly created block
    setFocusBlockId(newBlockId)
  }

  // Creates and inserts new block from BlockMenu selection
  const handleSelectBlockType = async (type: 'text' | 'image', variant?: 'h1' | 'h2' | 'h3' | 'paragraph') => {
    if (!selectedPageId) return

    // Image blocks now go through ImageModal for dimension detection
    if (type === 'image') {
      handleCloseMenu() // Close BlockMenu first
      handleOpenImageModal(blockMenuContext)
      return
    }

    // Generate new block ID - client-generated, preserved by server
    const newBlockId = generateBlockId()

    // Build new block object for text types
    const newBlock: Block = {
      id: newBlockId,
      type: 'text',
      content: '',
      styles: { variant: variant || 'paragraph' }
    }

    // Determine insertion position from context
    let updatedBlocks: Block[]
    if (blockMenuContext.blockId) {
      // Insert after specific block
      const blockIndex = blocks.findIndex((b) => b.id === blockMenuContext.blockId)
      if (blockIndex !== -1) {
        updatedBlocks = [
          ...blocks.slice(0, blockIndex + 1),
          newBlock,
          ...blocks.slice(blockIndex + 1)
        ]
      } else {
        updatedBlocks = [...blocks, newBlock]
      }
    } else {
      // Append to end
      updatedBlocks = [...blocks, newBlock]
    }

    // Close menu immediately for better UX
    handleCloseMenu()

    // Update local state and persist
    await updatePageBlocks(selectedPageId, updatedBlocks)

    // Focus newly created block
    setFocusBlockId(newBlockId)
  }

  // Direct insertion after block (used by Enter key and slash commands)
  const handleInsertBlockAfter = async (currentBlockId: string, type: 'text' | 'image', variant?: 'h1' | 'h2' | 'h3' | 'paragraph') => {
    if (!selectedPageId) return

    // Image insertion via Enter key or slash command opens modal
    if (type === 'image') {
      handleOpenImageModal({ blockId: currentBlockId, insertPosition: 'after' })
      return
    }

    // Generate new block ID - client-generated, preserved by server
    const newBlockId = generateBlockId()

    // Build new block for text types
    const newBlock: Block = {
      id: newBlockId,
      type: 'text',
      content: '',
      styles: { variant: variant || 'paragraph' }
    }

    // Insert after current block
    const blockIndex = blocks.findIndex((b) => b.id === currentBlockId)
    const updatedBlocks = blockIndex !== -1
      ? [
          ...blocks.slice(0, blockIndex + 1),
          newBlock,
          ...blocks.slice(blockIndex + 1)
        ]
      : [...blocks, newBlock]

    // Update local state and persist
    await updatePageBlocks(selectedPageId, updatedBlocks)

    // Focus newly created block
    setFocusBlockId(newBlockId)
  }

  // Creates block from EmptyBlock component
  const handleCreateFromEmpty = async (content: string, variant: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image') => {
    if (!selectedPageId) return

    // Image creation from EmptyBlock opens modal
    if (variant === 'image') {
      handleOpenImageModal({ blockId: null, insertPosition: 'bottom' })
      return
    }

    // Generate new block ID - client-generated, preserved by server
    const newBlockId = generateBlockId()

    // Build new block for text types
    const newBlock: Block = {
      id: newBlockId,
      type: 'text',
      content,
      styles: { variant }
    }

    // Append to end
    const updatedBlocks = [...blocks, newBlock]

    // Hide EmptyBlock after creating the block
    setShowEmptyBlock(false)

    // Update local state and persist
    await updatePageBlocks(selectedPageId, updatedBlocks)
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

    // Clear selection after block operations for clean state
    handleDeselectBlock()

    // Persist new order to server - page-scoped reordering
    // updatePageBlocks handles both setPages and setBlocks
    if (selectedPageId) {
      updatePageBlocks(selectedPageId, reorderedBlocks)
    }
  }

  // Update block handler - page-scoped block updates
  const handleUpdateBlock = async (id: string, updates: Omit<Block, 'id'>): Promise<void> => {
    // Calculate updated blocks
    const updatedBlocks = blocks.map((block) =>
      block.id === id ? { id, ...updates } as Block : block
    )

    // Update the selected page's blocks in pages state
    // updatePageBlocks handles both setPages and setBlocks with rollback
    if (selectedPageId) {
      await updatePageBlocks(selectedPageId, updatedBlocks)
    }
  }

  // Delete block handler - page-scoped block deletion
  const handleDeleteBlock = async (id: string): Promise<void> => {
    // Calculate updated blocks with deleted block removed
    const updatedBlocks = blocks.filter((block) => block.id !== id)

    // Update the selected page's blocks in pages state
    // updatePageBlocks handles both setPages and setBlocks with rollback
    if (selectedPageId) {
      await updatePageBlocks(selectedPageId, updatedBlocks)
    }

    // Clear selection after block operations for clean state
    handleDeselectBlock()
  }

  // Handle page renaming from Sidebar with optimistic update and error rollback
  const handleRenamePage = async (pageId: string, newTitle: string): Promise<void> => {
    // Validate newTitle is non-empty after trim
    const trimmedTitle = newTitle.trim()
    if (!trimmedTitle) {
      return
    }

    // Find page in pages array by pageId
    const page = pages.find((p) => p.id === pageId)
    if (!page) {
      console.error('Page not found:', pageId)
      return
    }

    // Create updated page object
    const updatedPage = { ...page, title: trimmedTitle }

    // Store previous pages for rollback (shallow copy)
    const previousPages = [...pages]

    // Optimistically update pages state
    setPages(pages.map((p) => (p.id === pageId ? updatedPage : p)))

    try {
      // Make PUT request to API
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPage),
      })

      if (!response.ok) {
        throw new Error('Failed to rename page')
      }
    } catch (err) {
      // Rollback on error
      setPages(previousPages)
      // Re-throw error so Sidebar can catch it and show inline error
      throw err
    }
  }

  // Select block to show Edit/Delete buttons and border
  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId)
  }

  // Deselect block to hide controls and return to clean view
  const handleDeselectBlock = () => {
    setSelectedBlockId(null)
  }

  // Enter edit mode for main page title on click
  const handlePageTitleClick = () => {
    if (isEditingPageTitle) return // Prevent re-entering edit mode
    setIsEditingPageTitle(true)
    setEditingPageTitle(selectedPage?.title || '')
    setPageTitleError(null) // Clear any previous errors
  }

  // Track page title changes as user types
  const handlePageTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingPageTitle(e.target.value)
  }

  // Save page title changes with validation and optimistic update
  const handlePageTitleSave = async () => {
    const trimmedTitle = editingPageTitle.trim()

    if (!trimmedTitle) {
      // Revert to original title if empty
      setIsEditingPageTitle(false)
      setEditingPageTitle('')
      setPageTitleError(null)
      return
    }

    // Only save if changed from original
    if (trimmedTitle !== selectedPage?.title && selectedPageId) {
      try {
        await handleRenamePage(selectedPageId, trimmedTitle)
        // Clear error on success
        setPageTitleError(null)
      } catch (err) {
        // Keep edit state open on error
        setPageTitleError(err instanceof Error ? err.message : 'Failed to rename page')
        return // Don't exit edit mode on error
      }
    }

    // Exit edit mode only on success or no change
    setIsEditingPageTitle(false)
    setEditingPageTitle('')
    setPageTitleError(null)
  }

  // Cancel page title editing without saving
  const handlePageTitleCancel = () => {
    setIsEditingPageTitle(false)
    setEditingPageTitle('')
    setPageTitleError(null)
  }

  // Keyboard shortcuts for page title editing
  const handlePageTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handlePageTitleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handlePageTitleCancel()
    }
  }

  // Auto-save page title on blur
  const handlePageTitleBlur = () => {
    handlePageTitleSave()
  }

  // Deselect block when clicking outside block area and hide EmptyBlock
  const handleMainClick = (e: React.MouseEvent<HTMLElement>) => {
    // Check if click is outside any block container
    if (!(e.target as HTMLElement).closest('[data-block-container]')) {
      handleDeselectBlock()
    }

    // Hide EmptyBlock if clicking outside of it (check if target has data-empty-area or is inside EmptyBlock)
    const target = e.target as HTMLElement
    const isEmptyAreaClick = target.hasAttribute('data-empty-area')
    const isInsideEmptyBlock = target.closest('[data-empty-block]')

    if (!isEmptyAreaClick && !isInsideEmptyBlock && showEmptyBlock) {
      setShowEmptyBlock(false)
    }
  }

  // Handle click on empty area below blocks to show EmptyBlock
  const handleEmptyAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation() // Prevent triggering main click handler
    setShowEmptyBlock(true)
  }

  // Handle page deletion
  const handleDeletePage = async (pageId: string): Promise<void> => {
    // Capture snapshot of previous state BEFORE applying optimistic changes
    const previousPages = [...pages]
    const previousSelectedPageId = selectedPageId

    // Optimistically remove page from UI
    const updatedPages = pages.filter((p) => p.id !== pageId)
    setPages(updatedPages)

    // If deleting the selected page, select another page
    if (selectedPageId === pageId) {
      setSelectedPageId(updatedPages.length > 0 ? updatedPages[0].id : null)
    }

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete page')
      }
    } catch (err) {
      // Rollback on error
      console.error('Failed to delete page:', err)
      setPages(previousPages)
      setSelectedPageId(previousSelectedPageId)

      // Surface error to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete page'
      setError(errorMessage)

      // Re-throw to allow sidebar to handle
      throw err
    }
  }

  // Handle page reordering
  const handleReorderPages = async (newPages: Page[]): Promise<void> => {
    // Capture snapshot of previous state BEFORE applying optimistic changes
    const previousPages = [...pages]

    // Optimistically update pages order
    setPages(newPages)

    try {
      // Persist all pages with new order
      const response = await fetch('/api/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPages)
      })

      if (!response.ok) {
        throw new Error('Failed to reorder pages')
      }
    } catch (err) {
      // Rollback on error
      console.error('Failed to reorder pages:', err)
      setPages(previousPages)

      // Surface error to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder pages'
      setError(errorMessage)

      // Re-throw to allow sidebar to handle
      throw err
    }
  }

  // Find selected page for title display
  const selectedPage = pages.find((p) => p.id === selectedPageId)

  return (
    // Two-column layout with sidebar
    <div className="flex min-h-screen bg-white dark:bg-notion-dark-bg">
      {/* Theme toggle button */}
      <ThemeToggle />

      {/* Sidebar integration for page navigation */}
      {/* Pass rename, delete, and reorder handlers to Sidebar */}
      <Sidebar
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onRenamePage={handleRenamePage}
        onDeletePage={handleDeletePage}
        onReorderPages={handleReorderPages}
      />

      {/* Main content area */}
      {/* Handle clicks outside blocks for deselection */}
      <main
        className={`flex-1 p-8 text-gray-900 dark:text-notion-dark-textSoft ${isSidebarCollapsed ? 'ml-12' : 'ml-64'} transition-all duration-300 ease-in-out`}
        onClick={handleMainClick}
      >
        {/* Dual loading states for pages and blocks */}
        {pagesLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-notion-dark-textMuted">
            <p>Loading pages...</p>
          </div>
        )}

        {/* Separate error handling for pages and blocks */}
        {pagesError && (
          <div className="max-w-3xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-900 dark:text-red-200">
            <p>Failed to load pages. Please refresh the page.</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pagesError}</p>
          </div>
        )}

        {/* Empty state guidance */}
        {!pagesLoading && !pagesError && pages.length === 0 && (
          <div className="text-center py-12 px-8 text-gray-500 dark:text-notion-dark-textMuted text-lg">
            <p className="mb-4">No pages yet. Create your first page!</p>
            <button
              onClick={handleCreatePage}
              className="px-6 py-3 bg-gray-700 dark:bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
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
              <div className="text-center py-12 px-8 text-gray-500 dark:text-notion-dark-textMuted text-lg">
                <p>Select a page from the sidebar to get started</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {/* Display selected page title with click-to-edit functionality */}
                {isEditingPageTitle ? (
                  // Inline input for editing page title in main content area with error handling
                  <div className="mb-4">
                    <input
                      type="text"
                      value={editingPageTitle}
                      onChange={handlePageTitleChange}
                      onKeyDown={handlePageTitleKeyDown}
                      onBlur={handlePageTitleBlur}
                      autoFocus
                      className={`text-4xl font-bold text-gray-900 dark:text-notion-dark-textSoft bg-transparent border-2 rounded px-2 py-1 focus:outline-none focus:ring-2 w-full transition-all ${
                        pageTitleError
                          ? 'border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600'
                          : 'border-gray-400 dark:border-gray-500 focus:ring-gray-400 dark:focus:ring-gray-500'
                      }`}
                    />
                    {pageTitleError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 px-2">
                        {pageTitleError}
                      </p>
                    )}
                  </div>
                ) : (
                  // Click to edit page title inline
                  <h1
                    onClick={handlePageTitleClick}
                    className="text-4xl font-bold mb-4 text-gray-900 dark:text-notion-dark-textSoft cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 transition-colors"
                  >
                    {selectedPage?.title}
                  </h1>
                )}

                {/* Divider below title */}
                <div className="border-b border-gray-200 dark:border-notion-dark-border mb-8"></div>

                {/* Page context propagation to child components */}
                {selectedPageId && (
                  <>
                    {/* Loading state for page blocks */}
                    {loading && (
                      <div className="text-center py-8 text-gray-500 dark:text-notion-dark-textMuted">
                        <p>Loading blocks...</p>
                      </div>
                    )}

                    {/* Error state for blocks */}
                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-900 dark:text-red-200">
                        <p>Failed to load blocks. Please try again.</p>
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                      </div>
                    )}

                    {/* Success state: render blocks with inline creation */}
                    {!loading && !error && (
                      <div className="flex flex-col gap-4">
                    {/* Render all blocks with inline creation features */}
                    {/* Pass selection state and handler to each block for clean UX */}
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
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => handleSelectBlock(block.id)}
                        dropPosition={dragOverBlockId === block.id ? dropPosition : null}
                        onInsertBlockAfter={handleInsertBlockAfter}
                        onOpenMenuForBlock={handleOpenMenuForBlock}
                        shouldFocus={focusBlockId === block.id}
                        onFocusComplete={() => setFocusBlockId(null)}
                      />
                    ))}

                    {/* Empty placeholder block at bottom for starting new content */}
                    {/* Only show when user clicks in empty space */}
                    {showEmptyBlock ? (
                      <div data-empty-block>
                        <EmptyBlock
                          onCreateBlock={handleCreateFromEmpty}
                          onOpenMenu={handleOpenMenuForEmpty}
                        />
                      </div>
                    ) : (
                      <div
                        data-empty-area
                        className="min-h-[200px] cursor-text"
                        onClick={handleEmptyAreaClick}
                        aria-label="Click to add content"
                      />
                    )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* BlockMenu integration for inline block type selection */}
      {/* Pass image selection handler to open ImageModal */}
      <BlockMenu
        isOpen={isBlockMenuOpen}
        position={blockMenuPosition || { x: 0, y: 0 }}
        onSelectType={handleSelectBlockType}
        onSelectImage={() => {
          handleCloseMenu()
          handleOpenImageModal(blockMenuContext)
        }}
        onClose={handleCloseMenu}
      />

      {/* ImageModal for image block creation with URL input and dimension detection */}
      <ImageModal
        isOpen={isImageModalOpen}
        onConfirm={handleConfirmImageModal}
        onClose={handleCloseImageModal}
      />
    </div>
  )
}
