#!/usr/bin/env python3
"""
Research Service
Provides high-level research operations integrating the research agent with Gemini automation.
"""

import asyncio
import json
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
import logging

import sys
from pathlib import Path

# Add backend to path for imports
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))

from research_agent import ResearchAgent, ResearchMode
from gemini_automation import GeminiAutomation, GeminiInterface, perform_gemini_research

logger = logging.getLogger(__name__)

class ResearchJob:
    """Represents a research job in the queue."""

    def __init__(self, research_id: str, query: str, mode: ResearchMode,
                 interface: GeminiInterface = GeminiInterface.DEEP_RESEARCH):
        self.research_id = research_id
        self.query = query
        self.mode = mode
        self.interface = interface
        self.status = "queued"  # queued, running, completed, failed
        self.progress = 0.0
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.task: Optional[asyncio.Task] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "research_id": self.research_id,
            "query": self.query,
            "mode": self.mode.value,
            "interface": self.interface.value,
            "status": self.status,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "result": self.result,
            "error": self.error
        }

class ResearchService:
    """Service for managing research operations with job queuing and progress tracking."""

    def __init__(self):
        self.research_agent = ResearchAgent()
        self.jobs: Dict[str, ResearchJob] = {}
        self.max_concurrent_jobs = 3
        self.active_jobs = 0
        self.job_queue: asyncio.Queue = asyncio.Queue()
        self.worker_task: Optional[asyncio.Task] = None

    async def initialize(self):
        """Initialize the research service and start the worker."""
        self.worker_task = asyncio.create_task(self._job_worker())
        logger.info("Research service initialized")

    async def shutdown(self):
        """Shutdown the research service."""
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        logger.info("Research service shutdown")

    async def start_research(self, query: str, mode: str = "balanced",
                           interface: str = "deep_research") -> str:
        """Start a new research job."""

        # Validate inputs
        try:
            research_mode = ResearchMode(mode.lower())
        except ValueError:
            raise ValueError(f"Invalid mode: {mode}. Must be one of: {[m.value for m in ResearchMode]}")

        try:
            gemini_interface = GeminiInterface(interface.lower())
        except ValueError:
            raise ValueError(f"Invalid interface: {interface}. Must be one of: {[i.value for i in GeminiInterface]}")

        # Create research job
        research_id = str(uuid.uuid4())
        job = ResearchJob(research_id, query, research_mode, gemini_interface)
        self.jobs[research_id] = job

        # Add to queue
        await self.job_queue.put(job)

        logger.info(f"Research job queued: {research_id} - {query}")
        return research_id

    async def _job_worker(self):
        """Background worker that processes research jobs."""
        while True:
            try:
                # Wait for a job
                job = await self.job_queue.get()

                # Check concurrency limit
                while self.active_jobs >= self.max_concurrent_jobs:
                    await asyncio.sleep(1)

                # Process the job
                self.active_jobs += 1
                job.status = "running"
                job.started_at = datetime.now()
                job.progress = 0.1

                try:
                    # Perform the research
                    result = await self._execute_research_job(job)

                    job.status = "completed"
                    job.result = result
                    job.progress = 1.0

                except Exception as e:
                    job.status = "failed"
                    job.error = str(e)
                    logger.error(f"Research job failed {job.research_id}: {e}")

                finally:
                    job.completed_at = datetime.now()
                    self.active_jobs -= 1
                    self.job_queue.task_done()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Job worker error: {e}")
                await asyncio.sleep(5)  # Brief pause before continuing

    async def _execute_research_job(self, job: ResearchJob) -> Dict[str, Any]:
        """Execute a research job using the appropriate method."""

        # For now, use Gemini automation directly
        # In the future, this could integrate with the research agent
        automation_result = await perform_gemini_research(
            job.query,
            interface=job.interface.value,
            headless=True
        )

        if not automation_result["success"]:
            raise Exception(f"Gemini automation failed: {automation_result.get('error', 'Unknown error')}")

        # If using comprehensive mode, we might want to enhance with the research agent
        if job.mode == ResearchMode.COMPREHENSIVE:
            # Use research agent for additional analysis
            agent_result = await self.research_agent.run_research(
                job.query,
                job.mode,
                research_id=job.research_id
            )

            return {
                "query": job.query,
                "mode": job.mode.value,
                "interface": job.interface.value,
                "gemini_result": automation_result,
                "agent_analysis": agent_result,
                "combined_analysis": self._combine_results(automation_result, agent_result)
            }
        else:
            return {
                "query": job.query,
                "mode": job.mode.value,
                "interface": job.interface.value,
                "result": automation_result
            }

    def _combine_results(self, gemini_result: Dict[str, Any], agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """Combine Gemini automation results with research agent analysis."""
        return {
            "primary_findings": gemini_result.get("response", {}),
            "agent_insights": agent_result.get("result", {}),
            "confidence_score": 0.85,  # Placeholder
            "sources_combined": True
        }

    def get_research_status(self, research_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a research job."""
        job = self.jobs.get(research_id)
        return job.to_dict() if job else None

    def list_researches(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all research jobs, optionally filtered by status."""
        jobs = [job.to_dict() for job in self.jobs.values()]

        if status_filter:
            jobs = [job for job in jobs if job["status"] == status_filter]

        # Sort by creation time, newest first
        jobs.sort(key=lambda x: x["created_at"], reverse=True)
        return jobs

    def get_queue_status(self) -> Dict[str, Any]:
        """Get the current queue status."""
        return {
            "active_jobs": self.active_jobs,
            "queued_jobs": self.job_queue.qsize(),
            "max_concurrent": self.max_concurrent_jobs,
            "total_jobs": len(self.jobs)
        }

    async def cancel_research(self, research_id: str) -> bool:
        """Cancel a research job if it's queued or running."""
        job = self.jobs.get(research_id)
        if not job:
            return False

        if job.status == "queued":
            # Remove from queue (this is tricky with asyncio.Queue)
            # For now, just mark as cancelled
            job.status = "cancelled"
            return True
        elif job.status == "running" and job.task:
            job.task.cancel()
            job.status = "cancelled"
            return True

        return False

# Global service instance
_research_service: Optional[ResearchService] = None

def get_research_service() -> ResearchService:
    """Get the global research service instance."""
    global _research_service
    if _research_service is None:
        _research_service = ResearchService()
    return _research_service

async def initialize_research_service():
    """Initialize the global research service."""
    service = get_research_service()
    await service.initialize()

async def shutdown_research_service():
    """Shutdown the global research service."""
    global _research_service
    if _research_service:
        await _research_service.shutdown()
        _research_service = None