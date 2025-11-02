// Type definitions for the block system
// The Block type represents a single content block in the editor
// TextBlock is for headings and paragraphs
// ImageBlock is for images with configurable dimensions
// The discriminated union pattern (type field) enables type-safe handling

export type BlockType = 'text' | 'image'

export interface TextStyles {
  variant: 'h1' | 'h2' | 'h3' | 'paragraph'
}

export interface ImageStyles {
  width: number  // in pixels
  height: number // in pixels
}

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface TextBlock extends BaseBlock {
  type: 'text'
  content: string
  styles: TextStyles
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  content: string // the image URL
  styles: ImageStyles
}

export type Block = TextBlock | ImageBlock
