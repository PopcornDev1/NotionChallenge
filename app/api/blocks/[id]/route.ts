// Handles operations on individual blocks (update and delete)
// Uses the dynamic [id] route parameter from Next.js App Router

import { NextResponse } from 'next/server'
import type { Block } from '@/lib/types'
import { readBlocks, writeBlocks } from '@/lib/server/blocksStore'
import { validateBlockInput } from '@/lib/server/validation'

// PUT handler - updates an existing block by id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the block id from the route parameter
    const id = params.id

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

    // Read current blocks from file
    const blocks = await readBlocks()

    // Find the block to update
    const blockIndex = blocks.findIndex(b => b.id === id)

    if (blockIndex === -1) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    // Update the block in place, preserving the id
    blocks[blockIndex] = { ...body, id }

    // Persist changes to file
    await writeBlocks(blocks)

    return NextResponse.json(blocks[blockIndex], { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update block' },
      { status: 500 }
    )
  }
}

// DELETE handler - removes a block by id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the block id from the route parameter
    const id = params.id

    // Read current blocks from file
    const blocks = await readBlocks()

    // Find the block to delete
    const blockIndex = blocks.findIndex(b => b.id === id)

    if (blockIndex === -1) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    // Remove the block from the array
    blocks.splice(blockIndex, 1)

    // Persist changes to file
    await writeBlocks(blocks)

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete block' },
      { status: 500 }
    )
  }
}
