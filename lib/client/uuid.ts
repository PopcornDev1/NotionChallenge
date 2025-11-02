// UUID generation utility
// Ensures consistent use of crypto.randomUUID() with proper error handling
//
// CONTRACT: Client-generated block IDs are preserved by the server
// The backend accepts and stores client-supplied UUIDs without reassignment
// This enables optimistic UI patterns where blocks appear immediately with their final IDs
//
// IMPORTANT: Always use generateBlockId() for creating new blocks
// Do NOT use Date.now() as it does not guarantee uniqueness

/**
 * Generates a unique block ID using crypto.randomUUID()
 * Throws an error if crypto.randomUUID is not available (requires polyfill)
 *
 * @returns A UUID v4 string
 * @throws Error if crypto.randomUUID is not available
 */
export function generateBlockId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error(
      'crypto.randomUUID is not available. This browser may require a polyfill for Web Crypto API.'
    )
  }

  return crypto.randomUUID()
}

/**
 * Generates a unique page ID using crypto.randomUUID()
 *
 * @returns A UUID v4 string
 * @throws Error if crypto.randomUUID is not available
 */
export function generatePageId(): string {
  return generateBlockId() // Same UUID generation strategy
}
