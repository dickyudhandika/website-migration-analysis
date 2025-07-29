import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LinkInfo {
  url: string;
  anchorText: string;
  type: 'internal' | 'external';
  follow: boolean;
}

interface LinkData {
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
}

interface ComparisonResult {
  url1: LinkData;
  url2: LinkData;
  shared: {
    internalLinks: LinkInfo[];
    externalLinks: LinkInfo[];
  };
}

async function crawlWebsite(url: string): Promise<LinkData> {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    // Fetch the webpage
    const response = await axios.get(normalizedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebsiteComparer/1.0)',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];
    const seenLinks = new Set<string>();

    // Extract all links
    $('a[href]').each((_, element) => {
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

        // Normalize URL (remove fragments, query params for comparison)
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
          internalLinks.push(linkInfo);
        } else {
          externalLinks.push(linkInfo);
        }
      } catch (error: unknown) {
        // Skip invalid URLs
        console.warn(`Invalid URL: ${href}`);
      }
    });

    return {
      internalLinks: internalLinks,
      externalLinks: externalLinks,
    };
  } catch (error: unknown) {
    console.error(`Error crawling ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to crawl ${url}: ${errorMessage}`);
  }
}

function findSharedLinks(links1: LinkInfo[], links2: LinkInfo[]): LinkInfo[] {
  const set1 = new Set(links1.map(link => link.url));
  return links2.filter(link => set1.has(link.url));
}

export async function POST(request: NextRequest) {
  try {
    const { url1, url2 } = await request.json();

    if (!url1 || !url2) {
      return NextResponse.json(
        { error: 'Both URLs are required' },
        { status: 400 }
      );
    }

    // Crawl both websites concurrently
    const [data1, data2] = await Promise.all([
      crawlWebsite(url1),
      crawlWebsite(url2),
    ]);

    // Find shared links
    const sharedInternalLinks = findSharedLinks(data1.internalLinks, data2.internalLinks);
    const sharedExternalLinks = findSharedLinks(data1.externalLinks, data2.externalLinks);

    const result: ComparisonResult = {
      url1: data1,
      url2: data2,
      shared: {
        internalLinks: sharedInternalLinks,
        externalLinks: sharedExternalLinks,
      },
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Comparison error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to compare websites';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 