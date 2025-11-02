// Block component that renders a single block based on its type
// Uses TypeScript discriminated unions for type-safe rendering
// Read-only display mode - no editing, drag-drop, or interactive features yet

'use client'

import type { Block } from '@/lib/types'

interface BlockProps {
  block: Block
}

export function Block({ block }: BlockProps) {
  return (
    <div
      className="p-4 rounded-lg bg-white"
      role="article"
    >
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
  )
}
