#!/usr/bin/env python3
"""
Research Orchestrator Service

Decomposes a research query into N sets of M questions (one lens per set),
runs each set through a deep-research backend, consolidates per-set outputs,
and aggregates everything into a single cited markdown report.

When no GEMINI_API_KEY is available it falls back to deterministic heuristic
decomposition and a labeled dry-run research backend so a complete structured
report is still produced.
"""

import json
import logging
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)

LENSES = [
    "factual baseline",
    "key players and landscape",
    "challenges and risks",
    "recent developments",
    "future outlook",
    "comparisons and alternatives",
    "data and metrics",
    "case studies",
]

# 6+ aspects per lens; rotation index picks subaspect deterministically.
LENS_ASPECTS: Dict[str, List[str]] = {
    "factual baseline": [
        "core definition and scope",
        "foundational facts",
        "historical origin",
        "key terminology",
        "primary mechanisms",
        "established consensus",
    ],
    "key players and landscape": [
        "major organizations",
        "influential individuals",
        "market structure",
        "geographic distribution",
        "ecosystem relationships",
        "competitive positioning",
    ],
    "challenges and risks": [
        "technical obstacles",
        "regulatory hurdles",
        "economic constraints",
        "ethical concerns",
        "security threats",
        "adoption barriers",
    ],
    "recent developments": [
        "last 12 months news",
        "notable product launches",
        "policy changes",
        "research breakthroughs",
        "partnerships and deals",
        "community reactions",
    ],
    "future outlook": [
        "expert predictions",
        "emerging trends",
        "roadmaps and timelines",
        "potential disruptions",
        "long-term scenarios",
        "investment signals",
    ],
    "comparisons and alternatives": [
        "direct competitors",
        "adjacent approaches",
        "cost comparisons",
        "strengths and weaknesses",
        "migration paths",
        "hybrid solutions",
    ],
    "data and metrics": [
        "market size figures",
        "growth rates",
        "usage statistics",
        "performance benchmarks",
        "cost structures",
        "adoption percentages",
    ],
    "case studies": [
        "successful deployments",
        "failure post-mortems",
        "pilot programs",
        "industry-specific examples",
        "academic studies",
        "community write-ups",
    ],
}

URL_PATTERN = re.compile(r"https?://\S+")


def _gemini_api_key() -> Optional[str]:
    """Read the API key at call time so tests can monkeypatch os.environ."""
    return os.environ.get("GEMINI_API_KEY")


def _call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini REST API. Returns text or None on ANY error."""
    key = _gemini_api_key()
    if not key:
        return None
    try:
        payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        url = f"{GEMINI_API_URL}?key={urllib.parse.quote(key)}"
        req = urllib.request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as exc:  # any error means fallback to heuristics
        logger.warning("Gemini REST call failed, falling back: %s", exc)
        return None


def _extract_json_array(text: str) -> Optional[List[str]]:
    """Best-effort extraction of a JSON string array from model output."""
    try:
        arr = json.loads(text[text.index("["): text.rindex("]") + 1])
        if isinstance(arr, list) and all(isinstance(q, str) for q in arr):
            return arr
    except (ValueError, json.JSONDecodeError):
        pass
    return None


def _slugify(query: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")
    return slug[:max_len].rstrip("-") or "report"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ResearchOrchestrator:
    """Orchestrates multi-set deep research: decomposition, per-set execution,
    consolidation, and aggregation into one cited markdown report."""

    def __init__(self, reports_dir: Optional[Path] = None):
        self.reports_dir = (
            Path(reports_dir)
            if reports_dir
            else Path(__file__).resolve().parents[2] / "data" / "research_reports"
        )

    # ------------------------------------------------------------------
    # Decomposition
    # ------------------------------------------------------------------
    def _heuristic_decompose(self, query: str, sets: int, per_set: int) -> List[Dict[str, Any]]:
        decomposition: List[Dict[str, Any]] = []
        for i in range(sets):
            lens = LENSES[i % len(LENSES)]
            aspects = LENS_ASPECTS[lens]
            questions = [f"{lens}: {query} — {aspects[j % len(aspects)]}?" for j in range(per_set)]
            decomposition.append({"set_index": i, "lens": lens, "questions": questions})
        return decomposition

    async def _decompose(self, query: str, sets: int, per_set: int):
        """Returns (decomposition, mode_used). API path asks Gemini for question
        arrays; any error falls back to deterministic heuristics."""
        prompt = (
            f"Break down the research query \"{query}\" into exactly {sets} "
            f"themed sets of exactly {per_set} research questions each. "
            "Return ONLY a JSON array of arrays of question strings, no prose."
        )
        text = _call_gemini(prompt)
        if text:
            arr = _extract_json_array(text)
            if (
                isinstance(arr, list)
                and len(arr) == sets
                and all(isinstance(s, list) and len(s) == per_set for s in arr)
                and all(isinstance(q, str) for s in arr for q in s)
            ):
                decomposition = []
                for i, questions in enumerate(arr):
                    decomposition.append({
                        "set_index": i,
                        "lens": LENSES[i % len(LENSES)],
                        "questions": questions,
                    })
                return decomposition, "api"
        return self._heuristic_decompose(query, sets, per_set), "heuristic"

    # ------------------------------------------------------------------
    # Per-set research
    # ------------------------------------------------------------------
    @staticmethod
    def _dry_run_research(set_index: int, query: str) -> Dict[str, Any]:
        """Dry-run backend result (labeled honestly as such)."""
        return {
            "result": f"[dry-run:dom.gemini.deep_research] {query}",
            "actions": [],
            "metadata": {"dry_run": True, "set_index": set_index},
        }

    async def _research_set(
        self, set_index: int, lens: str, questions: List[str], query: str
    ) -> Dict[str, Any]:
        """Run one set; a failure yields an error result without aborting others."""
        try:
            if _gemini_api_key():
                prompt = (
                    "Answer the following research questions concisely, citing "
                    "source URLs where possible:\n"
                    + "\n".join(f"- {q}" for q in questions)
                )
                text = _call_gemini(prompt)
                if text:
                    return {
                        "set_index": set_index,
                        "lens": lens,
                        "research_output": {"result": text},
                    }
            return {
                "set_index": set_index,
                "lens": lens,
                "research_output": self._dry_run_research(set_index, query),
            }
        except Exception as exc:  # never abort sibling sets
            logger.warning("Research set %d (%s) failed: %s", set_index, lens, exc)
            return {
                "set_index": set_index,
                "lens": lens,
                "research_output": {"error": str(exc)},
                "consolidated": "",
            }

    # ------------------------------------------------------------------
    # Consolidation
    # ------------------------------------------------------------------
    @staticmethod
    def _extract_text(research_output: Any) -> Optional[str]:
        if isinstance(research_output, dict):
            raw = research_output.get("result")
            return raw if isinstance(raw, str) else None
        if isinstance(research_output, str):
            return research_output
        return None

    def _consolidate(self, set_result: Dict[str, Any]) -> str:
        research_output = set_result.get("research_output", {})
        if isinstance(research_output, dict) and "error" in research_output:
            return ""
        text = self._extract_text(research_output)

        if text and _gemini_api_key():
            summary = _call_gemini(
                f"Summarize this research into at most 5 bullet points "
                f"(markdown '- ' bullets):\n\n{text}"
            )
            if summary:
                return summary.strip()

        if not text:
            return (
                f"Lens: {set_result.get('lens')} — dry-run mode: no live "
                f"research output produced; questions listed below."
            )

        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        return " ".join(sentences[:2]).strip()

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------
    @staticmethod
    def _collect_references(set_results: List[Dict[str, Any]]) -> List[str]:
        refs: List[str] = []
        seen = set()
        for sr in set_results:
            blob = json.dumps(sr.get("research_output", {}), default=str)
            for match in URL_PATTERN.findall(blob):
                url = match.rstrip(".,;)")
                if url not in seen:
                    seen.add(url)
                    refs.append(url)
        return refs

    def _aggregate(
        self,
        query: str,
        interface: str,
        mode_used: str,
        set_results: List[Dict[str, Any]],
    ) -> str:
        now = _utcnow().strftime("%Y-%m-%d %H:%M UTC")
        lines: List[str] = [
            f"# Deep Research Report: {query}",
            "",
            f"_Generated {now} · interface: {interface} · mode_used: {mode_used}"
            f" · {len(set_results)} sets_",
            "",
            "## Executive Summary",
            "",
        ]

        exec_bullets: List[str] = []
        for sr in set_results:
            consolidated = (sr.get("consolidated") or "").strip()
            first_line = next(
                (ln.lstrip("- ").strip() for ln in consolidated.splitlines() if ln.strip()), ""
            )
            if first_line:
                exec_bullets.append(f"- **{sr['lens']}**: {first_line}")
            if len(exec_bullets) >= 3:
                break
        lines.extend(exec_bullets if exec_bullets else ["- No consolidated findings available."])
        lines.append("")

        for sr in set_results:
            lines.append(f"## Set {sr['set_index']}: {sr['lens']}")
            lines.append("")
            consolidated = (sr.get("consolidated") or "").strip()
            lines.append(consolidated or "_No consolidation available for this set._")
            lines.append("")
            lines.append("Questions:")
            lines.extend(f"- {q}" for q in sr["questions"])
            lines.append("")

        references = self._collect_references(set_results)
        lines.append("## References")
        lines.append("")
        if references:
            lines.extend(f"- {url}" for url in references)
        else:
            lines.append(
                "> No external references captured in dry-run mode — run with a "
                "live interface (capture storage state) to collect citations."
            )
        lines.append("")
        lines.append("---")
        lines.append("*Generated by DataKiln Research Orchestrator*")
        return "\n".join(lines) + "\n"

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    async def orchestrate(
        self,
        query: str,
        sets: int = 3,
        per_set: int = 6,
        interface: str = "gemini",
        mode: str = "auto",
    ) -> Dict[str, Any]:
        api_available = bool(_gemini_api_key())

        decomposition, decompose_mode = await self._decompose(query, sets, per_set)

        set_results: List[Dict[str, Any]] = []
        for d in decomposition:
            result = await self._research_set(d["set_index"], d["lens"], d["questions"], query)
            result.setdefault("consolidated", self._consolidate(result))
            result["questions"] = d["questions"]
            set_results.append(result)

        # mode_used reflects the effective end-to-end pipeline.
        mode_used = decompose_mode if api_available else "heuristic"

        report_markdown = self._aggregate(query, interface, mode_used, set_results)

        self.reports_dir.mkdir(parents=True, exist_ok=True)
        timestamp = _utcnow().strftime("%Y%m%dT%H%M%S") + f"-{int(time.time() * 1000) % 1000:03d}"
        report_path = self.reports_dir / f"{timestamp}-{_slugify(query)}.md"
        report_path.write_text(report_markdown, encoding="utf-8")

        return {
            "query": query,
            "sets": sets,
            "per_set": per_set,
            "interface": interface,
            "mode_used": mode_used,
            "decomposition": decomposition,
            "set_results": [
                {
                    "set_index": sr["set_index"],
                    "lens": sr["lens"],
                    "research_output": sr["research_output"],
                    "consolidated": sr["consolidated"],
                }
                for sr in set_results
            ],
            "report_markdown": report_markdown,
            "report_path": str(report_path),
            "references": self._collect_references(set_results),
        }


_orchestrator: Optional[ResearchOrchestrator] = None


def get_research_orchestrator() -> ResearchOrchestrator:
    """Module-level singleton accessor."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ResearchOrchestrator()
    return _orchestrator
