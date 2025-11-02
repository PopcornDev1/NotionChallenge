// Shared server utilities for reading and writing blocks to the JSON file
// Handles directory creation, JSON parsing, and array validation

import { promises as fs } from 'fs'
import path from 'path'
import type { Block } from '@/lib/types'

// File path resolution: process.cwd() returns the Next.js project root
const BLOCKS_FILE_PATH = path.join(process.cwd(), 'data', 'blocks.json')

/**
 * Reads blocks from the JSON file
 * - Creates the file with empty array if it doesn't exist
 * - Ensures the data directory exists
 * - Validates the parsed content is an array
 * - Automatically recovers from malformed data by rewriting to []
 */
export async function readBlocks(): Promise<Block[]> {
  try {
    const fileContent = await fs.readFile(BLOCKS_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(fileContent)

    // Guard: ensure parsed JSON is an array
    if (!Array.isArray(parsed)) {
      // Recover by rewriting to empty array
      await writeBlocks([])
      return []
    }

    return parsed
  } catch (error: any) {
    // If file doesn't exist, create it with an empty array
    if (error.code === 'ENOENT') {
      // Ensure directory exists before writing
      await fs.mkdir(path.dirname(BLOCKS_FILE_PATH), { recursive: true })
      await fs.writeFile(BLOCKS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8')
      return []
    }
    // Re-throw other errors (like JSON parse errors)
    throw error
  }
}

/**
 * Persists blocks to the JSON file
 * - Pretty-prints with 2-space indent for readability
 * - Ensures the data directory exists before writing
 */
export async function writeBlocks(blocks: Block[]): Promise<void> {
  // Ensure directory exists before writing
  await fs.mkdir(path.dirname(BLOCKS_FILE_PATH), { recursive: true })
  await fs.writeFile(BLOCKS_FILE_PATH, JSON.stringify(blocks, null, 2), 'utf-8')
}
