'use client'

// Popup menu component for selecting block type during inline creation
// Triggered by '+' buttons on blocks or empty placeholder
// Position prop enables contextual placement next to trigger button

import { useEffect, useRef, useState } from 'react'

interface BlockMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onSelectType: (type: 'text' | 'image', variant?: 'h1' | 'h2' | 'h3' | 'paragraph') => void
  onSelectImage: () => void // Separate handler for image blocks to trigger ImageModal instead of direct creation
  onClose: () => void
}

interface MenuOption {
  id: string
  type: 'text' | 'image'
  variant?: 'h1' | 'h2' | 'h3' | 'paragraph'
  label: string
  icon: string
  description: string
}

const menuOptions: MenuOption[] = [
  {
    id: 'paragraph',
    type: 'text',
    variant: 'paragraph',
    label: 'Paragraph',
    icon: '¶',
    description: 'Plain text block'
  },
  {
    id: 'h1',
    type: 'text',
    variant: 'h1',
    label: 'Heading 1',
    icon: 'H1',
    description: 'Large section heading'
  },
  {
    id: 'h2',
    type: 'text',
    variant: 'h2',
    label: 'Heading 2',
    icon: 'H2',
    description: 'Medium section heading'
  },
  {
    id: 'h3',
    type: 'text',
    variant: 'h3',
    label: 'Heading 3',
    icon: 'H3',
    description: 'Small section heading'
  },
  {
    id: 'image',
    type: 'image',
    label: 'Image',
    icon: '🖼',
    description: 'Upload or embed image'
  }
]

export default function BlockMenu({ isOpen, position, onSelectType, onSelectImage, onClose }: BlockMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Auto-focus first option when menu opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
      // Focus first button for accessibility
      setTimeout(() => {
        buttonRefs.current[0]?.focus()
      }, 50)
    }
  }, [isOpen])

  // Keyboard navigation: Arrow keys, Enter, Escape, Tab
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = (prev + 1) % menuOptions.length
            buttonRefs.current[newIndex]?.focus()
            return newIndex
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = (prev - 1 + menuOptions.length) % menuOptions.length
            buttonRefs.current[newIndex]?.focus()
            return newIndex
          })
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey) {
            // Shift+Tab - move backwards
            setSelectedIndex((prev) => {
              const newIndex = (prev - 1 + menuOptions.length) % menuOptions.length
              buttonRefs.current[newIndex]?.focus()
              return newIndex
            })
          } else {
            // Tab - move forwards
            setSelectedIndex((prev) => {
              const newIndex = (prev + 1) % menuOptions.length
              buttonRefs.current[newIndex]?.focus()
              return newIndex
            })
          }
          break
        case 'Enter':
          e.preventDefault()
          const selected = menuOptions[selectedIndex]
          // Handle image selection via keyboard (Enter key) by opening modal
          if (selected.type === 'image') {
            onSelectImage()
          } else {
            onSelectType(selected.type, selected.variant)
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, onSelectType, onSelectImage, onClose])

  // Adjust position after render to ensure menu stays in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const padding = 8

    // Check if menu overflows viewport and adjust
    let adjustedX = position.x
    let adjustedY = position.y

    // Horizontal overflow
    if (rect.right > window.innerWidth - padding) {
      adjustedX = window.innerWidth - rect.width - padding
    }
    if (rect.left < padding) {
      adjustedX = padding
    }

    // Vertical overflow
    if (rect.bottom > window.innerHeight - padding) {
      adjustedY = window.innerHeight - rect.height - padding
    }
    if (rect.top < padding) {
      adjustedY = padding
    }

    // Apply adjusted position if changed
    if (adjustedX !== position.x || adjustedY !== position.y) {
      menu.style.left = `${adjustedX}px`
      menu.style.top = `${adjustedY}px`
    }
  }, [isOpen, position.x, position.y])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Small delay to avoid immediate closure from the click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Transparent overlay for click-away */}
      <div className="fixed inset-0 z-40" aria-hidden="true" />

      {/* Menu card */}
      <nav
        ref={menuRef}
        className="fixed z-50 w-64 bg-white dark:bg-notion-dark-sidebar rounded-lg shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden animate-fadeIn"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        role="menu"
        aria-label="Block type selection menu"
      >
        <div className="py-2">
          {menuOptions.map((option, index) => (
            <button
              key={option.id}
              ref={(el) => { buttonRefs.current[index] = el }}
              onClick={() => {
                // Image selection opens ImageModal for URL input and dimension detection
                if (option.type === 'image') {
                  onSelectImage()
                } else {
                  onSelectType(option.type, option.variant)
                }
              }}
              onFocus={() => setSelectedIndex(index)}
              className={`w-full px-4 py-2 flex items-start gap-3 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-notion-dark-text'
              }`}
              role="menuitem"
              aria-label={`Create ${option.label} block`}
              tabIndex={index === selectedIndex ? 0 : -1}
            >
              <span className="text-xl flex-shrink-0 w-6 text-center">{option.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 dark:text-notion-dark-textMuted">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
