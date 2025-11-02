// API route handlers for page operations (GET all pages, POST new page)
// Handles page CRUD operations
// Pages are created with empty blocks arrays
// Block operations happen through separate block APIs with pageId context
// Follows the same pattern as blocks API for consistency

import { NextResponse } from 'next/server'
import type { Page } from '@/lib/types'
import { readPages, writePages } from '@/lib/server/pagesStore'
import { readBlocks } from '@/lib/server/blocksStore'

/**
 * GET handler - retrieves all pages for sidebar display
 * Migrates existing blocks.json content into an initial page if pages.json is empty
 */
export async function GET(request: Request) {
  try {
    let pages = await readPages()

    // Migration logic: if pages.json is empty, check blocks.json for legacy content
    if (pages.length === 0) {
      const legacyBlocks = await readBlocks()

      // If legacy blocks exist, create a default "Imported Page" with those blocks
      if (legacyBlocks.length > 0) {
        const importedPage: Page = {
          id: Date.now().toString(),
          title: 'Imported Page',
          blocks: legacyBlocks
        }

        pages = [importedPage]

        // Persist the migrated page to pages.json
        await writePages(pages)
      }
    }

    return NextResponse.json(pages, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read pages' },
      { status: 500 }
    )
  }
}

/**
 * PUT handler - updates all pages (used for persisting page block changes)
 * Validates Page and Block structure before writing
 */
export async function PUT(request: Request) {
  try {
    // Parse JSON body with error handling
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }
      throw error
    }

    // Validate body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Expected an array of pages' },
        { status: 400 }
      )
    }

    // Validate each page structure
    for (const page of body) {
      // Validate page has required fields
      if (!page || typeof page !== 'object') {
        return NextResponse.json(
          { error: 'Each page must be an object' },
          { status: 400 }
        )
      }

      if (!page.id || typeof page.id !== 'string' || page.id.trim().length === 0) {
        return NextResponse.json(
          { error: 'Each page must have a non-empty string id' },
          { status: 400 }
        )
      }

      if (typeof page.title !== 'string') {
        return NextResponse.json(
          { error: 'Each page must have a string title' },
          { status: 400 }
        )
      }

      if (!Array.isArray(page.blocks)) {
        return NextResponse.json(
          { error: 'Each page must have a blocks array' },
          { status: 400 }
        )
      }

      // Validate each block in the page
      for (const block of page.blocks) {
        if (!block || typeof block !== 'object') {
          return NextResponse.json(
            { error: 'Each block must be an object' },
            { status: 400 }
          )
        }

        if (!block.id || typeof block.id !== 'string') {
          return NextResponse.json(
            { error: 'Each block must have a string id' },
            { status: 400 }
          )
        }

        if (block.type !== 'text' && block.type !== 'image') {
          return NextResponse.json(
            { error: 'Block type must be "text" or "image"' },
            { status: 400 }
          )
        }

        if (typeof block.content !== 'string') {
          return NextResponse.json(
            { error: 'Each block must have a string content' },
            { status: 400 }
          )
        }

        if (!block.styles || typeof block.styles !== 'object') {
          return NextResponse.json(
            { error: 'Each block must have a styles object' },
            { status: 400 }
          )
        }

        // Validate styles based on block type (discriminated union)
        if (block.type === 'text') {
          const validVariants = ['h1', 'h2', 'h3', 'paragraph']
          if (!validVariants.includes(block.styles.variant)) {
            return NextResponse.json(
              { error: 'Text block must have a valid variant (h1, h2, h3, or paragraph)' },
              { status: 400 }
            )
          }
        } else if (block.type === 'image') {
          if (typeof block.styles.width !== 'number' || block.styles.width <= 0) {
            return NextResponse.json(
              { error: 'Image block must have a positive number width' },
              { status: 400 }
            )
          }

          if (typeof block.styles.height !== 'number' || block.styles.height <= 0) {
            return NextResponse.json(
              { error: 'Image block must have a positive number height' },
              { status: 400 }
            )
          }
        }
      }
    }

    // Persist all pages to storage (validation passed)
    await writePages(body as Page[])

    // Return updated pages
    return NextResponse.json(body, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update pages' },
      { status: 500 }
    )
  }
}

/**
 * POST handler - creates a new page with empty blocks array
 * Validates that title is a non-empty string
 * No duplicate title checking (allow multiple pages with same title for simplicity)
 */
export async function POST(request: Request) {
  try {
    // Parse JSON body with error handling
    let body: any
    try {
      body = await request.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        )
      }
      throw error
    }

    // Validate required fields
    if (!body.id || typeof body.id !== 'string' || body.id.trim().length === 0) {
      return NextResponse.json(
        { error: 'ID must be a non-empty string (client-generated UUID)' },
        { status: 400 }
      )
    }

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.blocks)) {
      return NextResponse.json(
        { error: 'Blocks must be an array' },
        { status: 400 }
      )
    }

    // Read existing pages
    const pages = await readPages()

    // Check for duplicate ID
    if (pages.some((p) => p.id === body.id)) {
      return NextResponse.json(
        { error: 'Page with this ID already exists' },
        { status: 409 }
      )
    }

    // Accept client-provided page object (preserves client-generated ID)
    const newPage: Page = {
      id: body.id,
      title: body.title.trim(),
      blocks: body.blocks
    }

    // Append new page to pages array
    pages.push(newPage)

    // Persist to storage
    await writePages(pages)

    // Return new page with 201 status
    return NextResponse.json(newPage, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }
}
