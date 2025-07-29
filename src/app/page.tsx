'use client';

import { useState } from 'react';
import styles from './page.module.css';

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

interface ScrapedContent {
  title: string;
  content: string;
  links: LinkInfo[];
  wordCount: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'migration' | 'scrape'>('migration');
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [scrapedContent, setScrapedContent] = useState<ScrapedContent | null>(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!url1 || !url2) {
      setError('Please enter both URLs');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url1, url2 }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare websites');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl) {
      setError('Please enter a URL to scrape');
      return;
    }

    setIsLoading(true);
    setError('');
    setScrapedContent(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scrapeUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape content');
      }

      const data = await response.json();
      setScrapedContent(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const LinkTable = ({ links, title }: { links: LinkInfo[]; title: string }) => (
    <div className={styles.tableContainer}>
      <h3 className={styles.tableTitle}>{title}</h3>
      {links.length === 0 ? (
        <p className={styles.noLinks}>No links found</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.linkTable}>
            <thead>
              <tr>
                <th>Link</th>
                <th>Anchor Text</th>
                <th>Type</th>
                <th>Follow</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, index) => (
                <tr key={index}>
                  <td className={styles.urlCell}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.url}
                    </a>
                  </td>
                  <td className={styles.anchorCell}>
                    {link.anchorText.length > 50 
                      ? `${link.anchorText.substring(0, 50)}...` 
                      : link.anchorText}
                  </td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[link.type]}`}>
                      {link.type}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.followBadge} ${link.follow ? styles.follow : styles.nofollow}`}>
                      {link.follow ? 'Follow' : 'NoFollow'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const getAllLinks = (linkData: LinkData): LinkInfo[] => {
    return [...linkData.internalLinks, ...linkData.externalLinks];
  };

  const getSharedLinks = (): LinkInfo[] => {
    if (!results) return [];
    return [...results.shared.internalLinks, ...results.shared.externalLinks];
  };

  const getMissingLinks = (): LinkInfo[] => {
    if (!results) return [];
    const oldSiteLinks = getAllLinks(results.url1);
    const newSiteLinks = getAllLinks(results.url2);
    const newSiteUrls = new Set(newSiteLinks.map(link => link.url));
    return oldSiteLinks.filter(link => !newSiteUrls.has(link.url));
  };

  const getMissingInternalLinks = (): LinkInfo[] => {
    return getMissingLinks().filter(link => link.type === 'internal');
  };

  const getMissingExternalLinks = (): LinkInfo[] => {
    return getMissingLinks().filter(link => link.type === 'external');
  };

  const calculateSimilarity = (): number => {
    if (!results) return 0;
    const oldSiteLinks = getAllLinks(results.url1);
    const sharedLinks = getSharedLinks();
    if (oldSiteLinks.length === 0) return 0;
    return Math.round((sharedLinks.length / oldSiteLinks.length) * 100);
  };

  const getSimilarityColor = (percentage: number): string => {
    if (percentage >= 80) return styles.highSimilarity;
    if (percentage >= 60) return styles.mediumSimilarity;
    return styles.lowSimilarity;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Website Analysis Tools</h1>
        <p className={styles.subtitle}>
          Migration analysis and content scraping tools
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'migration' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('migration')}
            >
              Migration Analysis
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'scrape' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('scrape')}
            >
              Scrape Content
            </button>
          </div>
        </div>

        {activeTab === 'migration' && (
          <>
            <div className={styles.inputSection}>
              <div className={styles.urlInputs}>
                <div className={styles.inputGroup}>
                  <label htmlFor="url1" className={styles.label}>
                    Old Website
                  </label>
                  <input
                    id="url1"
                    type="url"
                    value={url1}
                    onChange={(e) => setUrl1(e.target.value)}
                    placeholder="https://old-website.com"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="url2" className={styles.label}>
                    New Website (Migration)
                  </label>
                  <input
                    id="url2"
                    type="url"
                    value={url2}
                    onChange={(e) => setUrl2(e.target.value)}
                    placeholder="https://new-website.com"
                    className={styles.input}
                  />
                </div>
              </div>

              <button
                onClick={handleCompare}
                disabled={isLoading || !url1 || !url2}
                className={styles.compareButton}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Migration'}
              </button>
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {results && (
              <div className={styles.results}>
                <h2 className={styles.resultsTitle}>Migration Analysis Results</h2>
                
                <div className={styles.similaritySection}>
                  <div className={styles.similarityCard}>
                    <h3>Migration Success Rate</h3>
                    <div className={styles.similarityScore}>
                      <span className={`${styles.percentage} ${getSimilarityColor(calculateSimilarity())}`}>
                        {calculateSimilarity()}%
                      </span>
                      <span className={styles.similarityLabel}>Similarity</span>
                    </div>
                    <p className={styles.similarityDescription}>
                      {calculateSimilarity()}% of links from the old website were successfully migrated to the new website.
                    </p>
                  </div>
                </div>
                
                <div className={styles.resultsGrid}>
                  <div className={styles.resultCard}>
                    <h3>Old Website</h3>
                    <div className={styles.linkStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Total Links:</span>
                        <span className={styles.statValue}>{getAllLinks(results.url1).length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Internal:</span>
                        <span className={styles.statValue}>{results.url1.internalLinks.length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>External:</span>
                        <span className={styles.statValue}>{results.url1.externalLinks.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.resultCard}>
                    <h3>New Website</h3>
                    <div className={styles.linkStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Total Links:</span>
                        <span className={styles.statValue}>{getAllLinks(results.url2).length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Internal:</span>
                        <span className={styles.statValue}>{results.url2.internalLinks.length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>External:</span>
                        <span className={styles.statValue}>{results.url2.externalLinks.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.resultCard}>
                    <h3>Missing Links</h3>
                    <div className={styles.linkStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Total Missing:</span>
                        <span className={styles.statValue}>{getMissingLinks().length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Internal:</span>
                        <span className={styles.statValue}>{getMissingInternalLinks().length}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>External:</span>
                        <span className={styles.statValue}>{getMissingExternalLinks().length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.details}>
                  <div className={styles.detailSection}>
                    <LinkTable 
                      links={getMissingLinks()} 
                      title="Missing Links (Not Migrated)" 
                    />
                  </div>

                  <div className={styles.detailSection}>
                    <LinkTable 
                      links={getAllLinks(results.url1)} 
                      title="Old Website - All Links" 
                    />
                  </div>

                  <div className={styles.detailSection}>
                    <LinkTable 
                      links={getAllLinks(results.url2)} 
                      title="New Website - All Links" 
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'scrape' && (
          <>
            <div className={styles.inputSection}>
              <div className={styles.inputGroup}>
                <label htmlFor="scrapeUrl" className={styles.label}>
                  Website URL to Scrape
                </label>
                <input
                  id="scrapeUrl"
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={styles.input}
                />
              </div>

              <button
                onClick={handleScrape}
                disabled={isLoading || !scrapeUrl}
                className={styles.compareButton}
              >
                {isLoading ? 'Scraping...' : 'Scrape Content'}
              </button>
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {scrapedContent && (
              <div className={styles.results}>
                <h2 className={styles.resultsTitle}>Scraped Content Results</h2>
                
                <div className={styles.scrapedContentSection}>
                  <div className={styles.contentCard}>
                    <h3>Page Title</h3>
                    <p className={styles.pageTitle}>{scrapedContent.title}</p>
                    
                    <div className={styles.contentStats}>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Word Count:</span>
                        <span className={styles.statValue}>{scrapedContent.wordCount}</span>
                      </div>
                      <div className={styles.stat}>
                        <span className={styles.statLabel}>Links Found:</span>
                        <span className={styles.statValue}>{scrapedContent.links.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.details}>
                  <div className={styles.detailSection}>
                    <div className={styles.contentContainer}>
                      <h3>Extracted Content</h3>
                      <div className={styles.contentText}>
                        {scrapedContent.content}
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <LinkTable 
                      links={scrapedContent.links} 
                      title="Content Links" 
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
