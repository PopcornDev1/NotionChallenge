import { NextResponse } from 'next/server'
import type { Block } from '@/lib/types'
import { readBlocks, writeBlocks } from '@/lib/server/blocksStore'
import { validateBlockInput } from '@/lib/server/validation'

// GET handler - retrieves all blocks from the JSON file
export async function GET(request: Request) {
  try {
    const blocks = await readBlocks()
    return NextResponse.json(blocks, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse blocks data' },
      { status: 500 }
    )
  }
}

// POST handler - creates a new block and persists to the JSON file
export async function POST(request: Request) {
  try {
    // Parse JSON body with specific error handling for invalid JSON
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

    // Validate block input using shared validator
    const validationError = validateBlockInput(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Read existing blocks from file
    const blocks = await readBlocks()

    // Generate new block with unique id
    const newBlock: Block = {
      ...body,
      id: Date.now().toString()
    }

    // Append new block to the array
    blocks.push(newBlock)

    // Persist updated blocks to file (pretty-printed for readability)
    await writeBlocks(blocks)

    return NextResponse.json(newBlock, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create block' },
      { status: 500 }
    )
  }
}

// PUT handler - handles bulk reordering by accepting an array of ID strings in the desired order
// Distinct from PUT /api/blocks/[id] which updates a single block
// Reorders existing blocks without allowing content changes, preventing data loss
// Expects: string[] - array of block IDs in the new order
export async function PUT(request: Request) {
  try {
    // Parse JSON body
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
        { error: 'Expected an array of ID strings' },
        { status: 400 }
      )
    }

    // Validate each item is a non-empty string
    const hasValidIds = body.every((id: any) =>
      typeof id === 'string' && id.length > 0
    )

    if (!hasValidIds) {
      return NextResponse.json(
        { error: 'All items must be non-empty ID strings' },
        { status: 400 }
      )
    }

    // Read existing blocks from storage
    const existingBlocks = await readBlocks()

    // Validate array length matches existing blocks count
    if (body.length !== existingBlocks.length) {
      return NextResponse.json(
        {
          error: `Length mismatch: expected ${existingBlocks.length} IDs, received ${body.length}`
        },
        { status: 400 }
      )
    }

    // Build frequency map to check for duplicates
    const incomingIds = body as string[]
    const frequencyMap = new Map<string, number>()

    for (const id of incomingIds) {
      frequencyMap.set(id, (frequencyMap.get(id) || 0) + 1)
    }

    // Check for duplicate IDs
    for (const [id, count] of frequencyMap) {
      if (count > 1) {
        return NextResponse.json(
          { error: `Duplicate block ID found: ${id} appears ${count} times` },
          { status: 400 }
        )
      }
    }

    // Build set of existing IDs for membership validation
    const existingIds = new Set(existingBlocks.map((b) => b.id))

    // Ensure each incoming ID exists in existing blocks (no missing IDs)
    for (const id of incomingIds) {
      if (!existingIds.has(id)) {
        return NextResponse.json(
          { error: `Unknown block ID: ${id}` },
          { status: 400 }
        )
      }
    }

    // Build a map of existing blocks by ID for efficient lookup
    const existingBlockMap = new Map(existingBlocks.map((b) => [b.id, b]))

    // Construct reordered array by mapping incoming IDs to existing blocks
    // This preserves the actual content/styles and only changes order
    const reorderedBlocks = incomingIds.map((id) => existingBlockMap.get(id)!)

    // Persist the reordered array
    await writeBlocks(reorderedBlocks)

    return NextResponse.json(reorderedBlocks, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reorder blocks' },
      { status: 500 }
    )
  }
}
