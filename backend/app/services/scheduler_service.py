"""Scheduler: interval-based repeat execution for free 24-7 workflows."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, persistence_service, workflow_service, poll_seconds: int = 30):
        self.persistence = persistence_service
        self.workflow_service = workflow_service
        self.poll_seconds = poll_seconds
        self._task: asyncio.Task | None = None
        self._running = False
        self.last_runs: Dict[str, datetime] = {}

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Scheduler started (poll %ss)", self.poll_seconds)

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Scheduler stopped")

    async def _loop(self):
        while self._running:
            try:
                await self._tick()
            except Exception as e:
                logger.warning("Scheduler tick failed: %s", e)
            await asyncio.sleep(self.poll_seconds)

    async def _tick(self):
        # Load all workflows; persistence lists ids via storage dir
        try:
            wf_ids = []
            # Use persistence index (durable) plus direct scan
            try:
                idx = self.persistence._load_workflows_index()
                wf_ids = list(idx.keys())
            except Exception:
                pass
            if not wf_ids:
                storage = getattr(self.persistence, "storage_dir", None) or getattr(self.persistence, "storage_path", None) or getattr(self.persistence, "_storage_path", None)
                if storage:
                    from pathlib import Path
                    p = Path(storage) if not isinstance(storage, Path) else storage
                    if p.exists():
                        for fp in p.glob("*.json"):
                            if fp.stem not in wf_ids:
                                wf_ids.append(fp.stem)
            # also scan via service if it tracks
            for wf_id in wf_ids:
                wf = self.persistence.load_workflow(wf_id)
                if not wf:
                    continue
                extra = getattr(wf, "__pydantic_extra__", None) or {}
                # also check direct attrs (extra='allow' stores there)
                interval = getattr(wf, "schedule_interval_seconds", None) or extra.get("schedule_interval_seconds")
                enabled = getattr(wf, "schedule_enabled", None)
                if enabled is None:
                    enabled = extra.get("schedule_enabled", False)
                if not enabled or not interval:
                    continue
                try:
                    interval = int(interval)
                except Exception:
                    continue
                if interval < 10:
                    interval = 10
                last = self.last_runs.get(wf_id)
                # also check workflow's last_scheduled_at
                last_str = getattr(wf, "last_scheduled_at", None) or extra.get("last_scheduled_at")
                if last_str and not last:
                    try:
                        last = datetime.fromisoformat(last_str.replace("Z",""))
                    except Exception:
                        last = None
                now = datetime.now(timezone.utc)
                if last and (now - last).total_seconds() < interval:
                    continue
                logger.info("Scheduler firing %s (interval %ss)", wf_id, interval)
                # execute via workflow_service
                from app.models.workflow import Workflow
                # ensure workflow has required id
                _, summary = await self.workflow_service.execute_workflow(wf, validate_workflow=False)
                self.last_runs[wf_id] = now
                # persist last run time back to workflow extra
                try:
                    wf.last_scheduled_at = now.isoformat().replace("+00:00","Z")
                except Exception:
                    pass
                try:
                    self.persistence.save_workflow(wf)
                except Exception:
                    pass
                logger.info("Scheduler completed %s: %s", wf_id, summary.get("status"))
        except Exception as e:
            logger.warning("Scheduler _tick inner: %s", e)
