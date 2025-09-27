#!/usr/bin/env python3
"""
YouTube Transcript Extraction Script
Extracts transcripts from YouTube videos with support for multiple languages
"""

import re
import sys
import json
import argparse
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse, parse_qs
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter, JSONFormatter


class YouTubeTranscriptExtractor:
    """Extract transcripts from YouTube videos"""
    
    def __init__(self):
        self.text_formatter = TextFormatter()
        self.json_formatter = JSONFormatter()
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """Extract video ID from YouTube URL"""
        # Handle various YouTube URL formats
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)',
            r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        # If it's already just a video ID
        if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
            return url
            
        return None
    
    def get_available_languages(self, video_id: str) -> List[Dict[str, str]]:
        """Get list of available transcript languages for a video"""
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            languages = []
            
            for transcript in transcript_list:
                languages.append({
                    'language': transcript.language,
                    'language_code': transcript.language_code,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })
            
            return languages
        except Exception as e:
            print(f"Error getting available languages: {e}", file=sys.stderr)
            return []
    
    def extract_transcript(
        self, 
        video_id: str, 
        language_codes: Optional[List[str]] = None,
        format_type: str = 'text'
    ) -> Dict[str, Any]:
        """
        Extract transcript from YouTube video
        
        Args:
            video_id: YouTube video ID
            language_codes: List of preferred language codes (e.g., ['en', 'es'])
            format_type: 'text' or 'json'
        
        Returns:
            Dictionary with transcript data
        """
        try:
            # Get transcript
            if language_codes:
                transcript = YouTubeTranscriptApi.get_transcript(
                    video_id, 
                    languages=language_codes
                )
            else:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Format transcript
            if format_type == 'json':
                formatted_transcript = self.json_formatter.format_transcript(transcript)
                transcript_data = json.loads(formatted_transcript)
            else:
                formatted_transcript = self.text_formatter.format_transcript(transcript)
                transcript_data = formatted_transcript
            
            # Get video info
            video_info = self._get_video_info(video_id)
            
            return {
                'success': True,
                'video_id': video_id,
                'video_info': video_info,
                'transcript': transcript_data,
                'format': format_type,
                'language_used': transcript[0].get('language_code') if transcript else None,
                'total_duration': max([entry['start'] + entry['duration'] for entry in transcript]) if transcript else 0
            }
            
        except Exception as e:
            return {
                'success': False,
                'video_id': video_id,
                'error': str(e),
                'transcript': None
            }
    
    def _get_video_info(self, video_id: str) -> Dict[str, Any]:
        """Get basic video information"""
        try:
            # This is a simplified version - in production you might want to use
            # the YouTube Data API for more comprehensive video information
            return {
                'video_id': video_id,
                'url': f'https://www.youtube.com/watch?v={video_id}',
                'title': 'Video Title (requires YouTube Data API)',
                'description': 'Video Description (requires YouTube Data API)',
                'duration': 'Unknown'
            }
        except Exception:
            return {
                'video_id': video_id,
                'url': f'https://www.youtube.com/watch?v={video_id}'
            }
    
    def extract_from_url(
        self, 
        url: str, 
        language_codes: Optional[List[str]] = None,
        format_type: str = 'text'
    ) -> Dict[str, Any]:
        """Extract transcript from YouTube URL"""
        video_id = self.extract_video_id(url)
        
        if not video_id:
            return {
                'success': False,
                'error': 'Invalid YouTube URL or video ID',
                'url': url
            }
        
        return self.extract_transcript(video_id, language_codes, format_type)


def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Extract YouTube video transcripts')
    parser.add_argument('url', help='YouTube URL or video ID')
    parser.add_argument(
        '--languages', 
        nargs='+', 
        help='Preferred language codes (e.g., en es fr)'
    )
    parser.add_argument(
        '--format', 
        choices=['text', 'json'], 
        default='text',
        help='Output format (default: text)'
    )
    parser.add_argument(
        '--output', 
        help='Output file path (default: stdout)'
    )
    parser.add_argument(
        '--list-languages', 
        action='store_true',
        help='List available languages for the video'
    )
    
    args = parser.parse_args()
    
    extractor = YouTubeTranscriptExtractor()
    
    # Extract video ID
    video_id = extractor.extract_video_id(args.url)
    if not video_id:
        print(f"Error: Invalid YouTube URL or video ID: {args.url}", file=sys.stderr)
        sys.exit(1)
    
    # List available languages if requested
    if args.list_languages:
        languages = extractor.get_available_languages(video_id)
        print("Available languages:")
        for lang in languages:
            status = "Generated" if lang['is_generated'] else "Manual"
            translatable = "Translatable" if lang['is_translatable'] else "Not translatable"
            print(f"  {lang['language_code']}: {lang['language']} ({status}, {translatable})")
        return
    
    # Extract transcript
    result = extractor.extract_from_url(args.url, args.languages, args.format)
    
    if not result['success']:
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    # Output result
    if args.format == 'json':
        output_data = json.dumps(result, indent=2, ensure_ascii=False)
    else:
        output_data = result['transcript']
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_data)
        print(f"Transcript saved to: {args.output}")
    else:
        print(output_data)


if __name__ == '__main__':
    main()