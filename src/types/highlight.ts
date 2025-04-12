/**
 * Represents a single highlight from a Kindle clippings file
 */
export interface Highlight {
  /** The title of the book */
  title: string;
  /** The author of the book (if available) */
  author?: string;
  /** The highlighted text content */
  content: string;
  /** The location information in the Kindle book */
  location: string;
  /** The page number (if available) */
  page?: string;
  /** The date and time when the highlight was created */
  dateAdded: Date;
  /** Type of clipping (highlight, note, bookmark) */
  type: 'highlight' | 'note' | 'bookmark';
  /** User-added tags for organization */
  tags: string[];
  /** Any additional notes added by the user */
  userNotes?: string;
}

/**
 * Represents a collection of highlights grouped by book
 */
export interface BookHighlights {
  /** The title of the book */
  title: string;
  /** The author of the book */
  author?: string;
  /** Array of highlights for this book */
  highlights: Highlight[];
}

/**
 * Represents the entire library of highlights
 */
export interface HighlightLibrary {
  /** Array of books with their highlights */
  books: BookHighlights[];
  /** Total number of highlights across all books */
  totalHighlights: number;
  /** Date when the library was last updated */
  lastUpdated: Date;
}
