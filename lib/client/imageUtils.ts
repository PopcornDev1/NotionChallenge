// Utility for loading image dimensions with comprehensive error handling
// Provides dimension detection for ImageModal and Block.tsx edit form
// Handles CORS errors, invalid URLs, network failures, and timeouts gracefully

/**
 * Image dimensions interface
 */
export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Loads an image and detects its natural dimensions
 *
 * @param url - The image URL to load (must start with http:// or https://)
 * @param timeoutMs - Optional timeout in milliseconds (default 10000 = 10 seconds)
 * @returns Promise that resolves with { width, height } (naturalWidth/naturalHeight)
 * @throws Error with descriptive message on failure
 *
 * @example
 * ```typescript
 * try {
 *   const { width, height } = await loadImageDimensions('https://example.com/image.jpg')
 *   console.log(`Image dimensions: ${width}x${height}`)
 * } catch (error) {
 *   console.error('Failed to load image:', error.message)
 * }
 * ```
 */
export async function loadImageDimensions(
  url: string,
  timeoutMs: number = 10000
): Promise<ImageDimensions> {
  // Validate URL format before attempting load
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Image URL must start with http:// or https://')
  }

  // Move img to outer scope so both load and timeout paths can access it
  const img = new Image()
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  // Load image in memory to detect natural dimensions
  const loadPromise = new Promise<ImageDimensions>((resolve, reject) => {
    img.onload = () => {
      // Clear timeout when load completes to avoid double settlement
      if (timeoutId) clearTimeout(timeoutId)

      const width = img.naturalWidth
      const height = img.naturalHeight

      // Validate dimensions are positive numbers
      if (width <= 0 || height <= 0) {
        // Clean up handlers
        img.onload = null
        img.onerror = null
        img.src = ''
        reject(new Error('Failed to detect image dimensions'))
        return
      }

      // Clean up handlers
      img.onload = null
      img.onerror = null
      resolve({ width, height })
    }

    img.onerror = () => {
      // Clear timeout on error to avoid double settlement
      if (timeoutId) clearTimeout(timeoutId)

      // Clean up handlers and abort load
      img.onload = null
      img.onerror = null
      img.src = ''

      reject(
        new Error(
          'Failed to load image. The URL may be invalid or the server may block cross-origin requests (CORS).'
        )
      )
    }

    // Set crossOrigin for broader CORS tolerance with common CDNs
    img.crossOrigin = 'anonymous'

    // Trigger image load
    img.src = url
  })

  // Prevent hanging on slow/unresponsive servers
  const timeoutPromise = new Promise<ImageDimensions>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Clean up handlers and abort load on timeout
      img.onload = null
      img.onerror = null
      img.src = ''

      reject(new Error('Image loading timed out. Please check the URL and try again.'))
    }, timeoutMs)
  })

  // Race between load and timeout
  return await Promise.race([loadPromise, timeoutPromise])
}
