// Notion-style sidebar component for page navigation with collapsible functionality
// Props enable parent to manage page state and navigation

'use client'

import { useState, useEffect } from 'react'
import type { Page } from '@/lib/types'

interface SidebarProps {
  pages: Page[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onCreatePage: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  onRenamePage: (pageId: string, newTitle: string) => Promise<void> // Callback to parent for persisting page title changes
  onDeletePage: (pageId: string) => Promise<void> // Callback to parent for deleting pages
  onReorderPages: (newPages: Page[]) => Promise<void> // Callback to parent for reordering pages
}

export function Sidebar({
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
  isCollapsed,
  onToggleCollapse,
  onRenamePage,
  onDeletePage,
  onReorderPages
}: SidebarProps) {
  // Local state for inline page renaming - only one page can be renamed at a time
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  // Drag-and-drop state for page reordering
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null)
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null)

  // Page selection state (for showing delete button)
  const [selectedForActionPageId, setSelectedForActionPageId] = useState<string | null>(null)

  // Enter rename mode on double-click, preserving current title for potential cancel
  const handleDoubleClick = (pageId: string, currentTitle: string) => {
    setEditingPageId(pageId)
    setEditingTitle(currentTitle)
    setRenameError(null) // Clear any previous error
  }

  // Track title changes as user types
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value)
  }

  // Save renamed title via parent callback, with validation for non-empty titles
  const handleTitleSave = async (pageId: string) => {
    const trimmedTitle = editingTitle.trim()
    if (!trimmedTitle) {
      // Revert to original title if empty
      setEditingPageId(null)
      setEditingTitle('')
      return
    }

    // Find the current page to compare title
    const currentPage = pages.find((p) => p.id === pageId)
    if (currentPage && trimmedTitle === currentPage.title) {
      // Title unchanged, exit edit mode without API call
      setEditingPageId(null)
      setEditingTitle('')
      setRenameError(null)
      return
    }

    try {
      await onRenamePage(pageId, trimmedTitle)
      // Only clear editing state on success
      setEditingPageId(null)
      setEditingTitle('')
      setRenameError(null)
    } catch (err) {
      // Keep input open on failure, show error
      setRenameError(err instanceof Error ? err.message : 'Failed to rename page')
    }
  }

  // Cancel rename operation without saving changes
  const handleTitleCancel = () => {
    setEditingPageId(null)
    setEditingTitle('')
    setRenameError(null)
  }

  // Keyboard shortcuts for save (Enter) and cancel (Escape)
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, pageId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave(pageId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleTitleCancel()
    }
  }

  // Auto-save on blur (click away) for seamless UX
  const handleTitleBlur = (pageId: string) => {
    handleTitleSave(pageId)
  }

  // Drag-and-drop handlers for page reordering
  const handleDragStart = (pageId: string) => {
    setDraggedPageId(pageId)
  }

  const handleDragEnd = () => {
    setDraggedPageId(null)
    setDragOverPageId(null)
  }

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault()
    if (draggedPageId && draggedPageId !== pageId) {
      setDragOverPageId(pageId)
    }
  }

  const handleDragLeave = () => {
    setDragOverPageId(null)
  }

  const handleDrop = async (targetPageId: string) => {
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      return
    }

    const draggedIndex = pages.findIndex((p) => p.id === draggedPageId)
    const targetIndex = pages.findIndex((p) => p.id === targetPageId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      return
    }

    // Reorder pages array
    const reorderedPages = [...pages]
    const [draggedPage] = reorderedPages.splice(draggedIndex, 1)
    reorderedPages.splice(targetIndex, 0, draggedPage)

    setDraggedPageId(null)
    setDragOverPageId(null)

    // Persist to parent
    await onReorderPages(reorderedPages)
  }

  // Handle page deletion
  const handleDeletePage = async (pageId: string) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      await onDeletePage(pageId)
      setSelectedForActionPageId(null)
    }
  }

  return (
    <aside
      className={`
        ${isCollapsed ? 'w-12' : 'w-64'}
        bg-gray-100 dark:bg-notion-dark-sidebar border-r border-gray-200 dark:border-notion-dark-border flex flex-col transition-all duration-300 ease-in-out
        fixed left-0 top-0 h-screen
      `.trim()}
    >
      {/* Sidebar Header with collapse toggle */}
      <div className="p-4 flex items-center gap-3">
        {/* Collapse/expand toggle button - provides collapse functionality */}
        <button
          onClick={onToggleCollapse}
          aria-label="Toggle sidebar"
          role="button"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 rounded p-1"
        >
          <span className="text-xl">{isCollapsed ? '→' : '←'}</span>
        </button>

        {/* Pages heading - only shown when expanded */}
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-notion-dark-textSoft">Pages</h2>
        )}
      </div>

      {/* Pages List - page list with selection highlighting */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          {pages.length === 0 ? (
            // Empty state guidance
            <div className="text-center py-8 px-4 text-gray-500 dark:text-notion-dark-textMuted text-sm">
              <p>No pages yet. Create your first page!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pages.map((page) => {
                // Check if this page is being edited
                const isEditing = editingPageId === page.id

                return isEditing ? (
                  // Inline input for renaming page title with error feedback
                  <div key={page.id} className="space-y-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={handleTitleChange}
                      onKeyDown={(e) => handleTitleKeyDown(e, page.id)}
                      onBlur={() => handleTitleBlur(page.id)}
                      autoFocus
                      aria-label="Rename page"
                      className={`
                        w-full text-left px-3 py-2 rounded-lg transition-colors
                        ${
                          selectedPageId === page.id
                            ? 'bg-gray-700 dark:bg-gray-600 text-white'
                            : 'bg-white dark:bg-notion-dark-sidebar text-gray-700 dark:text-notion-dark-textSoft'
                        }
                        ${renameError ? 'border-2 border-red-500 dark:border-red-600' : 'border-2 border-gray-400 dark:border-gray-500'}
                        focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500
                      `.trim()}
                    />
                    {renameError && (
                      <p className="text-xs text-red-600 dark:text-red-400 px-3">
                        {renameError}
                      </p>
                    )}
                  </div>
                ) : (
                  // Double-click to rename, single-click to select page
                  <div
                    key={page.id}
                    className={`group flex items-center gap-2 rounded-lg transition-colors ${
                      selectedForActionPageId === page.id
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : ''
                    } ${
                      draggedPageId === page.id ? 'opacity-40' : ''
                    } ${
                      dragOverPageId === page.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, page.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(page.id)}
                  >
                    {/* Drag handle */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(page.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!draggedPageId) {
                          setSelectedForActionPageId(
                            selectedForActionPageId === page.id ? null : page.id
                          )
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      className={`
                        flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing select-none px-1
                        ${selectedForActionPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                      `.trim()}
                    >
                      <span className="text-sm">⋮⋮</span>
                    </div>

                    {/* Page title button */}
                    <button
                      onClick={() => onSelectPage(page.id)}
                      onDoubleClick={() => handleDoubleClick(page.id, page.title)}
                      className={`
                        flex-1 text-left px-3 py-2 rounded-lg transition-colors truncate
                        ${
                          selectedPageId === page.id
                            ? 'bg-gray-700 dark:bg-gray-600 text-white'
                            : 'text-gray-700 dark:text-notion-dark-textSoft hover:bg-gray-200 dark:hover:bg-gray-700'
                        }
                      `.trim()}
                    >
                      {page.title}
                    </button>

                    {/* Delete button - only visible when page is selected via drag handle */}
                    {selectedForActionPageId === page.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePage(page.id)
                        }}
                        className="flex-shrink-0 px-2 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors mr-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add New button - appears directly under the pages list */}
          <button
            onClick={onCreatePage}
            className="w-full text-left px-3 py-2 mt-1 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span className="text-sm">Add New</span>
          </button>
        </div>
      )}
    </aside>
  )
}
