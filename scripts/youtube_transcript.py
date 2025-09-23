#!/usr/bin/env python3
"""
YouTube Transcript Downloader and Analyzer
Downloads and processes YouTube video transcripts for analysis.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse, parse_qs
import requests
import re
from pathlib import Path

class YouTubeTranscriptDownloader:
    """Downloads and processes YouTube video transcripts."""

    def __init__(self, output_dir: str = "downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from various YouTube URL formats."""
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        # Try parsing as URL
        try:
            parsed = urlparse(url)
            if parsed.hostname in ['youtube.com', 'www.youtube.com']:
                return parse_qs(parsed.query).get('v', [None])[0]
            elif parsed.hostname == 'youtu.be':
                return parsed.path.lstrip('/')
        except:
            pass

        return None

    def get_transcript(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Download transcript for a YouTube video with support for multiple formats."""
        try:
            # Try multiple transcript sources and formats
            url = f"https://www.youtube.com/watch?v={video_id}"

            # Method 1: Try to get transcript from YouTube's API-like endpoint
            transcript_url = f"https://www.youtube.com/api/timedtext?lang=en&v={video_id}"
            response = self.session.get(transcript_url)

            if response.status_code == 200 and len(response.text.strip()) > 0:
                return self.parse_xml_transcript(response.text, video_id)

            # Method 2: Try alternative languages
            for lang in ['en-US', 'en-GB', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko']:
                transcript_url = f"https://www.youtube.com/api/timedtext?lang={lang}&v={video_id}"
                response = self.session.get(transcript_url)

                if response.status_code == 200 and len(response.text.strip()) > 0:
                    return self.parse_xml_transcript(response.text, video_id)

            # Method 3: Try different transcript formats (subtitles, captions)
            for fmt in ['vtt', 'srt', 'ttml']:
                transcript_url = f"https://www.youtube.com/api/timedtext?lang=en&fmt={fmt}&v={video_id}"
                response = self.session.get(transcript_url)

                if response.status_code == 200 and len(response.text.strip()) > 0:
                    return self.parse_format_transcript(response.text, fmt, video_id)

            # Method 4: Try to extract from video page (JSON embedded)
            page_transcript = self.get_transcript_from_page(video_id)
            if page_transcript:
                return page_transcript

            # Method 5: Try alternative endpoints
            alt_transcript = self.get_transcript_from_alternative_sources(video_id)
            if alt_transcript:
                return alt_transcript

        except Exception as e:
            print(f"Error getting transcript for {video_id}: {e}")
            return None

    def parse_xml_transcript(self, xml_content: str, video_id: str) -> Dict[str, Any]:
        """Parse XML transcript format."""
        try:
            # Basic XML parsing for transcript
            text_blocks = []
            lines = xml_content.split('\n')

            current_text = ""
            for line in lines:
                line = line.strip()
                if line.startswith('<text') or line.startswith('<s'):
                    # Extract text content
                    text_match = re.search(r'>([^<]+)<', line)
                    if text_match:
                        text = text_match.group(1)
                        if text.strip():
                            current_text += " " + text

                elif line.startswith('</text') or line.startswith('</s'):
                    if current_text.strip():
                        text_blocks.append(current_text.strip())
                        current_text = ""

            return {
                'video_id': video_id,
                'transcript': '\n'.join(text_blocks),
                'blocks': text_blocks,
                'word_count': len(' '.join(text_blocks).split()),
                'format': 'xml'
            }

        except Exception as e:
            print(f"Error parsing XML transcript: {e}")
            return {
                'video_id': video_id,
                'transcript': xml_content,
                'blocks': [xml_content],
                'word_count': len(xml_content.split()),
                'format': 'raw'
            }

    def parse_format_transcript(self, content: str, fmt: str, video_id: str) -> Dict[str, Any]:
        """Parse different transcript formats (VTT, SRT, TTML)."""
        try:
            if fmt == 'vtt':
                return self.parse_vtt_transcript(content, video_id)
            elif fmt == 'srt':
                return self.parse_srt_transcript(content, video_id)
            elif fmt == 'ttml':
                return self.parse_ttml_transcript(content, video_id)
            else:
                # Fallback to generic parsing
                return self.parse_generic_transcript(content, video_id, fmt)

        except Exception as e:
            print(f"Error parsing {fmt} transcript: {e}")
            return {
                'video_id': video_id,
                'transcript': content,
                'blocks': [content],
                'word_count': len(content.split()),
                'format': f'raw_{fmt}'
            }

    def parse_vtt_transcript(self, content: str, video_id: str) -> Dict[str, Any]:
        """Parse WebVTT format transcript."""
        lines = content.split('\n')
        text_blocks = []

        for line in lines:
            line = line.strip()
            # Skip VTT headers and timestamps
            if line and not line.startswith('WEBVTT') and not line.startswith('NOTE') and not '-->' in line and not line.isdigit():
                if line:
                    text_blocks.append(line)

        transcript = ' '.join(text_blocks)
        return {
            'video_id': video_id,
            'transcript': transcript,
            'blocks': text_blocks,
            'word_count': len(transcript.split()),
            'format': 'vtt'
        }

    def parse_srt_transcript(self, content: str, video_id: str) -> Dict[str, Any]:
        """Parse SRT format transcript."""
        # SRT format: number, timestamp, text, blank line
        blocks = content.split('\n\n')
        text_blocks = []

        for block in blocks:
            lines = block.strip().split('\n')
            if len(lines) >= 3:
                # Skip the number and timestamp lines
                text = ' '.join(lines[2:])
                if text.strip():
                    text_blocks.append(text.strip())

        transcript = ' '.join(text_blocks)
        return {
            'video_id': video_id,
            'transcript': transcript,
            'blocks': text_blocks,
            'word_count': len(transcript.split()),
            'format': 'srt'
        }

    def parse_ttml_transcript(self, content: str, video_id: str) -> Dict[str, Any]:
        """Parse TTML format transcript."""
        # Extract text between TTML tags
        text_matches = re.findall(r'<p[^>]*>([^<]+)</p>', content, re.IGNORECASE)
        text_blocks = [text.strip() for text in text_matches if text.strip()]

        transcript = ' '.join(text_blocks)
        return {
            'video_id': video_id,
            'transcript': transcript,
            'blocks': text_blocks,
            'word_count': len(transcript.split()),
            'format': 'ttml'
        }

    def parse_generic_transcript(self, content: str, video_id: str, fmt: str) -> Dict[str, Any]:
        """Generic transcript parsing for unknown formats."""
        # Try to extract text content using various patterns
        text_blocks = []

        # Remove HTML/XML tags
        clean_content = re.sub(r'<[^>]+>', '', content)

        # Split by common separators
        for separator in ['\n\n', '\n', '. ', '! ', '? ']:
            if separator in clean_content:
                blocks = clean_content.split(separator)
                text_blocks = [block.strip() for block in blocks if block.strip()]
                break

        if not text_blocks:
            text_blocks = [clean_content.strip()]

        transcript = ' '.join(text_blocks)
        return {
            'video_id': video_id,
            'transcript': transcript,
            'blocks': text_blocks,
            'word_count': len(transcript.split()),
            'format': f'generic_{fmt}'
        }

    def get_transcript_from_alternative_sources(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Try alternative sources for transcripts."""
        try:
            # Try different YouTube API variations
            alt_urls = [
                f"https://video.google.com/timedtext?lang=en&v={video_id}",
                f"https://www.youtube.com/api/timedtext?v={video_id}&ei=123&caps=asr&opi=112496729&xoaf=5&hl=en&ip=0.0.0.0&ipbits=0&expire=1234567890&sparams=ip%2Cipbits%2Cexpire&signature=abc&key=yt8&lang=en",
            ]

            for url in alt_urls:
                try:
                    response = self.session.get(url, timeout=10)
                    if response.status_code == 200 and len(response.text.strip()) > 0:
                        return self.parse_xml_transcript(response.text, video_id)
                except:
                    continue

            return None

        except Exception as e:
            print(f"Error trying alternative sources: {e}")
            return None

    def get_transcript_from_page(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Extract transcript data from YouTube page."""
        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            response = self.session.get(url)

            if response.status_code != 200:
                return None

            # Look for transcript data in the page
            text_matches = re.findall(r'"transcript":"([^"]+)"', response.text)
            if text_matches:
                transcript = ''.join(text_matches).replace('\\n', '\n')
                return {
                    'video_id': video_id,
                    'transcript': transcript,
                    'blocks': [block.strip() for block in transcript.split('\n') if block.strip()],
                    'word_count': len(transcript.split()),
                    'format': 'page'
                }

            return None

        except Exception as e:
            print(f"Error extracting transcript from page: {e}")
            return None

    def save_transcript(self, transcript_data: Dict[str, Any], output_file: Optional[str] = None) -> str:
        """Save transcript data to file."""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"youtube_transcript_{transcript_data['video_id']}_{timestamp}.json"

        output_path = self.output_dir / output_file

        # Create comprehensive transcript document
        document = {
            'metadata': {
                'video_id': transcript_data['video_id'],
                'download_date': datetime.now().isoformat(),
                'word_count': transcript_data['word_count'],
                'format': transcript_data['format'],
                'source': 'YouTube Transcript Downloader'
            },
            'transcript': transcript_data['transcript'],
            'blocks': transcript_data['blocks']
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        print(f"Transcript saved to: {output_path}")
        return str(output_path)

    def analyze_transcript(self, transcript_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform basic analysis on transcript."""
        text = transcript_data['transcript']

        # Basic statistics
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        # Topic extraction (simple keyword analysis)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'}
        keywords = [word.lower() for word in words if len(word) > 3 and word.lower() not in stop_words]
        keyword_freq = {}
        for keyword in keywords:
            keyword_freq[keyword] = keyword_freq.get(keyword, 0) + 1

        # Sort by frequency
        top_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            'statistics': {
                'total_words': len(words),
                'total_sentences': len(sentences),
                'average_words_per_sentence': len(words) / max(len(sentences), 1),
                'top_keywords': top_keywords
            },
            'summary': {
                'length_category': 'short' if len(words) < 1000 else 'medium' if len(words) < 5000 else 'long',
                'estimated_reading_time_minutes': len(words) / 200,  # average reading speed
                'main_topics': [kw[0] for kw in top_keywords[:5]]
            }
        }

    def process_video(self, url: str, analyze: bool = True) -> Optional[str]:
        """Process a YouTube video: download transcript and optionally analyze."""
        print(f"Processing video: {url}")

        video_id = self.extract_video_id(url)
        if not video_id:
            print("Could not extract video ID from URL")
            return None

        print(f"Video ID: {video_id}")

        # Download transcript
        transcript_data = self.get_transcript(video_id)
        if not transcript_data:
            print("Could not download transcript")
            return None

        print(f"Downloaded transcript: {transcript_data['word_count']} words")

        # Save transcript
        saved_file = self.save_transcript(transcript_data)

        # Analyze if requested
        if analyze:
            analysis = self.analyze_transcript(transcript_data)
            print("Analysis completed:")
            print(f"  Total words: {analysis['statistics']['total_words']}")
            print(f"  Total sentences: {analysis['statistics']['total_sentences']}")
            print(f"  Top keywords: {', '.join([kw[0] for kw in analysis['statistics']['top_keywords'][:5]])}")

            # Save analysis
            analysis_file = saved_file.replace('.json', '_analysis.json')
            with open(analysis_file, 'w', encoding='utf-8') as f:
                json.dump(analysis, f, indent=2, ensure_ascii=False)
            print(f"Analysis saved to: {analysis_file}")

        return saved_file

def main():
    parser = argparse.ArgumentParser(description='Download and analyze YouTube video transcripts')
    parser.add_argument('url', help='YouTube video URL')
    parser.add_argument('-o', '--output', help='Output filename')
    parser.add_argument('--no-analysis', action='store_true', help='Skip transcript analysis')
    parser.add_argument('--output-dir', default='downloads', help='Output directory')

    args = parser.parse_args()

    # Create downloader
    downloader = YouTubeTranscriptDownloader(args.output_dir)

    try:
        result = downloader.process_video(args.url, analyze=not args.no_analysis)

        if result:
            print(f"\nSuccess! Transcript saved to: {result}")
            if not args.no_analysis:
                analysis_file = result.replace('.json', '_analysis.json')
                print(f"Analysis saved to: {analysis_file}")
        else:
            print("Failed to process video")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()