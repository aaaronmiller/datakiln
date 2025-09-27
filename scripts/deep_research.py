#!/usr/bin/env python3
"""
Deep Research Automation Script
Automates research workflows using Playwright browser automation
"""

import asyncio
import json
import sys
import argparse
import time
from typing import Dict, List, Any, Optional
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import aiohttp
from urllib.parse import urljoin, urlparse


class DeepResearchAutomator:
    """Automate deep research workflows with browser automation"""
    
    def __init__(self, headless: bool = True, timeout: int = 30000):
        self.headless = headless
        self.timeout = timeout
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Research modes configuration
        self.research_modes = {
            'fast': {
                'max_sources': 3,
                'depth_level': 1,
                'timeout_per_source': 10000,
                'screenshot': False
            },
            'balanced': {
                'max_sources': 5,
                'depth_level': 2,
                'timeout_per_source': 20000,
                'screenshot': True
            },
            'comprehensive': {
                'max_sources': 10,
                'depth_level': 3,
                'timeout_per_source': 30000,
                'screenshot': True
            }
        }
    
    async def initialize(self):
        """Initialize browser and context"""
        playwright = await async_playwright().start()
        
        # Launch browser with optimized settings
        self.browser = await playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',  # Faster loading
                '--disable-javascript',  # Can be enabled per page if needed
            ]
        )
        
        # Create context with realistic user agent
        self.context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            extra_http_headers={
                'Accept-Language': 'en-US,en;q=0.9',
            }
        )
        
        self.page = await self.context.new_page()
        
        # Set default timeout
        self.page.set_default_timeout(self.timeout)
    
    async def cleanup(self):
        """Clean up browser resources"""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
    
    async def search_google(self, query: str, max_results: int = 10) -> List[Dict[str, str]]:
        """Search Google and extract result links"""
        try:
            search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            await self.page.goto(search_url, wait_until='domcontentloaded')
            
            # Wait for search results
            await self.page.wait_for_selector('div[data-ved]', timeout=10000)
            
            # Extract search results
            results = await self.page.evaluate("""
                () => {
                    const results = [];
                    const searchResults = document.querySelectorAll('div[data-ved] h3');
                    
                    searchResults.forEach((element, index) => {
                        const linkElement = element.closest('a');
                        if (linkElement && linkElement.href) {
                            results.push({
                                title: element.textContent.trim(),
                                url: linkElement.href,
                                position: index + 1
                            });
                        }
                    });
                    
                    return results.slice(0, arguments[0]);
                }
            """, max_results)
            
            return results
            
        except Exception as e:
            print(f"Error searching Google: {e}", file=sys.stderr)
            return []
    
    async def extract_page_content(self, url: str, selectors: Dict[str, str] = None) -> Dict[str, Any]:
        """Extract content from a web page"""
        default_selectors = {
            'title': 'title, h1, .title, .headline',
            'content': 'article, .content, .post-content, .entry-content, main, .main-content',
            'meta_description': 'meta[name="description"]',
            'headings': 'h1, h2, h3',
            'links': 'a[href]'
        }
        
        if selectors:
            default_selectors.update(selectors)
        
        try:
            await self.page.goto(url, wait_until='domcontentloaded')
            
            # Wait a bit for dynamic content
            await asyncio.sleep(2)
            
            # Extract content using selectors
            content = await self.page.evaluate("""
                (selectors) => {
                    const result = {
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Extract title
                    const titleElement = document.querySelector(selectors.title);
                    result.title = titleElement ? titleElement.textContent.trim() : document.title;
                    
                    // Extract meta description
                    const metaDesc = document.querySelector(selectors.meta_description);
                    result.meta_description = metaDesc ? metaDesc.getAttribute('content') : '';
                    
                    // Extract main content
                    const contentElements = document.querySelectorAll(selectors.content);
                    result.content = Array.from(contentElements)
                        .map(el => el.textContent.trim())
                        .filter(text => text.length > 50)
                        .join('\\n\\n');
                    
                    // Extract headings
                    const headingElements = document.querySelectorAll(selectors.headings);
                    result.headings = Array.from(headingElements)
                        .map(el => ({
                            level: el.tagName.toLowerCase(),
                            text: el.textContent.trim()
                        }))
                        .filter(h => h.text.length > 0);
                    
                    // Extract links
                    const linkElements = document.querySelectorAll(selectors.links);
                    result.links = Array.from(linkElements)
                        .map(el => ({
                            text: el.textContent.trim(),
                            href: el.href
                        }))
                        .filter(link => link.href && !link.href.startsWith('javascript:'))
                        .slice(0, 20); // Limit to first 20 links
                    
                    return result;
                }
            """, default_selectors)
            
            # Add word count and reading time
            if content.get('content'):
                word_count = len(content['content'].split())
                content['word_count'] = word_count
                content['estimated_reading_time'] = max(1, word_count // 200)  # ~200 words per minute
            
            return content
            
        except Exception as e:
            return {
                'url': url,
                'error': str(e),
                'timestamp': time.time()
            }
    
    async def research_topic(
        self, 
        topic: str, 
        mode: str = 'balanced',
        custom_selectors: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Conduct comprehensive research on a topic"""
        
        if mode not in self.research_modes:
            raise ValueError(f"Invalid research mode: {mode}. Available: {list(self.research_modes.keys())}")
        
        config = self.research_modes[mode]
        
        print(f"Starting {mode} research on: {topic}")
        
        # Search for sources
        search_results = await self.search_google(topic, config['max_sources'])
        
        if not search_results:
            return {
                'topic': topic,
                'mode': mode,
                'error': 'No search results found',
                'sources': []
            }
        
        # Extract content from each source
        sources = []
        for i, result in enumerate(search_results):
            print(f"Processing source {i+1}/{len(search_results)}: {result['title']}")
            
            try:
                # Set timeout for this source
                self.page.set_default_timeout(config['timeout_per_source'])
                
                content = await self.extract_page_content(result['url'], custom_selectors)
                content.update({
                    'search_position': result['position'],
                    'search_title': result['title']
                })
                
                sources.append(content)
                
                # Take screenshot if enabled
                if config['screenshot']:
                    screenshot_path = f"screenshots/{topic.replace(' ', '_')}_{i+1}.png"
                    Path("screenshots").mkdir(exist_ok=True)
                    await self.page.screenshot(path=screenshot_path)
                    content['screenshot'] = screenshot_path
                
                # Brief delay between requests
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"Error processing {result['url']}: {e}", file=sys.stderr)
                sources.append({
                    'url': result['url'],
                    'search_position': result['position'],
                    'search_title': result['title'],
                    'error': str(e)
                })
        
        # Compile research summary
        research_summary = {
            'topic': topic,
            'mode': mode,
            'config': config,
            'timestamp': time.time(),
            'sources_found': len(search_results),
            'sources_processed': len([s for s in sources if 'error' not in s]),
            'sources': sources,
            'summary': self._generate_summary(sources)
        }
        
        return research_summary
    
    def _generate_summary(self, sources: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a summary of the research findings"""
        successful_sources = [s for s in sources if 'error' not in s and s.get('content')]
        
        if not successful_sources:
            return {'error': 'No successful content extraction'}
        
        # Calculate statistics
        total_words = sum(s.get('word_count', 0) for s in successful_sources)
        total_reading_time = sum(s.get('estimated_reading_time', 0) for s in successful_sources)
        
        # Extract all headings
        all_headings = []
        for source in successful_sources:
            if source.get('headings'):
                all_headings.extend([h['text'] for h in source['headings']])
        
        # Extract key topics (simplified - could use NLP for better results)
        key_topics = list(set([
            heading for heading in all_headings 
            if len(heading.split()) <= 5 and len(heading) > 10
        ]))[:10]
        
        return {
            'total_sources': len(successful_sources),
            'total_words': total_words,
            'total_reading_time_minutes': total_reading_time,
            'key_topics': key_topics,
            'average_content_length': total_words // len(successful_sources) if successful_sources else 0
        }


async def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Automate deep research workflows')
    parser.add_argument('topic', help='Research topic or query')
    parser.add_argument(
        '--mode', 
        choices=['fast', 'balanced', 'comprehensive'], 
        default='balanced',
        help='Research mode (default: balanced)'
    )
    parser.add_argument(
        '--output', 
        help='Output JSON file path (default: stdout)'
    )
    parser.add_argument(
        '--headless', 
        action='store_true', 
        default=True,
        help='Run browser in headless mode (default: True)'
    )
    parser.add_argument(
        '--timeout', 
        type=int, 
        default=30000,
        help='Default timeout in milliseconds (default: 30000)'
    )
    parser.add_argument(
        '--selectors', 
        help='JSON file with custom CSS selectors'
    )
    
    args = parser.parse_args()
    
    # Load custom selectors if provided
    custom_selectors = None
    if args.selectors:
        try:
            with open(args.selectors, 'r') as f:
                custom_selectors = json.load(f)
        except Exception as e:
            print(f"Error loading selectors file: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Initialize automator
    automator = DeepResearchAutomator(headless=args.headless, timeout=args.timeout)
    
    try:
        await automator.initialize()
        
        # Conduct research
        results = await automator.research_topic(args.topic, args.mode, custom_selectors)
        
        # Output results
        output_data = json.dumps(results, indent=2, ensure_ascii=False, default=str)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output_data)
            print(f"Research results saved to: {args.output}")
        else:
            print(output_data)
            
    except Exception as e:
        print(f"Error during research: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        await automator.cleanup()


if __name__ == '__main__':
    asyncio.run(main())