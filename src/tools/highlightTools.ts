import { Highlight, BookHighlights, HighlightLibrary } from "../types/highlight.js";

/**
 * Class providing tools for working with highlights
 */
export class HighlightTools {
  /**
   * Searches highlights across all books for a given query
   * @param library - The highlight library to search
   * @param query - The search term
   * @param options - Search options
   * @returns An array of matching highlights
   */
  public searchHighlights(
    library: HighlightLibrary, 
    query: string, 
    options: { 
      caseSensitive?: boolean, 
      wholeWord?: boolean,
      includeBooks?: string[],
      excludeBooks?: string[],
      highlightTypes?: ('highlight' | 'note' | 'bookmark')[]
    } = {}
  ): Highlight[] {
    const results: Highlight[] = [];
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();
    
    // Filter books based on include/exclude lists
    let booksToSearch = [...library.books];
    
    if (options.includeBooks && options.includeBooks.length > 0) {
      booksToSearch = booksToSearch.filter(book => 
        options.includeBooks?.includes(book.title));
    }
    
    if (options.excludeBooks && options.excludeBooks.length > 0) {
      booksToSearch = booksToSearch.filter(book => 
        !options.excludeBooks?.includes(book.title));
    }
    
    // Search in each book
    for (const book of booksToSearch) {
      for (const highlight of book.highlights) {
        // Filter by highlight type if specified
        if (options.highlightTypes && 
            options.highlightTypes.length > 0 && 
            !options.highlightTypes.includes(highlight.type)) {
          continue;
        }
        
        // Search the content
        const content = options.caseSensitive ? 
          highlight.content : 
          highlight.content.toLowerCase();
        
        let isMatch = false;
        
        if (options.wholeWord) {
          // Match whole words
          const wordBoundary = '\\b';
          const regex = new RegExp(
            `${wordBoundary}${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}${wordBoundary}`, 
            options.caseSensitive ? '' : 'i'
          );
          isMatch = regex.test(content);
        } else {
          // Match any occurrence
          isMatch = content.includes(searchQuery);
        }
        
        if (isMatch) {
          results.push(highlight);
        }
      }
    }
    
    return results;
  }

  /**
   * Auto-tags highlights based on content analysis
   * @param library - The highlight library to process
   * @param customTags - Optional custom tags to apply based on keywords
   * @returns The updated library with tags
   */
  public autoTagHighlights(
    library: HighlightLibrary,
    customTags: Record<string, string[]> = {}
  ): HighlightLibrary {
    // Default tags and their keywords
    const defaultTags: Record<string, string[]> = {
      'definition': ['means', 'is defined as', 'refers to', 'definition'],
      'example': ['example', 'instance', 'illustration', 'case study'],
      'quote': ['said', 'according to', 'quote', '"', '"'],
      'important': ['important', 'crucial', 'essential', 'significant'],
      'concept': ['concept', 'principle', 'theory', 'framework', 'model'],
    };
    
    // Combine default and custom tags
    const allTags = { ...defaultTags, ...customTags };
    
    // Process each highlight
    for (const book of library.books) {
      for (const highlight of book.highlights) {
        // Skip if already tagged manually
        if (highlight.tags.length > 0) continue;
        
        const contentLower = highlight.content.toLowerCase();
        
        // Check for each tag
        for (const [tag, keywords] of Object.entries(allTags)) {
          for (const keyword of keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
              if (!highlight.tags.includes(tag)) {
                highlight.tags.push(tag);
              }
              break; // No need to check other keywords for this tag
            }
          }
        }
      }
    }
    
    return library;
  }

  /**
   * Groups highlights by tags
   * @param library - The highlight library
   * @returns A map of tags to highlights
   */
  public groupByTags(library: HighlightLibrary): Map<string, Highlight[]> {
    const tagMap = new Map<string, Highlight[]>();
    
    for (const book of library.books) {
      for (const highlight of book.highlights) {
        for (const tag of highlight.tags) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }
          tagMap.get(tag)?.push(highlight);
        }
      }
    }
    
    return tagMap;
  }

  /**
   * Creates a summary of a book based on its highlights
   * @param book - The book highlights to summarize
   * @returns A summary of the book
   */
  public createBookSummary(book: BookHighlights): string {
    if (book.highlights.length === 0) {
      return `No highlights found for "${book.title}".`;
    }
    
    // Sort highlights by location
    const sortedHighlights = [...book.highlights].sort((a, b) => {
      const locA = parseInt(a.location.split('-')[0]);
      const locB = parseInt(b.location.split('-')[0]);
      return locA - locB;
    });
    
    // Group by chapters if possible (this is a simplified approach)
    const chapterBreakpoint = Math.floor(sortedHighlights.length / 5); // Arbitrary division
    const chapters: Highlight[][] = [];
    
    for (let i = 0; i < sortedHighlights.length; i += chapterBreakpoint) {
      chapters.push(sortedHighlights.slice(i, i + chapterBreakpoint));
    }
    
    // Generate summary
    let summary = `# Summary of "${book.title}"\n\n`;
    if (book.author) {
      summary += `*By ${book.author}*\n\n`;
    }
    
    summary += `## Key Highlights\n\n`;
    
    // Add chapter summaries
    for (let i = 0; i < chapters.length; i++) {
      summary += `### Section ${i + 1}\n\n`;
      
      for (const highlight of chapters[i]) {
        if (highlight.type === 'highlight' || highlight.type === 'note') {
          summary += `- ${highlight.content}\n`;
        }
      }
      
      summary += '\n';
    }
    
    return summary;
  }

  /**
   * Exports highlights to different formats
   * @param library - The highlight library to export
   * @param format - The export format
   * @param options - Export options
   * @returns The exported content as a string
   */
  public exportHighlights(
    library: HighlightLibrary,
    format: 'markdown' | 'csv' | 'json',
    options: {
      includeBooks?: string[],
      includeTags?: string[],
      groupByBook?: boolean
    } = {}
  ): string {
    // Filter books if needed
    let booksToExport = library.books;
    if (options.includeBooks && options.includeBooks.length > 0) {
      booksToExport = booksToExport.filter(b => 
        options.includeBooks?.includes(b.title));
    }
    
    // Filter highlights by tags if needed
    if (options.includeTags && options.includeTags.length > 0) {
      booksToExport = booksToExport.map(book => ({
        ...book,
        highlights: book.highlights.filter(highlight => 
          highlight.tags.some(tag => options.includeTags?.includes(tag)))
      }));
    }
    
    // Export based on format
    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(booksToExport, options.groupByBook ?? true);
      
      case 'csv':
        return this.exportToCsv(booksToExport);
      
      case 'json':
        return JSON.stringify({
          books: booksToExport,
          totalHighlights: booksToExport.reduce(
            (sum, book) => sum + book.highlights.length, 0),
          lastUpdated: new Date()
        }, null, 2);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Exports highlights to Markdown format
   * @param books - The books to export
   * @param groupByBook - Whether to group highlights by book
   * @returns Markdown formatted string
   */
  private exportToMarkdown(books: BookHighlights[], groupByBook: boolean): string {
    let markdown = '# My Kindle Highlights\n\n';
    
    if (groupByBook) {
      // Group by book
      for (const book of books) {
        markdown += `## ${book.title}\n`;
        if (book.author) {
          markdown += `*By ${book.author}*\n\n`;
        }
        
        for (const highlight of book.highlights) {
          markdown += `> ${highlight.content}\n\n`;
          
          const metadata = [];
          if (highlight.location) metadata.push(`Location: ${highlight.location}`);
          if (highlight.page) metadata.push(`Page: ${highlight.page}`);
          if (highlight.tags.length > 0) metadata.push(`Tags: ${highlight.tags.join(', ')}`);
          
          if (metadata.length > 0) {
            markdown += `*${metadata.join(' | ')}*\n\n`;
          }
        }
        
        markdown += '\n---\n\n';
      }
    } else {
      // Flat list
      for (const book of books) {
        for (const highlight of book.highlights) {
          markdown += `> ${highlight.content}\n\n`;
          
          markdown += `*From: ${book.title}`;
          if (book.author) markdown += ` by ${book.author}`;
          markdown += `*\n\n`;
          
          const metadata = [];
          if (highlight.location) metadata.push(`Location: ${highlight.location}`);
          if (highlight.page) metadata.push(`Page: ${highlight.page}`);
          if (highlight.tags.length > 0) metadata.push(`Tags: ${highlight.tags.join(', ')}`);
          
          if (metadata.length > 0) {
            markdown += `*${metadata.join(' | ')}*\n\n`;
          }
          
          markdown += '---\n\n';
        }
      }
    }
    
    return markdown;
  }

  /**
   * Exports highlights to CSV format
   * @param books - The books to export
   * @returns CSV formatted string
   */
  private exportToCsv(books: BookHighlights[]): string {
    let csv = 'Book Title,Author,Content,Location,Page,Date Added,Type,Tags\n';
    
    for (const book of books) {
      for (const highlight of book.highlights) {
        // Escape commas and quotes in content
        const escapedContent = highlight.content
          .replace(/"/g, '""')
          .replace(/\n/g, ' ');
        
        const row = [
          `"${book.title.replace(/"/g, '""')}"`,
          book.author ? `"${book.author.replace(/"/g, '""')}"` : '',
          `"${escapedContent}"`,
          highlight.location,
          highlight.page || '',
          highlight.dateAdded.toISOString(),
          highlight.type,
          `"${highlight.tags.join(', ')}"`
        ];
        
        csv += row.join(',') + '\n';
      }
    }
    
    return csv;
  }

  /**
   * Creates flashcards from highlights
   * @param library - The highlight library
   * @param options - Flashcard generation options
   * @returns An array of flashcards (question-answer pairs)
   */
  public createFlashcards(
    library: HighlightLibrary,
    options: {
      onlyTagged?: string[],
      maxCards?: number
    } = {}
  ): Array<{ question: string; answer: string; source: string }> {
    const flashcards: Array<{ question: string; answer: string; source: string }> = [];
    
    for (const book of library.books) {
      for (const highlight of book.highlights) {
        // Skip if filtering by tags and this highlight doesn't match
        if (options.onlyTagged && options.onlyTagged.length > 0) {
          if (!highlight.tags.some(tag => options.onlyTagged?.includes(tag))) {
            continue;
          }
        }
        
        // Skip very short highlights
        if (highlight.content.split(' ').length < 5) {
          continue;
        }
        
        // Generate question based on content
        const content = highlight.content;
        let question = '';
        
        // Simple strategy: for definitions, use "What is X?"
        if (content.includes(' is ') || content.includes(' are ')) {
          const parts = content.split(/\s+is\s+|\s+are\s+/);
          if (parts.length >= 2) {
            question = `What is ${parts[0].trim()}?`;
          }
        } 
        // For quotes, ask who said it
        else if (highlight.tags.includes('quote')) {
          question = `Who said: "${content}"?`;
        }
        // Otherwise create a fill-in-the-blank
        else {
          const words = content.split(' ');
          if (words.length >= 7) {
            // Find a significant word to blank out (not a common word)
            const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
            
            // Find longest word that's not common
            let longestWord = '';
            let longestWordIndex = -1;
            
            for (let i = 0; i < words.length; i++) {
              const word = words[i].replace(/[.,;:!?]/, '').toLowerCase();
              if (!commonWords.includes(word) && word.length > longestWord.length) {
                longestWord = words[i];
                longestWordIndex = i;
              }
            }
            
            if (longestWordIndex >= 0) {
              words[longestWordIndex] = '________';
              question = words.join(' ');
            }
          }
        }
        
        // If we generated a question, add it to flashcards
        if (question) {
          flashcards.push({
            question,
            answer: content,
            source: `${book.title}${book.author ? ` by ${book.author}` : ''}`
          });
          
          // Stop if we've reached the maximum
          if (options.maxCards && flashcards.length >= options.maxCards) {
            break;
          }
        }
      }
      
      // Check if we've hit the maximum
      if (options.maxCards && flashcards.length >= options.maxCards) {
        break;
      }
    }
    
    return flashcards;
  }
}
