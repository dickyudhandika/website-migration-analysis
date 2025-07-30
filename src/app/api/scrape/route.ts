import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LinkInfo {
  url: string;
  anchorText: string;
  type: 'internal' | 'external';
  follow: boolean;
}

interface ContentSection {
  title: string;
  content: string;
  links: LinkInfo[];
}

interface ScrapedContent {
  title: string;
  sections: ContentSection[];
  allLinks: LinkInfo[];
  wordCount: number;
}

async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    // Fetch the webpage
    const response = await axios.get(normalizedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentScraper/1.0)',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract page title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title found';
    
    // Remove script, style, and noscript elements
    $('script, style, noscript').remove();
    
    // Extract content by sections
    const sections = extractContentBySections($, urlObj, domain);
    
    // Get all links for the allLinks property
    const allLinks: LinkInfo[] = [];
    const seenLinks = new Set<string>();
    extractAllLinks($, urlObj, domain, allLinks, seenLinks);
    
    // Calculate total word count from all text content
    const allText = sections.map((section: ContentSection) => section.content).join(' ');
    const wordCount = allText.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
      title,
      sections,
      allLinks,
      wordCount,
    };
  } catch (error: unknown) {
    console.error(`Error scraping ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
  }
}

function extractContentBySections($: cheerio.CheerioAPI, urlObj: URL, domain: string): ContentSection[] {
  const sections: ContentSection[] = [];
  
  // Extract enhanced text content with links and structure
  const textContent = extractEnhancedTextContent($, urlObj, domain);
  if (textContent.trim()) {
    sections.push({
      title: 'Text Content',
      content: textContent,
      links: []
    });
  }
  
  // Extract images content
  const imagesContent = extractImagesContent($, urlObj, domain);
  if (imagesContent.trim()) {
    sections.push({
      title: 'Images Content',
      content: imagesContent,
      links: []
    });
  }
  
  return sections;
}

function extractEnhancedTextContent($: cheerio.CheerioAPI, urlObj: URL, domain: string): string {
  // Clone the body to avoid modifying the original
  const $body = $('body').clone();
  
  // Remove all script, style, and noscript elements
  $body.find('script, style, noscript').remove();
  
  let content = '';
  let sectionCounter = 1;
  
  // Process main content areas
  $body.find('main, article, section, div[class*="content"], div[class*="main"], .content, .main').each((_, element) => {
    const $element = $(element);
    const sectionText = processElementWithLinks($element, urlObj, domain);
    
    if (sectionText.trim()) {
      content += `section ${sectionCounter}:\n\n${sectionText.trim()}\n\n-----\n\n`;
      sectionCounter++;
    }
  });
  
  // If no structured sections found, process the entire body
  if (!content.trim()) {
    const bodyText = processElementWithLinks($body, urlObj, domain);
    if (bodyText.trim()) {
      content = `section 1:\n\n${bodyText.trim()}\n\n-----\n\n`;
    }
  }
  
  return content.trim();
}

function processElementWithLinks($element: cheerio.Cheerio<any>, urlObj: URL, domain: string): string {
  let content = '';
  
  // Process text nodes and links
  $element.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = (node as any).data || '';
      if (text.trim()) {
        content += text + ' ';
      }
    } else if (node.type === 'tag') {
      const tagName = node.name;
      
      if (tagName === 'a') {
        // Process links
        const href = node.attribs?.href;
        const anchorText = (node.children?.[0] as any)?.data?.trim() || '';
        
        if (href && anchorText) {
          try {
            let absoluteUrl: string;
            
            if (href.startsWith('http')) {
              absoluteUrl = href;
            } else if (href.startsWith('//')) {
              absoluteUrl = `https:${href}`;
            } else if (href.startsWith('/')) {
              absoluteUrl = `${urlObj.protocol}//${domain}${href}`;
            } else if (href.startsWith('mailto:') || href.startsWith('tel:')) {
              content += anchorText + ' ';
              return;
            } else {
              absoluteUrl = `${urlObj.protocol}//${domain}/${href}`;
            }

            const normalizedLink = new URL(absoluteUrl);
            normalizedLink.hash = '';
            normalizedLink.search = '';
            const cleanUrl = normalizedLink.toString();
            
            // Add link with markdown format for frontend processing
            content += `[${anchorText}](${cleanUrl}) `;
          } catch (error) {
            content += anchorText + ' ';
          }
        } else {
          content += anchorText + ' ';
        }
      } else if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'hr'].includes(tagName)) {
        // Add line breaks for block elements
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }
        
        // Process child elements
        const $childElement = $element.find(node);
        const childText = processElementWithLinks($childElement, urlObj, domain);
        if (childText.trim()) {
          content += childText.trim() + '\n';
        }
      } else {
        // Process other elements recursively
        const $childElement = $element.find(node);
        const childText = processElementWithLinks($childElement, urlObj, domain);
        if (childText.trim()) {
          content += childText + ' ';
        }
      }
    }
  });
  
  return content;
}

function extractLinksContent($: cheerio.CheerioAPI, urlObj: URL, domain: string): string {
  let content = '';
  
  $('a[href]').each((_, element) => {
    const $element = $(element);
    const href = $element.attr('href') || '';
    const anchorText = $element.text().trim();
    
    if (href && href !== '#' && anchorText) {
      try {
        let absoluteUrl: string;
        
        if (href.startsWith('http')) {
          absoluteUrl = href;
        } else if (href.startsWith('//')) {
          absoluteUrl = `https:${href}`;
        } else if (href.startsWith('/')) {
          absoluteUrl = `${urlObj.protocol}//${domain}${href}`;
        } else if (href.startsWith('mailto:') || href.startsWith('tel:')) {
          return;
        } else {
          absoluteUrl = `${urlObj.protocol}//${domain}/${href}`;
        }

        const normalizedLink = new URL(absoluteUrl);
        normalizedLink.hash = '';
        normalizedLink.search = '';
        const cleanUrl = normalizedLink.toString();
        
        content += `Link: ${anchorText} -> ${cleanUrl}\n`;
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });
  
  return content.trim();
}

function extractButtonsContent($: cheerio.CheerioAPI): string {
  let content = '';
  
  $('button, input[type="button"], input[type="submit"], input[type="reset"]').each((_, element) => {
    const $element = $(element);
    const buttonText = $element.text().trim() || $element.attr('value') || $element.attr('title') || 'Button';
    const buttonType = $element.is('button') ? 'button' : $element.attr('type') || 'button';
    
    content += `${buttonType}: ${buttonText}\n`;
  });
  
  return content.trim();
}

function extractImagesContent($: cheerio.CheerioAPI, urlObj: URL, domain: string): string {
  let content = '';
  
  $('img[src]').each((_, element) => {
    const $element = $(element);
    const src = $element.attr('src') || '';
    const alt = $element.attr('alt') || '';
    const title = $element.attr('title') || '';
    const width = $element.attr('width') || '';
    const height = $element.attr('height') || '';
    
    if (src) {
      try {
        let absoluteUrl: string;
        
        if (src.startsWith('http')) {
          absoluteUrl = src;
        } else if (src.startsWith('//')) {
          absoluteUrl = `https:${src}`;
        } else if (src.startsWith('/')) {
          absoluteUrl = `${urlObj.protocol}//${domain}${src}`;
        } else {
          absoluteUrl = `${urlObj.protocol}//${domain}/${src}`;
        }

        const normalizedLink = new URL(absoluteUrl);
        normalizedLink.hash = '';
        normalizedLink.search = '';
        const cleanUrl = normalizedLink.toString();
        
        const description = alt || title || 'Image';
        const dimensions = width && height ? ` (${width}x${height})` : '';
        
        content += `Image: ${description}${dimensions} -> ${cleanUrl}\n`;
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });
  
  return content.trim();
}

function extractTextAndLinks($: cheerio.CheerioAPI, urlObj: URL, domain: string): { content: string; links: LinkInfo[] } {
  const links: LinkInfo[] = [];
  const seenLinks = new Set<string>();
  
  // Extract pure text content without any link formatting
  let content = extractPureTextContent($);
  
  // Extract all links separately
  extractAllLinks($, urlObj, domain, links, seenLinks);
  
  return { content, links };
}

function extractPureTextContent($: cheerio.CheerioAPI): string {
  // Clone the body to avoid modifying the original
  const $body = $('body').clone();
  
  // Remove all script, style, and noscript elements
  $body.find('script, style, noscript').remove();
  
  // Extract text content from all elements
  let content = '';
  
  // Process all text nodes recursively
  $body.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = (node as any).data || '';
      if (text.trim()) {
        content += text + ' ';
      }
    } else if (node.type === 'tag') {
      // For block elements, add line breaks
      const tagName = node.name;
      const isBlockElement = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'hr'].includes(tagName);
      
      if (isBlockElement && content && !content.endsWith('\n')) {
        content += '\n';
      }
      
      // Recursively process child elements
      const $element = $(node);
      $element.contents().each((_, childNode) => {
        if (childNode.type === 'text') {
          const text = (childNode as any).data || '';
          if (text.trim()) {
            content += text + ' ';
          }
        } else if (childNode.type === 'tag') {
          const childTagName = childNode.name;
          const isChildBlockElement = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'hr'].includes(childTagName);
          
          if (isChildBlockElement && content && !content.endsWith('\n')) {
            content += '\n';
          }
          
          // Extract text from child element
          const $childElement = $(childNode);
          const childText = $childElement.text().trim();
          if (childText) {
            content += childText + ' ';
          }
        }
      });
      
      // Add line break after block elements
      if (isBlockElement) {
        content += '\n';
      }
    }
  });
  
  // Clean up the content
  content = content
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/\n\s+/g, '\n') // Remove leading spaces after newlines
    .trim();
  
  return content;
}

function extractAllLinks($: cheerio.CheerioAPI, urlObj: URL, domain: string, links: LinkInfo[], seenLinks: Set<string>): void {
  // Extract ALL links from the entire page (buttons, images, text, etc.)
  $('a[href], button[onclick], img[src], [data-href], [data-url]').each((_, element) => {
    const $element = $(element);
    let href = '';
    
    // Check different types of links
    if ($element.is('a')) {
      href = $element.attr('href') || '';
    } else if ($element.is('button')) {
      const onclick = $element.attr('onclick') || '';
      // Extract URL from onclick if it contains one
      const urlMatch = onclick.match(/['"`](https?:\/\/[^'"`]+)['"`]/);
      if (urlMatch) href = urlMatch[1];
    } else if ($element.is('img')) {
      href = $element.attr('src') || '';
    } else {
      // Check for data attributes
      href = $element.attr('data-href') || $element.attr('data-url') || '';
    }
    
    if (href && href !== '#') {
      try {
        let absoluteUrl: string;
        
        if (href.startsWith('http')) {
          absoluteUrl = href;
        } else if (href.startsWith('//')) {
          absoluteUrl = `https:${href}`;
        } else if (href.startsWith('/')) {
          absoluteUrl = `${urlObj.protocol}//${domain}${href}`;
        } else if (href.startsWith('mailto:') || href.startsWith('tel:')) {
          // Skip email and phone links
          return;
        } else {
          absoluteUrl = `${urlObj.protocol}//${domain}/${href}`;
        }

        // Normalize URL
        const normalizedLink = new URL(absoluteUrl);
        normalizedLink.hash = '';
        normalizedLink.search = '';
        const cleanUrl = normalizedLink.toString();

        // Avoid duplicates
        if (!seenLinks.has(cleanUrl)) {
          seenLinks.add(cleanUrl);

          // Extract anchor text or alt text
          let anchorText = '';
          if ($element.is('a')) {
            anchorText = $element.text().trim() || cleanUrl;
          } else if ($element.is('img')) {
            anchorText = $element.attr('alt') || $element.attr('title') || cleanUrl;
          } else {
            anchorText = $element.text().trim() || $element.attr('title') || cleanUrl;
          }
          
          const rel = $element.attr('rel') || '';
          const follow = !rel.includes('nofollow');

          const linkInfo: LinkInfo = {
            url: cleanUrl,
            anchorText: anchorText,
            type: 'external',
            follow: follow,
          };

          // Categorize as internal or external
          const linkDomain = normalizedLink.hostname;
          if (linkDomain === domain) {
            linkInfo.type = 'internal';
          }
          
          links.push(linkInfo);
        }
      } catch (error: unknown) {
        // Skip invalid URLs
        console.warn(`Invalid URL: ${href}`);
      }
    }
  });
}



export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const scrapedContent = await scrapeWebsite(url);
    return NextResponse.json(scrapedContent);
  } catch (error: unknown) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape content';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 