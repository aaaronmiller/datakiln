from playwright.async_api import async_playwright, Browser, Page, TimeoutError
from typing import Optional, Dict, Any
import asyncio
import logging

logger = logging.getLogger(__name__)

class PlaywrightAutomation:
    """
    A class to handle browser automation using Playwright for the Deep Research workflow.
    """

    def __init__(self):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.is_authenticated = False

    async def launch_browser(self):
        """
        Launches a Playwright-controlled browser instance with appropriate settings.
        """
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=False,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        )
        self.page = await self.browser.new_page()

        # Set up page event listeners
        self.page.on("load", self._on_page_load)

    async def close_browser(self):
        """
        Closes the browser instance and cleans up resources.
        """
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None
            self.is_authenticated = False

    def _on_page_load(self):
        """
        Event handler for page load events.
        """
        logger.info(f"Page loaded: {self.page.url if self.page else 'Unknown'}")

    async def navigate_to_gemini_canvas(self):
        """
        Navigates to the Gemini Canvas page and waits for it to load.
        """
        if not self.page:
            raise RuntimeError("Browser not initialized")

        try:
            await self.page.goto("https://gemini.google.com/app", wait_until="networkidle")
            await self.page.wait_for_load_state("domcontentloaded")

            # Wait for the main interface to be ready
            await self._wait_for_gemini_interface()

        except TimeoutError:
            logger.error("Timeout navigating to Gemini Canvas")
            raise

    async def _wait_for_gemini_interface(self):
        """
        Waits for the Gemini interface elements to be available.
        """
        if not self.page:
            return

        # Wait for common Gemini interface elements
        selectors_to_wait = [
            "[data-testid='prompt-textarea']",
            ".prompt-input",
            "[role='textbox']",
            ".gemini-chat-input"
        ]

        for selector in selectors_to_wait:
            try:
                await self.page.wait_for_selector(selector, timeout=5000)
                logger.info(f"Found Gemini interface element: {selector}")
                return
            except TimeoutError:
                continue

        logger.warning("Could not find expected Gemini interface elements")

    async def perform_deep_research(self, query: str, mode: str = "comprehensive") -> Dict[str, Any]:
        """
        Performs a deep research task on Gemini.

        Args:
            query: The research query.
            mode: The research mode (e.g., 'comprehensive', 'focused').

        Returns:
            A dictionary containing the research results.
        """
        if not self.page:
            raise RuntimeError("Browser not initialized")

        try:
            # Ensure we're on the correct page
            if "gemini.google.com" not in self.page.url:
                await self.navigate_to_gemini_canvas()

            # Input the research query
            await self._input_research_query(query, mode)

            # Trigger the research task
            await self._trigger_research_task()

            # Wait for and extract results
            results = await self._extract_research_results()

            return {
                "query": query,
                "mode": mode,
                "results": results,
                "status": "success",
                "timestamp": asyncio.get_event_loop().time()
            }

        except Exception as e:
            logger.error(f"Error performing deep research: {str(e)}")
            return {
                "query": query,
                "mode": mode,
                "error": str(e),
                "status": "failed",
                "timestamp": asyncio.get_event_loop().time()
            }

    async def _input_research_query(self, query: str, mode: str):
        """
        Inputs the research query into Gemini's interface.
        """
        if not self.page:
            return

        # Try different selectors for the input field
        input_selectors = [
            "[data-testid='prompt-textarea']",
            ".prompt-input textarea",
            "[role='textbox']",
            ".gemini-chat-input textarea",
            "textarea[placeholder*='Ask']"
        ]

        input_field = None
        for selector in input_selectors:
            try:
                input_field = await self.page.wait_for_selector(selector, timeout=3000)
                break
            except TimeoutError:
                continue

        if not input_field:
            raise RuntimeError("Could not find input field for research query")

        # Clear existing content and input the query
        await input_field.clear()
        await input_field.fill(query)

        # Add mode-specific instructions
        if mode == "comprehensive":
            mode_instruction = "\n\nPlease provide a comprehensive analysis with multiple sources and detailed explanations."
        elif mode == "focused":
            mode_instruction = "\n\nPlease provide a focused analysis with key findings and main sources."
        else:
            mode_instruction = f"\n\nPlease perform research in {mode} mode."

        await input_field.fill(query + mode_instruction)

    async def _trigger_research_task(self):
        """
        Triggers the research task by clicking the appropriate button.
        """
        if not self.page:
            return

        # Try different selectors for the submit button
        submit_selectors = [
            "[data-testid='send-button']",
            "button[type='submit']",
            ".send-button",
            "[aria-label*='Send']",
            "button:has-text('Send')"
        ]

        submit_button = None
        for selector in submit_selectors:
            try:
                submit_button = await self.page.wait_for_selector(selector, timeout=3000)
                break
            except TimeoutError:
                continue

        if not submit_button:
            # Try pressing Enter in the input field as an alternative
            await self.page.keyboard.press("Enter")
            return

        await submit_button.click()

    async def _extract_research_results(self) -> Dict[str, Any]:
        """
        Extracts research results from the Gemini interface.
        """
        if not self.page:
            return {"error": "Page not available"}

        try:
            # Wait for response to appear
            await self.page.wait_for_selector(".response-content, .gemini-response, [data-testid='response']", timeout=30000)

            # Extract the main response content
            response_selectors = [
                ".response-content",
                ".gemini-response",
                "[data-testid='response']",
                ".message-content"
            ]

            response_text = ""
            for selector in response_selectors:
                try:
                    element = await self.page.wait_for_selector(selector, timeout=5000)
                    response_text = await element.inner_text()
                    if response_text.strip():
                        break
                except TimeoutError:
                    continue

            # Extract sources if available
            sources = await self._extract_sources()

            return {
                "summary": response_text.strip() if response_text else "No response text found",
                "sources": sources,
                "raw_response": response_text
            }

        except TimeoutError:
            return {"error": "Timeout waiting for research results"}
        except Exception as e:
            return {"error": f"Error extracting results: {str(e)}"}

    async def _extract_sources(self) -> list:
        """
        Extracts source links and information from the response.
        """
        if not self.page:
            return []

        sources = []
        try:
            # Look for links in the response
            links = await self.page.query_selector_all("a[href]")

            for link in links:
                href = await link.get_attribute("href")
                text = await link.inner_text()

                if href and text.strip():
                    sources.append({
                        "title": text.strip(),
                        "url": href
                    })

        except Exception as e:
            logger.warning(f"Error extracting sources: {str(e)}")

        return sources

    async def navigate_to_youtube_video(self, url: str):
        """
        Navigates to a YouTube video page and waits for it to load.

        Args:
            url: The YouTube video URL.
        """
        if not self.page:
            raise RuntimeError("Browser not initialized")

        try:
            await self.page.goto(url, wait_until="networkidle")
            await self.page.wait_for_load_state("domcontentloaded")

            # Wait for video player to be ready
            await self.page.wait_for_selector("video", timeout=10000)
            logger.info(f"Navigated to YouTube video: {url}")

        except TimeoutError:
            logger.error(f"Timeout navigating to YouTube video: {url}")
            raise
        except Exception as e:
            logger.error(f"Error navigating to YouTube video: {str(e)}")
            raise

    async def extract_transcript(self) -> str:
        """
        Extracts the transcript from a YouTube video using the built-in transcript feature.

        Returns:
            The extracted transcript text.
        """
        if not self.page:
            raise RuntimeError("Browser not initialized")

        try:
            # Click the CC (closed captions) button
            cc_button_selectors = [
                ".ytp-subtitles-button",
                "[aria-label*='subtitles']",
                ".ytp-button[data-tooltip-target-id='ytp-subtitles-button']"
            ]

            cc_button = None
            for selector in cc_button_selectors:
                try:
                    cc_button = await self.page.wait_for_selector(selector, timeout=5000)
                    if cc_button:
                        break
                except TimeoutError:
                    continue

            if not cc_button:
                raise RuntimeError("Could not find subtitles button")

            await cc_button.click()

            # Wait for transcript option and click it
            transcript_selectors = [
                "[role='menuitem']:has-text('Show transcript')",
                ".ytp-menuitem:has-text('Show transcript')",
                "[aria-label*='transcript']"
            ]

            transcript_option = None
            for selector in transcript_selectors:
                try:
                    transcript_option = await self.page.wait_for_selector(selector, timeout=5000)
                    if transcript_option:
                        break
                except TimeoutError:
                    continue

            if transcript_option:
                await transcript_option.click()

            # Wait for transcript panel to appear
            await self.page.wait_for_selector(".ytd-transcript-renderer, .transcript-content", timeout=10000)

            # Extract transcript text
            transcript_selectors = [
                ".ytd-transcript-renderer",
                ".transcript-content",
                ".transcript-body"
            ]

            transcript_text = ""
            for selector in transcript_selectors:
                try:
                    transcript_element = await self.page.wait_for_selector(selector, timeout=5000)
                    transcript_text = await transcript_element.inner_text()
                    if transcript_text.strip():
                        break
                except TimeoutError:
                    continue

            if not transcript_text.strip():
                raise RuntimeError("Could not extract transcript text")

            return transcript_text.strip()

        except Exception as e:
            logger.error(f"Error extracting transcript: {str(e)}")
            raise

    async def perform_youtube_transcript_analysis(self, url: str) -> Dict[str, Any]:
        """
        Performs complete YouTube transcript analysis workflow.

        Args:
            url: The YouTube video URL.

        Returns:
            Dictionary containing the analysis results.
        """
        try:
            # Navigate to the video
            await self.navigate_to_youtube_video(url)

            # Extract transcript
            transcript = await self.extract_transcript()

            # Process and analyze
            analysis = self._process_transcript_text(transcript)

            return {
                "url": url,
                "transcript": transcript,
                "analysis": analysis,
                "status": "success",
                "timestamp": asyncio.get_event_loop().time()
            }

        except Exception as e:
            logger.error(f"Error performing YouTube transcript analysis: {str(e)}")
            return {
                "url": url,
                "error": str(e),
                "status": "failed",
                "timestamp": asyncio.get_event_loop().time()
            }

    def _process_transcript_text(self, transcript: str) -> Dict[str, Any]:
        """
        Processes and analyzes the transcript text.

        Args:
            transcript: The raw transcript text.

        Returns:
            Dictionary containing processed transcript data and analysis.
        """
        # Clean the transcript
        cleaned_transcript = self._clean_transcript(transcript)

        # Basic analysis
        word_count = len(cleaned_transcript.split())
        sentences = cleaned_transcript.split('.')
        sentence_count = len([s for s in sentences if s.strip()])

        # Extract timestamps if available
        timestamps = self._extract_timestamps(transcript)

        # Basic topic analysis
        topics = self._extract_topics(cleaned_transcript)

        return {
            "cleaned_transcript": cleaned_transcript,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "timestamps": timestamps,
            "key_topics": topics,
            "summary": self._generate_summary(cleaned_transcript)
        }

    def _clean_transcript(self, transcript: str) -> str:
        """
        Cleans the transcript text by removing timestamps and formatting.
        """
        import re

        # Remove timestamp patterns like [0:00] or 0:00
        cleaned = re.sub(r'\[\d+:\d+(?::\d+)?\]', '', transcript)
        cleaned = re.sub(r'\d+:\d+(?::\d+)?', '', cleaned)

        # Remove extra whitespace
        cleaned = ' '.join(cleaned.split())

        return cleaned.strip()

    def _extract_timestamps(self, transcript: str) -> list:
        """
        Extracts timestamps from the transcript.
        """
        import re

        timestamps = []
        # Match patterns like [0:00] text or 0:00 text
        timestamp_pattern = r'(?:\[)?(\d+):(\d+)(?::(\d+))?(?:\])?\s*(.*?)(?=(?:\[\d+:\d+(?::\d+)?\]|$|\d+:\d+(?::\d+)?))'

        matches = re.findall(timestamp_pattern, transcript, re.DOTALL)

        for match in matches:
            minutes = int(match[0])
            seconds = int(match[1])
            hours = int(match[2]) if match[2] else 0
            text = match[3].strip()

            total_seconds = hours * 3600 + minutes * 60 + seconds

            timestamps.append({
                "time": f"{hours:02d}:{minutes:02d}:{seconds:02d}",
                "seconds": total_seconds,
                "text": text
            })

        return timestamps

    def _extract_topics(self, transcript: str) -> list:
        """
        Extracts key topics from the transcript using simple keyword analysis.
        """
        import re
        from collections import Counter

        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}

        # Extract words
        words = re.findall(r'\b\w+\b', transcript.lower())
        words = [word for word in words if word not in stop_words and len(word) > 3]

        # Count frequency
        word_counts = Counter(words)

        # Get top 10 most common words as topics
        topics = [word for word, count in word_counts.most_common(10)]

        return topics

    def _generate_summary(self, transcript: str) -> str:
        """
        Generates a simple summary of the transcript.
        """
        sentences = transcript.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) <= 3:
            return transcript

        # Simple extractive summary: take first, middle, and last sentences
        summary_sentences = []
        if sentences:
            summary_sentences.append(sentences[0])
        if len(sentences) > 2:
            summary_sentences.append(sentences[len(sentences) // 2])
        if len(sentences) > 1:
            summary_sentences.append(sentences[-1])

        return '. '.join(summary_sentences) + '.'

async def get_playwright_automation() -> PlaywrightAutomation:
    """
    Dependency injection provider for PlaywrightAutomation.
    """
    return PlaywrightAutomation()