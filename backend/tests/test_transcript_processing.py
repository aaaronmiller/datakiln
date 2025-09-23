"""
Test Transcript Processing

Tests for handling different YouTube transcript formats.
"""

import pytest
from unittest.mock import patch, MagicMock
from scripts.youtube_transcript import YouTubeTranscriptDownloader


class TestTranscriptProcessing:
    """Test cases for YouTube transcript processing"""

    def setup_method(self):
        """Set up test fixtures"""
        self.downloader = YouTubeTranscriptDownloader()

    def test_extract_video_id_various_formats(self):
        """Test video ID extraction from different YouTube URL formats"""
        test_cases = [
            ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://www.youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30", "dQw4w9WgXcQ"),
        ]

        for url, expected_id in test_cases:
            video_id = self.downloader.extract_video_id(url)
            assert video_id == expected_id, f"Failed to extract ID from {url}"

    def test_parse_xml_transcript(self):
        """Test parsing XML format transcripts"""
        xml_content = """<?xml version="1.0" encoding="utf-8"?>
<transcript>
<text start="0.0" dur="2.5">Hello world</text>
<text start="2.5" dur="3.0">This is a test</text>
<text start="5.5" dur="2.0">Of XML parsing</text>
</transcript>"""

        result = self.downloader.parse_xml_transcript(xml_content, "test_video")

        assert result["video_id"] == "test_video"
        assert result["format"] == "xml"
        assert "Hello world" in result["transcript"]
        assert "This is a test" in result["transcript"]
        assert result["word_count"] > 0
        assert len(result["blocks"]) > 0

    def test_parse_vtt_transcript(self):
        """Test parsing WebVTT format transcripts"""
        vtt_content = """WEBVTT

1
00:00:00.000 --> 00:00:02.500
Hello world

2
00:00:02.500 --> 00:00:05.500
This is a test of VTT parsing

3
00:00:05.500 --> 00:00:07.500
With multiple lines
"""

        result = self.downloader.parse_format_transcript(vtt_content, "vtt", "test_video")

        assert result["video_id"] == "test_video"
        assert result["format"] == "vtt"
        assert "Hello world" in result["transcript"]
        assert "VTT parsing" in result["transcript"]
        assert result["word_count"] > 0
        assert len(result["blocks"]) > 0

    def test_parse_srt_transcript(self):
        """Test parsing SRT format transcripts"""
        srt_content = """1
00:00:00,000 --> 00:00:02,500
Hello world

2
00:00:02,500 --> 00:00:05,500
This is a test
of SRT parsing

3
00:00:05,500 --> 00:00:07,500
With multiple lines
"""

        result = self.downloader.parse_format_transcript(srt_content, "srt", "test_video")

        assert result["video_id"] == "test_video"
        assert result["format"] == "srt"
        assert "Hello world" in result["transcript"]
        assert "SRT parsing" in result["transcript"]
        assert result["word_count"] > 0
        assert len(result["blocks"]) > 0

    def test_parse_ttml_transcript(self):
        """Test parsing TTML format transcripts"""
        ttml_content = """<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml">
  <body>
    <div>
      <p begin="00:00:00.000" end="00:00:02.500">Hello world</p>
      <p begin="00:00:02.500" end="00:00:05.500">This is TTML</p>
      <p begin="00:00:05.500" end="00:00:07.500">Format parsing</p>
    </div>
  </body>
</tt>"""

        result = self.downloader.parse_format_transcript(ttml_content, "ttml", "test_video")

        assert result["video_id"] == "test_video"
        assert result["format"] == "ttml"
        assert "Hello world" in result["transcript"]
        assert "TTML" in result["transcript"]
        assert result["word_count"] > 0
        assert len(result["blocks"]) > 0

    def test_parse_generic_transcript(self):
        """Test parsing unknown transcript formats"""
        generic_content = "Hello world. This is a test. Of generic parsing."

        result = self.downloader.parse_format_transcript(generic_content, "unknown", "test_video")

        assert result["video_id"] == "test_video"
        assert result["format"] == "generic_unknown"
        assert "Hello world" in result["transcript"]
        assert "generic parsing" in result["transcript"]
        assert result["word_count"] > 0
        assert len(result["blocks"]) > 0

    @patch('requests.Session.get')
    def test_get_transcript_multiple_formats(self, mock_get):
        """Test transcript retrieval trying multiple formats"""
        # Mock responses for different formats
        mock_responses = [
            MagicMock(status_code=404),  # XML fails
            MagicMock(status_code=404),  # en-US fails
            MagicMock(status_code=200, text="VTT content here"),  # VTT succeeds
        ]
        mock_get.side_effect = mock_responses

        result = self.downloader.get_transcript("test_video_id")

        assert result is not None
        assert result["format"] == "vtt"
        assert result["video_id"] == "test_video_id"

    @patch('requests.Session.get')
    def test_get_transcript_from_page(self, mock_get):
        """Test transcript extraction from YouTube page"""
        # Mock page response with embedded transcript
        page_content = '''
        <html>
        <script>
        var ytInitialData = {
            "captions": {
                "playerCaptionsTracklistRenderer": {
                    "captionTracks": [],
                    "translationLanguages": []
                }
            }
        };
        </script>
        <script>
        "transcript":"Hello world transcript"
        </script>
        </html>
        '''

        mock_response = MagicMock(status_code=200, text=page_content)
        mock_get.return_value = mock_response

        result = self.downloader.get_transcript_from_page("test_video_id")

        assert result is not None
        assert result["format"] == "page"
        assert "Hello world transcript" in result["transcript"]

    def test_analyze_transcript(self):
        """Test transcript analysis functionality"""
        transcript_data = {
            "video_id": "test_video",
            "transcript": "This is a test transcript. It contains multiple sentences. The analysis should work correctly.",
            "blocks": ["This is a test transcript.", "It contains multiple sentences.", "The analysis should work correctly."],
            "word_count": 15,
            "format": "xml"
        }

        analysis = self.downloader.analyze_transcript(transcript_data)

        assert "statistics" in analysis
        assert "summary" in analysis
        assert analysis["statistics"]["total_words"] > 0
        assert analysis["statistics"]["total_sentences"] > 0
        assert len(analysis["statistics"]["top_keywords"]) > 0
        assert "length_category" in analysis["summary"]
        assert "estimated_reading_time_minutes" in analysis["summary"]

    def test_save_transcript(self, tmp_path):
        """Test saving transcript to file"""
        transcript_data = {
            "video_id": "test_video",
            "transcript": "Test transcript content",
            "blocks": ["Test transcript content"],
            "word_count": 3,
            "format": "xml"
        }

        # Use temporary directory
        self.downloader.output_dir = tmp_path
        saved_path = self.downloader.save_transcript(transcript_data, "test_output.json")

        assert "test_output.json" in saved_path
        assert tmp_path in saved_path

        # Verify file contents
        import json
        with open(saved_path, 'r') as f:
            saved_data = json.load(f)

        assert saved_data["metadata"]["video_id"] == "test_video"
        assert saved_data["transcript"] == "Test transcript content"
        assert len(saved_data["blocks"]) == 1

    def test_process_video_end_to_end(self):
        """Test complete video processing workflow"""
        with patch.object(self.downloader, 'get_transcript') as mock_get_transcript, \
             patch.object(self.downloader, 'save_transcript') as mock_save, \
             patch.object(self.downloader, 'analyze_transcript') as mock_analyze:

            # Mock successful transcript retrieval
            mock_get_transcript.return_value = {
                "video_id": "test_video",
                "transcript": "Test transcript",
                "blocks": ["Test transcript"],
                "word_count": 2,
                "format": "xml"
            }
            mock_save.return_value = "/path/to/saved/file.json"
            mock_analyze.return_value = {"statistics": {}, "summary": {}}

            result = self.downloader.process_video("https://youtube.com/watch?v=test_video")

            assert result == "/path/to/saved/file.json"
            mock_get_transcript.assert_called_once_with("test_video")
            mock_save.assert_called_once()
            mock_analyze.assert_called_once()

    def test_error_handling_invalid_video_id(self):
        """Test error handling for invalid video URLs"""
        result = self.downloader.process_video("https://example.com/not-youtube")

        assert result is None

    @patch('requests.Session.get')
    def test_network_error_handling(self, mock_get):
        """Test handling of network errors during transcript retrieval"""
        mock_get.side_effect = Exception("Network error")

        result = self.downloader.get_transcript("test_video_id")

        assert result is None

    def test_multiple_language_support(self):
        """Test support for multiple languages in transcript retrieval"""
        video_id = "test_video"

        with patch('requests.Session.get') as mock_get:
            # Mock failure for English, success for Spanish
            mock_responses = [
                MagicMock(status_code=404),  # English fails
                MagicMock(status_code=200, text="<text>Spanish transcript</text>"),  # Spanish succeeds
            ]
            mock_get.side_effect = mock_responses

            result = self.downloader.get_transcript(video_id)

            assert result is not None
            assert "Spanish transcript" in result["transcript"]
            assert result["format"] == "xml"

    def test_alternative_sources_fallback(self):
        """Test fallback to alternative transcript sources"""
        video_id = "test_video"

        with patch('requests.Session.get') as mock_get:
            # Mock all primary methods failing, alternative succeeding
            mock_responses = [
                MagicMock(status_code=404),  # Primary XML fails
                MagicMock(status_code=404),  # en-US fails
                MagicMock(status_code=404),  # VTT fails
                MagicMock(status_code=404),  # Page extraction fails
                MagicMock(status_code=200, text="<text>Alternative source transcript</text>"),  # Alternative succeeds
            ]
            mock_get.side_effect = mock_responses

            result = self.downloader.get_transcript(video_id)

            assert result is not None
            assert "Alternative source transcript" in result["transcript"]