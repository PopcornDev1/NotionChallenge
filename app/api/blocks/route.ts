import { NextResponse } from 'next/server'
import type { Block } from '@/lib/types'
import { validateBlockInput } from '@/lib/server/validation'

// GET handler - retrieves all blocks (returns empty array for now)
export async function GET(request: Request) {
  try {
    const blocks: Block[] = []
    return NextResponse.json(blocks, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse blocks data' },
      { status: 500 }
    )
  }
}

// POST handler - creates a new block (returns success without persistence for now)
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

    // Generate new block with unique id
    const newBlock: Block = {
      ...body,
      id: Date.now().toString()
    }

    return NextResponse.json(newBlock, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create block' },
      { status: 500 }
    )
  }
}
