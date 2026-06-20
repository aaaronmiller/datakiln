"""
Tests for the current backend YouTube transcript helper script.
"""

from types import SimpleNamespace

import pytest

from scripts import youtube_transcript


def test_extract_video_id_various_formats():
    test_cases = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/watch?t=30&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ]

    for url, expected_id in test_cases:
        assert youtube_transcript.extract_video_id(url) == expected_id


def test_extract_video_id_rejects_invalid_urls():
    assert youtube_transcript.extract_video_id("https://example.com/not-youtube") is None
    assert youtube_transcript.extract_video_id("too-short") is None


def test_extract_transcript_requires_dependency(monkeypatch):
    monkeypatch.setattr(youtube_transcript, "YouTubeTranscriptApi", None)

    with pytest.raises(ImportError, match="youtube_transcript_api is required"):
        youtube_transcript.extract_transcript("dQw4w9WgXcQ")


def test_extract_transcript_builds_metadata_and_segments(monkeypatch):
    entries = [
        SimpleNamespace(text="Hello world", start=0.0, duration=2.5),
        SimpleNamespace(text="This is a test", start=2.5, duration=3.0),
    ]

    class FakeYouTubeTranscriptApi:
        def fetch(self, video_id, languages):
            assert video_id == "dQw4w9WgXcQ"
            assert languages == ["en"]
            return entries

    monkeypatch.setattr(youtube_transcript, "YouTubeTranscriptApi", FakeYouTubeTranscriptApi)

    result = youtube_transcript.extract_transcript("dQw4w9WgXcQ")

    assert result["metadata"]["video_id"] == "dQw4w9WgXcQ"
    assert result["metadata"]["word_count"] == 6
    assert result["metadata"]["segment_count"] == 2
    assert result["transcript"] == "Hello world This is a test"
    assert result["segments"] == [
        {"start": 0.0, "duration": 2.5, "text": "Hello world"},
        {"start": 2.5, "duration": 3.0, "text": "This is a test"},
    ]
