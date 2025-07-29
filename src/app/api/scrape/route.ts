import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LinkInfo {
  url: string;
  anchorText: string;
  type: 'internal' | 'external';
  follow: boolean;
}

interface ScrapedContent {
  title: string;
  content: string;
  links: LinkInfo[];
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
    
    // Remove navigation, header, footer, and other non-content elements
    const elementsToRemove = [
      'header', 'nav', 'footer', '.header', '.nav', '.footer', '.navigation',
      '.menu', '.sidebar', '.advertisement', '.ads', '.banner', '.cookie-banner',
      '.newsletter', '.social-share', '.breadcrumb', '.pagination',
      'script', 'style', 'noscript', 'iframe', 'form'
    ];
    
    elementsToRemove.forEach(selector => {
      $(selector).remove();
    });
    
    // Focus on main content areas
    const contentSelectors = [
      'main', 'article', '.content', '.main-content', '.post-content',
      '.entry-content', '.page-content', '.article-content', 'section'
    ];
    
    let contentElement = null;
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        contentElement = element;
        break;
      }
    }
    
    // If no main content area found, use body but remove unwanted elements
    if (!contentElement) {
      contentElement = $('body');
      // Remove common navigation elements from body
      contentElement.find('header, nav, footer, .header, .nav, .footer, .navigation, .menu, .sidebar').remove();
    }
    
    // Extract text content
    let content = contentElement.text().trim();
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
      .trim();
    
    // Extract links from the content area
    const links: LinkInfo[] = [];
    const seenLinks = new Set<string>();
    
    contentElement.find('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        let absoluteUrl: string;
        
        if (href.startsWith('http')) {
          absoluteUrl = href;
        } else if (href.startsWith('//')) {
          absoluteUrl = `https:${href}`;
        } else if (href.startsWith('/')) {
          absoluteUrl = `${urlObj.protocol}//${domain}${href}`;
        } else {
          absoluteUrl = `${urlObj.protocol}//${domain}/${href}`;
        }

        // Normalize URL
        const normalizedLink = new URL(absoluteUrl);
        normalizedLink.hash = '';
        normalizedLink.search = '';
        const cleanUrl = normalizedLink.toString();

        // Avoid duplicates
        if (seenLinks.has(cleanUrl)) return;
        seenLinks.add(cleanUrl);

        // Extract anchor text and follow status
        const anchorText = $(element).text().trim() || cleanUrl;
        const rel = $(element).attr('rel') || '';
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
      } catch (error: unknown) {
        // Skip invalid URLs
        console.warn(`Invalid URL: ${href}`);
      }
    });
    
    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      title,
      content,
      links,
      wordCount,
    };
  } catch (error: unknown) {
    console.error(`Error scraping ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to scrape ${url}: ${errorMessage}`);
  }
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