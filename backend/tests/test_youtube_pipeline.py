"""
YouTube pipeline contract tests using the real captured transcript fixture.

Fixture: a real transcript captured from YouTube (Rick Astley - Never Gonna
Give You Up), retrieved from the datakiln copy fork and promoted here so
the expected output shape of the YouTube pipeline is pinned by a test.

Executor contract (dag_executor.execute_youtube_transcript):
    {"transcript": str, "segments": [{"text","start","duration"}], "metadata": {"video_id", "word_count"}}
"""

import json
from pathlib import Path

import pytest

from app.models.workflow import Edge, Node, Workflow
from dag_executor import (
    _execute_youtube_id_extract,
    _normalize_node_config,
    _normalize_node_type,
)

FIXTURE = Path(__file__).parent / "fixtures" / "dQw4w9WgXcQ_transcript.json"
VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.fixture
def transcript_fixture():
    return json.loads(FIXTURE.read_text())


class TestFixtureShape:
    """The fixture itself pins the pipeline's output contract."""

    def test_fixture_exists_with_expected_keys(self, transcript_fixture):
        assert set(transcript_fixture.keys()) >= {"metadata", "transcript", "full_text"}

    def test_segments_have_required_fields(self, transcript_fixture):
        for seg in transcript_fixture["transcript"]:
            assert set(seg.keys()) >= {"text", "start", "duration"}
            assert isinstance(seg["start"], (int, float))
            assert isinstance(seg["duration"], (int, float))

    def test_metadata_matches_video(self, transcript_fixture):
        meta = transcript_fixture["metadata"]
        assert meta["video_id"] == "dQw4w9WgXcQ"
        assert meta["word_count"] > 0
        assert len(transcript_fixture["full_text"]) > 100


class TestIdExtraction:
    """code.youtube_id_extract pulls video ids from arbitrary text/URLs."""

    def _node(self, extract_all=True):
        from app.models.workflow_schema import ExecutableNode

        return ExecutableNode(
            id="extract-1", type="code.youtube_id_extract",
            config={"extract_all": extract_all},
        )

    def test_extracts_from_bare_watch_url(self):
        result = _execute_youtube_id_extract(self._node(), {"input": VIDEO_URL}, {})
        assert result["ids"] == ["dQw4w9WgXcQ"]

    def test_extracts_from_youtu_be_short(self):
        result = _execute_youtube_id_extract(self._node(), {"input": "https://youtu.be/dQw4w9WgXcQ"}, {})
        assert result["ids"] == ["dQw4w9WgXcQ"]

    def test_extracts_from_embed_format(self):
        result = _execute_youtube_id_extract(
            self._node(), {"input": "https://www.youtube.com/embed/dQw4w9WgXcQ?start=30"}, {}
        )
        assert result["ids"] == ["dQw4w9WgXcQ"]

    def test_extract_single_limits_to_one(self):
        text = f"{VIDEO_URL} and https://youtu.be/abcdefghijk"
        result = _execute_youtube_id_extract(self._node(extract_all=False), {"input": text}, {})
        assert len(result["ids"]) == 1

    def test_no_ids_on_non_youtube_text(self):
        result = _execute_youtube_id_extract(self._node(), {"input": "no videos here"}, {})
        assert result["ids"] == []


class TestNormalization:
    """dataSource youtube variant normalizes to data_source.youtube."""

    def test_youtube_source_type_maps(self):
        assert _normalize_node_type("dataSource", {"source_type": "youtube"}) == "data_source.youtube"

    def test_youtube_config_normalizes(self):
        cfg = _normalize_node_config("data_source.youtube", {"language": "en", "include_timestamps": True})
        assert cfg == {"language": "en", "include_timestamps": True}

    def test_dom_action_maps_to_sequence(self):
        assert _normalize_node_type("dom_action", {}) == "dom.sequence"

    def test_generic_dom_sequence_built_from_action_and_selector(self):
        cfg = _normalize_node_config(
            "dom.sequence",
            {"action": "click", "selector_key": "submit_button", "url": "https://example.com"},
        )
        seq = cfg["dom_action_sequence"]
        assert seq[0] == {"action": "goto", "target": "https://example.com"}
        assert seq[1]["action"] == "click"
        assert seq[1]["target"] == "submit_button"
