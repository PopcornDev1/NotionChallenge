// Simple client component that fetches and displays blocks
// Read-only list view - no editing, pages, or interactive features yet

'use client'

import { useState, useEffect } from 'react'
import type { Block } from '@/lib/types'
import { Block as BlockComponent } from '@/components/Block'

export default function Home() {
  // State management for blocks, loading, and error states
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                <BlockComponent key={block.id} block={block} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
