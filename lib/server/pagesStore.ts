// Server utilities for reading and writing pages to the JSON file
// Provides shared utilities for page persistence
// Parallel structure to blocksStore.ts for consistency
// pages.json is the source of truth for all pages and their blocks

import { promises as fs } from 'fs'
import path from 'path'
import type { Page } from '@/lib/types'

// Resolves to the pages.json file in the data directory
const PAGES_FILE_PATH = path.join(process.cwd(), 'data', 'pages.json')

/**
 * Read all pages from pages.json
 * Handles file creation, directory creation, and error recovery
 * Returns empty array if file doesn't exist or contains invalid data
 */
export async function readPages(): Promise<Page[]> {
  try {
    const fileContent = await fs.readFile(PAGES_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(fileContent)

    // Recover from malformed data by rewriting to empty array
    if (!Array.isArray(parsed)) {
      await writePages([])
      return []
    }

    return parsed
  } catch (error: any) {
    // Create file and directory if they don't exist
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(PAGES_FILE_PATH), { recursive: true })
      await fs.writeFile(PAGES_FILE_PATH, JSON.stringify([], null, 2), 'utf-8')
      return []
    }
    throw error
  }
}

/**
 * Write pages to pages.json
 * Ensures data directory exists before writing
 * Persists with readable formatting (2-space indentation)
 */
export async function writePages(pages: Page[]): Promise<void> {
  await fs.mkdir(path.dirname(PAGES_FILE_PATH), { recursive: true })
  await fs.writeFile(PAGES_FILE_PATH, JSON.stringify(pages, null, 2), 'utf-8')
}
