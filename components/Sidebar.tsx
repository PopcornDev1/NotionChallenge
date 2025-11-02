// Notion-style sidebar component for page navigation with collapsible functionality
// Simplified version - no page renaming yet

'use client'

import type { Page } from '@/lib/types'

interface SidebarProps {
  pages: Page[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onCreatePage: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  pages,
  selectedPageId,
  onSelectPage,
  onCreatePage,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  return (
    <aside
      className={`
        ${isCollapsed ? 'w-12' : 'w-64'}
        bg-gray-100 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
        fixed left-0 top-0 h-screen
      `.trim()}
    >
      {/* Sidebar Header with collapse toggle */}
      <div className="p-4 flex items-center gap-3">
        {/* Collapse/expand toggle button */}
        <button
          onClick={onToggleCollapse}
          aria-label="Toggle sidebar"
          role="button"
          className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded p-1"
        >
          <span className="text-xl">{isCollapsed ? '→' : '←'}</span>
        </button>

        {/* Pages heading - only shown when expanded */}
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
        )}
      </div>

      {/* Pages List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2">
          {pages.length === 0 ? (
            // Empty state guidance
            <div className="text-center py-8 px-4 text-gray-500 text-sm">
              <p>No pages yet. Create your first page!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onSelectPage(page.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-colors truncate
                    ${
                      selectedPageId === page.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }
                  `.trim()}
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}

          {/* Add New button - appears directly under the pages list */}
          <button
            onClick={onCreatePage}
            className="w-full text-left px-3 py-2 mt-1 rounded-lg transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span className="text-sm">New Page</span>
          </button>
        </div>
      )}
    </aside>
  )
}
