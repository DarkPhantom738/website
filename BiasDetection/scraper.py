#!/usr/bin/env python3
"""
ULTRA-AGGRESSIVE News Article Scraper v3
=========================================
Actually gets you 1000+ articles by removing all limits.

Dependencies:
    pip install requests trafilatura feedparser beautifulsoup4 pandas tqdm
"""

import os
import time
import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict
import warnings
import hashlib

import requests
import feedparser
from bs4 import BeautifulSoup
from trafilatura import extract, fetch_url
from trafilatura.settings import use_config
from tqdm import tqdm
import pandas as pd

warnings.filterwarnings('ignore')


class UltraAggressiveScraper:
    """Get 1000+ articles by scraping EVERYTHING."""
    
    def __init__(self, output_dir: str = "scraped_articles", max_articles: int = 1000):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.max_articles = max_articles
        self.articles = []
        self.seen_urls = set()
        self.seen_content_hashes = set()
        
        # Ultra-fast rate limiting
        self.request_delay = 0.3
        self.last_request_time = 0
        
        # Configure trafilatura
        self.trafilatura_config = use_config()
        self.trafilatura_config.set("DEFAULT", "MIN_EXTRACTED_SIZE", "150")
        
        # Statistics
        self.stats = {
            'attempted': 0,
            'successful': 0,
            'duplicates': 0,
            'errors': 0,
            'too_short': 0
        }
        
        # Expanded feed list - 100+ feeds
        self.rss_feeds = self._get_massive_feed_list()
    
    def _get_massive_feed_list(self) -> Dict[str, str]:
        """Return 100+ RSS feeds."""
        return {
            # BBC - All categories
            'BBC News': 'http://feeds.bbci.co.uk/news/rss.xml',
            'BBC World': 'http://feeds.bbci.co.uk/news/world/rss.xml',
            'BBC US & Canada': 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
            'BBC Asia': 'http://feeds.bbci.co.uk/news/world/asia/rss.xml',
            'BBC Europe': 'http://feeds.bbci.co.uk/news/world/europe/rss.xml',
            'BBC Middle East': 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
            'BBC Africa': 'http://feeds.bbci.co.uk/news/world/africa/rss.xml',
            'BBC Latin America': 'http://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
            'BBC Business': 'http://feeds.bbci.co.uk/news/business/rss.xml',
            'BBC Technology': 'http://feeds.bbci.co.uk/news/technology/rss.xml',
            'BBC Science': 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
            'BBC Health': 'http://feeds.bbci.co.uk/news/health/rss.xml',
            
            # Guardian - All categories
            'Guardian World': 'https://www.theguardian.com/world/rss',
            'Guardian UK': 'https://www.theguardian.com/uk-news/rss',
            'Guardian US': 'https://www.theguardian.com/us-news/rss',
            'Guardian Politics': 'https://www.theguardian.com/politics/rss',
            'Guardian Environment': 'https://www.theguardian.com/environment/rss',
            'Guardian Tech': 'https://www.theguardian.com/technology/rss',
            'Guardian Business': 'https://www.theguardian.com/business/rss',
            'Guardian Science': 'https://www.theguardian.com/science/rss',
            'Guardian Opinion': 'https://www.theguardian.com/commentisfree/rss',
            'Guardian Culture': 'https://www.theguardian.com/culture/rss',
            
            # NPR - All shows
            'NPR News': 'https://feeds.npr.org/1001/rss.xml',
            'NPR World': 'https://feeds.npr.org/1004/rss.xml',
            'NPR Politics': 'https://feeds.npr.org/1014/rss.xml',
            'NPR Business': 'https://feeds.npr.org/1006/rss.xml',
            'NPR Technology': 'https://feeds.npr.org/1019/rss.xml',
            'NPR Health': 'https://feeds.npr.org/1128/rss.xml',
            'NPR Science': 'https://feeds.npr.org/1007/rss.xml',
            
            # NY Times - All sections
            'NY Times World': 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
            'NY Times US': 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
            'NY Times Politics': 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
            'NY Times Business': 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
            'NY Times Technology': 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
            'NY Times Science': 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
            'NY Times Health': 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
            
            # CNN - All sections
            'CNN World': 'http://rss.cnn.com/rss/cnn_world.rss',
            'CNN US': 'http://rss.cnn.com/rss/cnn_us.rss',
            'CNN Politics': 'http://rss.cnn.com/rss/cnn_allpolitics.rss',
            'CNN Tech': 'http://rss.cnn.com/rss/cnn_tech.rss',
            'CNN Business': 'http://rss.cnn.com/rss/money_latest.rss',
            
            # Reuters/Yahoo
            'Reuters World': 'https://news.yahoo.com/rss/world',
            'Reuters Business': 'https://news.yahoo.com/rss/business',
            'Reuters Technology': 'https://news.yahoo.com/rss/tech',
            'Reuters Politics': 'https://news.yahoo.com/rss/politics',
            'Reuters Science': 'https://news.yahoo.com/rss/science',
            
            # AP News
            'AP Top News': 'https://apnews.com/apf-topnews',
            'AP US News': 'https://apnews.com/apf-usnews',
            'AP World News': 'https://apnews.com/apf-worldnews',
            'AP Politics': 'https://apnews.com/apf-politics',
            
            # Other Major Sources
            'ABC News': 'https://abcnews.go.com/abcnews/topstories',
            'CBS News': 'https://www.cbsnews.com/latest/rss/main',
            'NBC News': 'https://feeds.nbcnews.com/nbcnews/public/news',
            'USA Today': 'http://rssfeeds.usatoday.com/usatoday-NewsTopStories',
            
            # Washington Post
            'WaPo Politics': 'https://feeds.washingtonpost.com/rss/politics',
            'WaPo World': 'https://feeds.washingtonpost.com/rss/world',
            'WaPo National': 'https://feeds.washingtonpost.com/rss/national',
            
            # Al Jazeera
            'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
            
            # Political & Analysis
            'The Hill': 'https://thehill.com/news/feed/',
            'Politico': 'https://www.politico.com/rss/politicopicks.xml',
            'The Atlantic': 'https://www.theatlantic.com/feed/all/',
            'Vox': 'https://www.vox.com/rss/index.xml',
            'Vice News': 'https://www.vice.com/en/rss',
            'HuffPost': 'https://www.huffpost.com/section/front-page/feed',
            
            # Tech & Science
            'Wired': 'https://www.wired.com/feed/rss',
            'TechCrunch': 'https://techcrunch.com/feed/',
            'Ars Technica': 'http://feeds.arstechnica.com/arstechnica/index',
            'The Verge': 'https://www.theverge.com/rss/index.xml',
            'Scientific American': 'http://rss.sciam.com/ScientificAmerican-Global',
            'Nature News': 'http://feeds.nature.com/nature/rss/current',
            
            # International
            'DW News': 'https://rss.dw.com/rdf/rss-en-all',
            'France24': 'https://www.france24.com/en/rss',
            'Times of India': 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
            
            # Finance
            'CNBC': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
            'MarketWatch': 'http://feeds.marketwatch.com/marketwatch/topstories/',
        }
    
    def _rate_limit(self):
        """Fast rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self.last_request_time = time.time()
    
    def _content_hash(self, text: str) -> str:
        """Generate hash to detect duplicate content."""
        return hashlib.md5(text[:1000].encode()).hexdigest()
    
    def _is_duplicate(self, text: str) -> bool:
        """Check if content is duplicate."""
        content_hash = self._content_hash(text)
        if content_hash in self.seen_content_hashes:
            return True
        self.seen_content_hashes.add(content_hash)
        return False
    
    def _fetch_article(self, url: str) -> Optional[str]:
        """Fetch and extract article."""
        self.stats['attempted'] += 1
        
        try:
            self._rate_limit()
            downloaded = fetch_url(url)
            
            if not downloaded:
                self.stats['errors'] += 1
                return None
            
            text = extract(downloaded, config=self.trafilatura_config)
            
            if not text:
                text = extract(downloaded, include_comments=False, include_tables=False)
            
            if text and len(text) > 150:
                if not self._is_duplicate(text):
                    self.stats['successful'] += 1
                    return text
                else:
                    self.stats['duplicates'] += 1
            else:
                self.stats['too_short'] += 1
            
            return None
            
        except Exception as e:
            self.stats['errors'] += 1
            return None
    
    def scrape_rss_feeds(self) -> int:
        """Scrape ALL RSS feeds with NO LIMITS."""
        print(f"\n📡 Scraping {len(self.rss_feeds)} RSS feeds (NO LIMITS)...")
        articles_added = 0
        
        progress = tqdm(self.rss_feeds.items(), desc="   Processing feeds")
        
        for source_name, feed_url in progress:
            if len(self.articles) >= self.max_articles:
                break
            
            try:
                feed = feedparser.parse(feed_url)
                
                # NO LIMIT - take ALL entries from each feed
                for entry in feed.entries:
                    if len(self.articles) >= self.max_articles:
                        break
                    
                    url = entry.get('link', '')
                    if not url or url in self.seen_urls:
                        continue
                    
                    self.seen_urls.add(url)
                    text = self._fetch_article(url)
                    
                    if text:
                        self.articles.append({
                            'url': url,
                            'title': entry.get('title', 'Untitled')[:500],
                            'text': text,
                            'source': source_name,
                            'published': entry.get('published', ''),
                            'scraped_at': datetime.now().isoformat()
                        })
                        articles_added += 1
                        progress.set_postfix({'collected': len(self.articles)})
            
            except Exception as e:
                continue
        
        print(f"   ✅ Added {articles_added} articles from RSS feeds")
        return articles_added
    
    def scrape_google_news(self) -> int:
        """Scrape Google News AGGRESSIVELY."""
        topics = [
            'world', 'nation', 'business', 'technology', 'science', 'health',
            'entertainment', 'politics', 'economy', 'finance',
            'climate change', 'artificial intelligence', 'machine learning',
            'cryptocurrency', 'electric vehicles', 'space exploration',
            'renewable energy', 'cybersecurity', 'privacy', 'data science',
            'pandemic', 'mental health', 'education', 'immigration',
            'inflation', 'recession', 'supply chain', 'trade war',
            'nuclear energy', 'solar power', 'carbon emissions',
            'human rights', 'democracy', 'elections',
            'social media', 'misinformation', 'censorship',
            'China news', 'Russia news', 'Europe news', 'Middle East news',
            'India news', 'UK news', 'Canada news', 'Australia news'
        ]
        
        print(f"\n📰 Scraping Google News for {len(topics)} topics...")
        articles_added = 0
        
        for topic in tqdm(topics, desc="   Processing topics"):
            if len(self.articles) >= self.max_articles:
                break
            
            try:
                topic_encoded = topic.replace(' ', '%20')
                rss_url = f'https://news.google.com/rss/search?q={topic_encoded}&hl=en-US&gl=US&ceid=US:en'
                
                feed = feedparser.parse(rss_url)
                
                for entry in feed.entries[:50]:
                    if len(self.articles) >= self.max_articles:
                        break
                    
                    url = entry.get('link', '')
                    if not url or url in self.seen_urls:
                        continue
                    
                    self.seen_urls.add(url)
                    text = self._fetch_article(url)
                    
                    if text:
                        self.articles.append({
                            'url': url,
                            'title': entry.get('title', 'Untitled')[:500],
                            'text': text,
                            'source': f'Google News: {topic}',
                            'published': entry.get('published', ''),
                            'scraped_at': datetime.now().isoformat()
                        })
                        articles_added += 1
            
            except Exception as e:
                continue
        
        print(f"   ✅ Added {articles_added} articles from Google News")
        return articles_added
    
    def scrape_reddit_news(self) -> int:
        """Scrape news subreddit links (no API needed)."""
        print(f"\n🔶 Scraping Reddit news links...")
        articles_added = 0
        
        subreddits = [
            'worldnews', 'news', 'politics', 'technology', 'science',
            'business', 'economics', 'environment', 'TrueReddit'
        ]
        
        for subreddit in tqdm(subreddits, desc="   Processing subreddits"):
            if len(self.articles) >= self.max_articles:
                break
            
            try:
                url = f'https://www.reddit.com/r/{subreddit}/top/.json?limit=100&t=week'
                headers = {'User-Agent': 'Mozilla/5.0'}
                
                self._rate_limit()
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    posts = data.get('data', {}).get('children', [])
                    
                    for post in posts:
                        if len(self.articles) >= self.max_articles:
                            break
                        
                        post_data = post.get('data', {})
                        article_url = post_data.get('url', '')
                        
                        if not article_url or 'reddit.com' in article_url:
                            continue
                        if any(ext in article_url.lower() for ext in ['.jpg', '.png', '.gif', '.mp4', 'youtube.com']):
                            continue
                        
                        if article_url in self.seen_urls:
                            continue
                        
                        self.seen_urls.add(article_url)
                        text = self._fetch_article(article_url)
                        
                        if text:
                            self.articles.append({
                                'url': article_url,
                                'title': post_data.get('title', 'Untitled')[:500],
                                'text': text,
                                'source': f'Reddit r/{subreddit}',
                                'published': '',
                                'scraped_at': datetime.now().isoformat()
                            })
                            articles_added += 1
            
            except Exception as e:
                continue
        
        print(f"   ✅ Added {articles_added} articles from Reddit")
        return articles_added
    
    def scrape_hackernews(self, max_pages: int = 20) -> int:
        """Scrape Hacker News links."""
        print(f"\n🔶 Scraping Hacker News ({max_pages} pages)...")
        articles_added = 0
        
        for page in tqdm(range(1, max_pages + 1), desc="   Processing HN pages"):
            if len(self.articles) >= self.max_articles:
                break
            
            try:
                hn_url = f'https://news.ycombinator.com/news?p={page}'
                self._rate_limit()
                
                response = requests.get(hn_url, timeout=10)
                if response.status_code != 200:
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('span', class_='titleline')
                
                for link in links:
                    if len(self.articles) >= self.max_articles:
                        break
                    
                    a_tag = link.find('a')
                    if not a_tag:
                        continue
                    
                    url = a_tag.get('href', '')
                    title = a_tag.text.strip()
                    
                    if not url or url.startswith('item?') or url in self.seen_urls:
                        continue
                    
                    if not any(ext in url for ext in ['.com', '.org', '.net', '.gov', '.edu', '.io']):
                        continue
                    
                    self.seen_urls.add(url)
                    text = self._fetch_article(url)
                    
                    if text:
                        self.articles.append({
                            'url': url,
                            'title': title[:500],
                            'text': text,
                            'source': 'Hacker News',
                            'published': '',
                            'scraped_at': datetime.now().isoformat()
                        })
                        articles_added += 1
            
            except Exception as e:
                continue
        
        print(f"   ✅ Added {articles_added} articles from Hacker News")
        return articles_added
    
    def scrape_all(self):
        """Run ALL scraping methods until we hit max_articles."""
        print("\n" + "=" * 80)
        print(" 🚀 ULTRA-AGGRESSIVE SCRAPER v3 - NO LIMITS MODE")
        print("=" * 80)
        print(f"\nTarget: {self.max_articles} articles\n")
        
        start_time = time.time()
        
        # Method 1: RSS Feeds (ALL entries from ALL feeds)
        if len(self.articles) < self.max_articles:
            self.scrape_rss_feeds()
        
        # Method 2: Google News (50+ topics)
        if len(self.articles) < self.max_articles:
            self.scrape_google_news()
        
        # Method 3: Reddit news links
        if len(self.articles) < self.max_articles:
            self.scrape_reddit_news()
        
        # Method 4: Hacker News (20 pages)
        if len(self.articles) < self.max_articles:
            self.scrape_hackernews(max_pages=20)
        
        elapsed = time.time() - start_time
        
        print(f"\n{'='*80}")
        print(f"✅ SCRAPING COMPLETE in {elapsed/60:.1f} minutes")
        print(f"{'='*80}")
        print(f"\n📊 Final Statistics:")
        print(f"   • Articles collected: {len(self.articles)}")
        print(f"   • URLs attempted: {self.stats['attempted']}")
        print(f"   • Successful extractions: {self.stats['successful']}")
        print(f"   • Duplicates skipped: {self.stats['duplicates']}")
        print(f"   • Too short: {self.stats['too_short']}")
        print(f"   • Errors: {self.stats['errors']}")
        if self.stats['attempted'] > 0:
            print(f"   • Success rate: {self.stats['successful']/self.stats['attempted']*100:.1f}%")
    
    def save_csv(self, filename: str = "articles.csv"):
        """Save articles to CSV."""
        filepath = self.output_dir / filename
        
        df = pd.DataFrame(self.articles)
        df.to_csv(filepath, index=False, quoting=csv.QUOTE_ALL)
        
        print(f"\n💾 Saved CSV: {filepath}")
        print(f"   Size: {os.path.getsize(filepath) / 1024 / 1024:.1f} MB")
        return filepath
    
    def save_txt_files(self, folder_name: str = "txt_articles"):
        """Save each article as separate .txt file."""
        txt_dir = self.output_dir / folder_name
        txt_dir.mkdir(exist_ok=True)
        
        for i, article in enumerate(tqdm(self.articles, desc="Saving text files")):
            safe_source = "".join(c for c in article['source'] if c.isalnum() or c in (' ', '-', '_'))
            filename = f"article_{i:04d}_{safe_source[:30]}.txt"
            filepath = txt_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"Title: {article['title']}\n")
                f.write(f"Source: {article['source']}\n")
                f.write(f"URL: {article['url']}\n")
                f.write(f"Published: {article['published']}\n")
                f.write("\n" + "=" * 80 + "\n\n")
                f.write(article['text'])
        
        print(f"💾 Saved {len(self.articles)} text files: {txt_dir}")
        return txt_dir
    
    def save_json(self, filename: str = "articles.json"):
        """Save articles to JSON."""
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.articles, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved JSON: {filepath}")
        return filepath
    
    def print_summary(self):
        """Print detailed summary."""
        print("\n" + "=" * 80)
        print(" 📊 ARTICLE SUMMARY")
        print("=" * 80)
        
        # Source breakdown
        sources = {}
        for article in self.articles:
            source = article['source']
            sources[source] = sources.get(source, 0) + 1
        
        print(f"\nTop 20 Sources:")
        for source, count in sorted(sources.items(), key=lambda x: x[1], reverse=True)[:20]:
            print(f"  • {source}: {count}")
        
        # Length stats
        lengths = [len(a['text']) for a in self.articles]
        print(f"\nArticle Length Statistics:")
        print(f"  • Average: {sum(lengths)/len(lengths):.0f} characters")
        print(f"  • Shortest: {min(lengths):,} characters")
        print(f"  • Longest: {max(lengths):,} characters")
        
        # Total content
        total_chars = sum(lengths)
        total_words = sum(len(a['text'].split()) for a in self.articles)
        print(f"\nTotal Content:")
        print(f"  • {total_chars:,} characters")
        print(f"  • {total_words:,} words")
        print(f"  • ~{total_words/200:.0f} pages (200 words/page)")
        
        print("\n" + "=" * 80)


def main():
    """Main execution."""
    import argparse
    
    parser = argparse.ArgumentParser(description='ULTRA-AGGRESSIVE news scraper')
    parser.add_argument('--max', type=int, default=1000, help='Maximum articles (default: 1000)')
    parser.add_argument('--output', type=str, default='scraped_articles', help='Output directory')
    parser.add_argument('--format', choices=['csv', 'txt', 'json', 'all'], default='csv',
                       help='Output format (default: csv)')
    
    args = parser.parse_args()
    
    # Create scraper
    scraper = UltraAggressiveScraper(output_dir=args.output, max_articles=args.max)
    
    # Scrape articles
    scraper.scrape_all()
    
    # Save in requested format(s)
    if args.format == 'csv' or args.format == 'all':
        csv_path = scraper.save_csv()
    
    if args.format == 'txt' or args.format == 'all':
        txt_dir = scraper.save_txt_files()
    
    if args.format == 'json' or args.format == 'all':
        scraper.save_json()
    
    # Print summary
    scraper.print_summary()
    
    # Instructions
    print("\n" + "=" * 80)
    print(" 🚀 READY FOR BIAS ANALYSIS!")
    print("=" * 80)
    
    if args.format == 'csv' or args.format == 'all':
        print(f"\nRun: python bias_analyzer.py {csv_path}")
    
    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    main()