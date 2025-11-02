// Client-side validation utility for block editing
// Mirrors server-side validation logic in lib/server/validation.ts
// Provides immediate feedback before API calls

/**
 * Validates block edit input on the client side
 * @param type - The block type ('text' or 'image')
 * @param content - The content string
 * @param styles - The styles object (variant for text, width/height for image)
 * @returns null if valid, error message string if invalid
 */
export function validateBlockEdit(
  type: 'text' | 'image',
  content: string,
  styles: any
): string | null {
  // Validate type
  if (type !== 'text' && type !== 'image') {
    return 'Invalid type: must be "text" or "image"'
  }

  // Validate content is a string
  if (typeof content !== 'string') {
    return 'Invalid content: must be a string'
  }

  // Type-specific content validation
  if (type === 'text') {
    // Text content can be empty (allows for blank space like Notion)
    // No validation needed for text content
  } else if (type === 'image') {
    // Image content must be a valid URL
    if (!content.startsWith('http://') && !content.startsWith('https://')) {
      return 'Image URL must start with http:// or https://'
    }
  }

  // Validate styles object exists
  if (!styles || typeof styles !== 'object') {
    return 'Invalid styles: must be an object'
  }

  // Type-specific styles validation
  if (type === 'text') {
    // Text blocks must have a valid variant
    const validVariants = ['h1', 'h2', 'h3', 'paragraph']
    if (!styles.variant || !validVariants.includes(styles.variant)) {
      return 'Invalid text variant: must be one of h1, h2, h3, or paragraph'
    }
  } else if (type === 'image') {
    // Image blocks must have valid width and height
    if (typeof styles.width !== 'number' || !isFinite(styles.width) || styles.width <= 0) {
      return 'Width must be a positive number'
    }

    if (typeof styles.height !== 'number' || !isFinite(styles.height) || styles.height <= 0) {
      return 'Height must be a positive number'
    }
  }

  // All validations passed
  return null
}
