// Shared validation utilities for block input
// Validates block structure, type-specific styles, and content constraints

/**
 * Validates a block input body
 * Returns null if valid, or an error message string if invalid
 */
export function validateBlockInput(body: any): string | null {
  // Validate type
  if (!body.type || (body.type !== 'text' && body.type !== 'image')) {
    return 'Invalid type: must be "text" or "image"'
  }

  // Validate content is a string
  if (typeof body.content !== 'string') {
    return 'Invalid content: must be a string'
  }

  // Type-specific content validation
  if (body.type === 'text') {
    // Text content can be empty (allows for blank space like Notion)
    // No validation needed for text content
  } else if (body.type === 'image') {
    // Ensure image content is a valid URL
    if (!body.content.startsWith('http://') && !body.content.startsWith('https://')) {
      return 'Invalid image content: must be a URL starting with http:// or https://'
    }
  }

  // Validate styles is an object
  if (!body.styles || typeof body.styles !== 'object' || Array.isArray(body.styles)) {
    return 'Invalid styles: must be an object'
  }

  // Type-specific styles validation
  if (body.type === 'text') {
    const validVariants = ['h1', 'h2', 'h3', 'paragraph']
    if (!validVariants.includes(body.styles.variant)) {
      return 'Invalid text variant: must be one of h1, h2, h3, paragraph'
    }
  } else if (body.type === 'image') {
    if (typeof body.styles.width !== 'number' || !isFinite(body.styles.width) || body.styles.width <= 0) {
      return 'Invalid image width: must be a positive finite number'
    }
    if (typeof body.styles.height !== 'number' || !isFinite(body.styles.height) || body.styles.height <= 0) {
      return 'Invalid image height: must be a positive finite number'
    }
  }

  // All validations passed
  return null
}
