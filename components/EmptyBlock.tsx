'use client'

// Placeholder block component that appears at the bottom of the page for starting new content
// Slash command detection mirrors text block behavior
// Converts to real block on first input via Enter key or slash command

import { useState, useRef, KeyboardEvent, useEffect } from 'react'

interface EmptyBlockProps {
  onCreateBlock: (content: string, variant: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image') => void
  onOpenMenu: (position: { x: number; y: number }) => void
}

export default function EmptyBlock({ onCreateBlock, onOpenMenu }: EmptyBlockProps) {
  const [content, setContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Slash command detection
  // Handles both exact match and space-separated content (e.g., "/h1 My title")
  const detectSlashCommand = (text: string): { command: string; variant: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image'; remainingContent: string } | null => {
    const trimmed = text.trim()
    if (!trimmed.startsWith('/')) return null

    // Extract first word (command) and remainder
    const spaceIndex = trimmed.indexOf(' ')
    const command = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex)
    const remainder = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex + 1).trim()

    // Match commands
    if (command === '/h1') return { command, variant: 'h1', remainingContent: remainder }
    if (command === '/h2') return { command, variant: 'h2', remainingContent: remainder }
    if (command === '/h3') return { command, variant: 'h3', remainingContent: remainder }
    if (command === '/paragraph' || command === '/p') return { command, variant: 'paragraph', remainingContent: remainder }
    if (command === '/image' || command === '/img') return { command, variant: 'image', remainingContent: remainder }

    return null
  }

  // Handle Enter key to create block
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const currentContent = content.trim()

      // Check for slash command (highest priority)
      const command = detectSlashCommand(currentContent)
      if (command) {
        // Create block with variant and preserve remaining content
        onCreateBlock(command.remainingContent, command.variant)
        setContent('')
        if (inputRef.current) {
          inputRef.current.textContent = ''
        }
        return
      }

      // Create paragraph with content, or empty paragraph if no content
      onCreateBlock(currentContent, 'paragraph')
      setContent('')
      if (inputRef.current) {
        inputRef.current.textContent = ''
      }
    }

    // Space key after slash command - confirms command like in Block.tsx
    // When user types space after a command, transform and allow them to continue typing
    if (e.key === ' ' && content.startsWith('/')) {
      const command = detectSlashCommand(content)
      if (command) {
        e.preventDefault()

        // Create block with variant and preserve remaining content
        onCreateBlock(command.remainingContent, command.variant)
        setContent('')
        if (inputRef.current) {
          inputRef.current.textContent = ''
        }
      }
    }

    // Detect '/' key to potentially show menu in future
    if (e.key === '/' && !content) {
      // Could trigger menu opening here if desired
    }
  }

  // Handle content changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || ''
    setContent(text)
  }

  // Handle blur to save content when clicking away
  const handleBlur = () => {
    setIsFocused(false)

    // If there's any content (even just whitespace), save it as a paragraph
    if (content.trim()) {
      // Check for slash command first
      const command = detectSlashCommand(content)
      if (command) {
        onCreateBlock(command.remainingContent, command.variant)
      } else {
        onCreateBlock(content.trim(), 'paragraph')
      }
      setContent('')
      if (inputRef.current) {
        inputRef.current.textContent = ''
      }
    }
  }

  // Handle '+' button click
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
      onOpenMenu({ x, y })
    }
  }

  return (
    <div
      ref={containerRef}
      className="group relative p-4 rounded-lg transition-all bg-white dark:bg-notion-dark-bg border-2 border-transparent hover:border-gray-200 dark:hover:border-notion-dark-border hover:shadow-md dark:hover:shadow-gray-900/50"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hover '+' button */}
      <button
        onClick={handlePlusClick}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 hover:text-white text-gray-600 dark:text-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Open block menu"
        title="Add block"
      >
        +
      </button>

      {/* ContentEditable input */}
      <div
        ref={inputRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className="outline-none text-gray-900 dark:text-notion-dark-textSoft min-h-[24px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-notion-dark-textMuted"
        data-placeholder="Type '/' for commands or start writing..."
        role="textbox"
        aria-label="Empty block placeholder"
      />

    </div>
  )
}
