// API route for single page operations (PUT for updating a specific page)
// More efficient than updating entire pages array
// Reduces payload size and potential for race conditions

import { NextResponse } from 'next/server'
import type { Page } from '@/lib/types'
import { readPages, writePages } from '@/lib/server/pagesStore'

/**
 * PUT handler - updates a single page by ID
 * More efficient than updating the entire pages array
 * Validates Page and Block structure before writing
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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

    // Validate page structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Page must be an object' },
        { status: 400 }
      )
    }

    if (!body.id || typeof body.id !== 'string' || body.id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Page must have a non-empty string id' },
        { status: 400 }
      )
    }

    // Ensure ID in body matches URL param
    if (body.id !== id) {
      return NextResponse.json(
        { error: 'Page ID in body must match URL parameter' },
        { status: 400 }
      )
    }

    if (typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Page must have a string title' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.blocks)) {
      return NextResponse.json(
        { error: 'Page must have a blocks array' },
        { status: 400 }
      )
    }

    // Validate each block in the page
    for (const block of body.blocks) {
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

    // Read existing pages
    const pages = await readPages()

    // Find the page to update
    const pageIndex = pages.findIndex((p) => p.id === id)

    if (pageIndex === -1) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    // Update the specific page
    pages[pageIndex] = body as Page

    // Persist updated pages array
    await writePages(pages)

    // Return updated page
    return NextResponse.json(body, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler - deletes a single page by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Read existing pages
    const pages = await readPages()

    // Find the page to delete
    const pageIndex = pages.findIndex((p) => p.id === id)

    if (pageIndex === -1) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    // Remove the page
    pages.splice(pageIndex, 1)

    // Persist updated pages array
    await writePages(pages)

    // Return success
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}
