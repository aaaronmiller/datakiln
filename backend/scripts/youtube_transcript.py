#!/usr/bin/env python3
"""
YouTube Transcript Extraction Script (Backend)
Extracts transcripts from YouTube videos and outputs JSON with metadata for the API endpoint.
"""

import sys
import json
import os
import uuid
import tempfile
import re
from datetime import datetime
from typing import Optional

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None


def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return url
    return None


def extract_transcript(video_id: str) -> dict:
    """Extract transcript text from a YouTube video."""
    if YouTubeTranscriptApi is None:
        raise ImportError("youtube_transcript_api is required")

    api = YouTubeTranscriptApi()
    transcript_list = api.fetch(video_id, languages=['en'])

    # Build full transcript text
    text_parts = []
    for entry in transcript_list:
        text_parts.append(entry.text)

    full_text = ' '.join(text_parts)
    word_count = len(full_text.split())

    # Also create timestamped segments for detailed analysis
    segments = []
    for entry in transcript_list:
        segments.append({
            'start': entry.start,
            'duration': entry.duration if hasattr(entry, 'duration') else 0,
            'text': entry.text
        })

    return {
        'metadata': {
            'video_id': video_id,
            'word_count': word_count,
            'segment_count': len(segments),
            'extracted_at': datetime.now().isoformat(),
        },
        'transcript': full_text,
        'segments': segments
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 youtube_transcript.py <youtube_url>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    video_id = extract_video_id(url)

    if not video_id:
        print(f"Error: Invalid YouTube URL: {url}", file=sys.stderr)
        sys.exit(1)

    try:
        result = extract_transcript(video_id)

        # Save transcript to a temp file
        out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'transcripts')
        os.makedirs(out_dir, exist_ok=True)

        filepath = os.path.join(out_dir, f"transcript_{video_id}_{uuid.uuid4().hex[:8]}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        # Print the filepath for the API endpoint to parse
        print(f"Transcript saved to: {filepath}")

        # Also output basic stats for the caller
        print(f"Video ID: {video_id}")
        print(f"Words: {result['metadata']['word_count']}")

    except ImportError as e:
        print(f"Error: {e}. Install with: pip install youtube-transcript-api", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error extracting transcript: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
