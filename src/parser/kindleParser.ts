import { Highlight, BookHighlights, HighlightLibrary } from "../types/highlight.js";

/**
 * Parses Kindle clippings file content and extracts highlights
 */
export class KindleParser {
  private readonly SEPARATOR = "==========";
  private readonly TITLE_AUTHOR_REGEX = /^(.+) \((.+)\)$/;
  private readonly LOCATION_REGEX = /Location (\d+-?\d*)/;
  private readonly PAGE_REGEX = /page (\d+-?\d*)/i;
  private readonly DATE_REGEX = /Added on (.+)$/;
  private readonly TYPE_INDICATORS = {
    highlight: "Your Highlight",
    note: "Your Note",
    bookmark: "Your Bookmark"
  };

  /**
   * Parses the content of a Kindle My Clippings.txt file
   * @param fileContent - The content of the My Clippings.txt file
   * @returns A processed library of highlights
   */
  public parseClippings(fileContent: string): HighlightLibrary {
    // Split the content by the separator
    const entries = fileContent.split(this.SEPARATOR).filter(entry => entry.trim().length > 0);
    
    // Process each entry
    const highlights: Highlight[] = [];
    
    for (const entry of entries) {
      try {
        const highlight = this.parseEntry(entry.trim());
        if (highlight) {
          highlights.push(highlight);
        }
      } catch (error) {
        console.error("Error parsing entry:", error);
        // Continue with next entry
      }
    }
    
    // Group highlights by book
    const bookMap = new Map<string, BookHighlights>();
    
    for (const highlight of highlights) {
      if (!bookMap.has(highlight.title)) {
        bookMap.set(highlight.title, {
          title: highlight.title,
          author: highlight.author,
          highlights: []
        });
      }
      
      bookMap.get(highlight.title)?.highlights.push(highlight);
    }
    
    // Create the library
    const library: HighlightLibrary = {
      books: Array.from(bookMap.values()),
      totalHighlights: highlights.length,
      lastUpdated: new Date()
    };
    
    return library;
  }

  /**
   * Parses a single entry from the clippings file
   * @param entry - A single clipping entry
   * @returns A parsed Highlight object or null if parsing failed
   */
  private parseEntry(entry: string): Highlight | null {
    const lines = entry.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      return null; // Not enough information
    }
    
    // Extract title and author from the first line
    const titleLine = lines[0];
    let title = titleLine;
    let author: string | undefined;
    
    const titleMatch = this.TITLE_AUTHOR_REGEX.exec(titleLine);
    if (titleMatch) {
      title = titleMatch[1].trim();
      author = titleMatch[2].trim();
    }
    
    // Determine type of clipping
    const metadataLine = lines[1];
    let type: 'highlight' | 'note' | 'bookmark' = 'highlight';
    
    if (metadataLine.includes(this.TYPE_INDICATORS.note)) {
      type = 'note';
    } else if (metadataLine.includes(this.TYPE_INDICATORS.bookmark)) {
      type = 'bookmark';
    }
    
    // Extract location
    const locationMatch = this.LOCATION_REGEX.exec(metadataLine);
    const location = locationMatch ? locationMatch[1] : 'unknown';
    
    // Extract page if available
    const pageMatch = this.PAGE_REGEX.exec(metadataLine);
    const page = pageMatch ? pageMatch[1] : undefined;
    
    // Extract date
    const dateMatch = this.DATE_REGEX.exec(metadataLine);
    const dateStr = dateMatch ? dateMatch[1] : '';
    const dateAdded = dateStr ? new Date(dateStr) : new Date();
    
    // Extract content (all remaining lines)
    const content = lines.slice(2).join('\n');
    
    return {
      title,
      author,
      content,
      location,
      page,
      dateAdded,
      type,
      tags: [], // Empty initially, can be populated later
      userNotes: undefined
    };
  }

  /**
   * Saves the library to a JSON file
   * @param library - The highlight library to save
   * @param filePath - The path to save the file
   */
  public async saveLibrary(library: HighlightLibrary, filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const jsonData = JSON.stringify(library, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf-8');
  }

  /**
   * Loads a library from a JSON file
   * @param filePath - The path to the JSON file
   * @returns The loaded highlight library
   */
  public async loadLibrary(filePath: string): Promise<HighlightLibrary> {
    const fs = await import('fs/promises');
    const jsonData = await fs.readFile(filePath, 'utf-8');
    const library = JSON.parse(jsonData) as HighlightLibrary;
    
    // Convert date strings back to Date objects
    library.lastUpdated = new Date(library.lastUpdated);
    
    for (const book of library.books) {
      for (const highlight of book.highlights) {
        highlight.dateAdded = new Date(highlight.dateAdded);
      }
    }
    
    return library;
  }
}
