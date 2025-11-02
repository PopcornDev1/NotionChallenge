# Mini-Notion Clone

A lightweight Notion-like block editor built incrementally over 60 minutes. Features multi-page management, rich text editing, drag-and-drop, dark mode, and automatic image dimension detection.

## Features

### ✅ Core Features Implemented

- **Multi-Page Management**
  - Create, rename, and organize multiple pages
  - Sidebar navigation with collapsible functionality
  - Double-click to rename pages in sidebar
  - Click-to-edit page titles in main content area
  - Optimistic updates with error rollback

- **Rich Block Editor**
  - Text blocks: H1, H2, H3, Paragraph
  - Image blocks with custom dimensions
  - Inline editing with contentEditable
  - Slash commands (/h1, /h2, /h3, /paragraph, /image)
  - Keyboard shortcuts (Enter to save, Escape to cancel)

- **Drag-and-Drop Reordering**
  - Visual drop indicators
  - Smooth drag interactions
  - Drag handle (⋮⋮) on hover or selection

- **Inline Block Creation**
  - Hover "+" button on blocks
  - EmptyBlock placeholder at page bottom
  - BlockMenu popup for type selection
  - Keyboard navigation in menus

- **Image Management**
  - ImageModal with live preview
  - Automatic dimension detection
  - Debounced loading for better UX
  - Manual dimension override
  - CORS and timeout handling

- **Clean Selection UI**
  - Edit/Delete buttons only on selection
  - Click block to select
  - Click outside to deselect
  - Visual feedback with opacity transitions

- **Dark Mode**
  - Toggle button in top-right
  - Notion-inspired color palette
  - Smooth transitions
  - localStorage persistence

- **Data Persistence**
  - JSON file storage (data/pages.json, data/blocks.json)
  - Automatic migration from legacy blocks.json
  - Optimistic updates with rollback
  - Server-side validation

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development with discriminated unions
- **Tailwind CSS** - Utility-first styling with custom Notion colors
- **JSON File Persistence** - Simple file-based storage

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
mini-notion-clone/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── blocks/          # Block CRUD operations
│   │   │   ├── route.ts     # GET all, POST, PUT reorder
│   │   │   └── [id]/route.ts # PUT, DELETE by ID
│   │   └── pages/           # Page CRUD operations
│   │       ├── route.ts     # GET all, POST, PUT
│   │       └── [id]/route.ts # PUT, DELETE by ID
│   ├── layout.tsx           # Root layout with ThemeProvider
│   ├── page.tsx             # Main editor with state management
│   └── globals.css          # Global styles and animations
├── components/              # React components
│   ├── Block.tsx           # Block display and editing
│   ├── BlockMenu.tsx       # Type selection menu
│   ├── EmptyBlock.tsx      # Placeholder for new blocks
│   ├── ImageModal.tsx      # Image URL input with preview
│   ├── Sidebar.tsx         # Page navigation
│   └── ThemeToggle.tsx     # Dark mode toggle
├── lib/                    # Shared utilities
│   ├── types.ts           # TypeScript type definitions
│   ├── client/            # Client-side utilities
│   │   ├── uuid.ts        # UUID generation
│   │   ├── validation.ts  # Client validation
│   │   └── imageUtils.ts  # Image dimension detection
│   ├── server/            # Server-side utilities
│   │   ├── blocksStore.ts # Block persistence
│   │   ├── pagesStore.ts  # Page persistence
│   │   └── validation.ts  # Server validation
│   └── contexts/          # React contexts
│       └── ThemeContext.tsx # Dark mode context
└── data/                  # JSON storage
    ├── blocks.json        # Legacy block storage
    └── pages.json         # Current page storage
```

## Key Design Decisions

### Discriminated Unions
TypeScript discriminated unions (`Block = TextBlock | ImageBlock`) provide type-safe rendering and editing without runtime type checks.

### Optimistic UI
All mutations update local state immediately, then sync to server. On error, state rolls back to previous snapshot for instant feedback.

### Client-Generated IDs
UUIDs generated on client using `crypto.randomUUID()` are preserved by server, enabling optimistic patterns where blocks appear with their final IDs.

### Incremental Development
Built feature-by-feature in phases:
1. Config + Types + Backend API
2. Layout + Read-only blocks
3. Drag-and-drop
4. Edit mode
5. Multi-page system
6. Inline creation with slash commands
7. Dark mode
8. ImageModal with auto-detection
9. Selection state for cleaner UI
10. Page renaming (sidebar + main title)

### Notion-Inspired Colors
Custom Tailwind palette matches Notion's exact colors:
- Dark mode: `#25272B` (bg), `#2F3437` (sidebar), `#9B9A97` (muted text)
- Light mode: `#FFFFFF` (bg), `#F7F6F3` (sidebar), `#37352F` (text)

## Development Timeline

Built incrementally over 60 minutes with focus on core functionality and polish. Each feature was implemented completely before moving to the next.

---

Built with [Next.js](https://nextjs.org), [TypeScript](https://www.typescriptlang.org), and [Tailwind CSS](https://tailwindcss.com)
