#!/usr/bin/env python3
"""
Periodic Progress Storage

This script automatically captures and stores progress snapshots at regular intervals
or during build phases to ensure memory retention between development sessions.

Usage:
    python scripts/periodic_progress.py snapshot [description]
    python scripts/periodic_progress.py auto_snapshot
    python scripts/periodic_progress.py cleanup [days]
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any

# Import the integration module
sys.path.append(str(Path(__file__).parent))
from context_portal_integration import ContextPortalIntegration

class PeriodicProgress:
    def __init__(self):
        self.cpi = ContextPortalIntegration()

    def take_snapshot(self, description: str = ""):
        """Take a manual progress snapshot"""
        print("📸 Taking progress snapshot...")

        # Get current git status if available
        git_status = self._get_git_status()

        # Get current task status
        active_context = self.cpi.get_active_context()
        current_task = active_context.get('current_task')

        # Create snapshot description
        if not description:
            task_info = f" during task '{current_task['name']}'" if current_task else ""
            description = f"Periodic progress snapshot{task_info}"

        # Add git status to description
        if git_status:
            description += f" | Git: {git_status}"

        # Update progress
        progress_id = self.cpi.update_progress('SNAPSHOT', description)

        print(f"✅ Progress snapshot taken (ID: {progress_id})")
        return progress_id

    def auto_snapshot(self):
        """Take an automatic progress snapshot with smart detection"""
        print("🤖 Taking automatic progress snapshot...")

        # Check if there have been recent changes
        recent_changes = self._detect_recent_changes()

        if not recent_changes:
            print("ℹ️  No recent changes detected, skipping snapshot")
            return None

        # Create description based on detected changes
        description = f"Auto-snapshot: {recent_changes}"

        # Take the snapshot
        progress_id = self.take_snapshot(description)

        # If we have a current task, update its progress
        active_context = self.cpi.get_active_context()
        if active_context.get('current_task'):
            task_progress = f"Progress update: {recent_changes}"
            self.cpi.update_progress('IN_PROGRESS', task_progress)

        return progress_id

    def cleanup_old_snapshots(self, days: int = 30):
        """Clean up old snapshots older than specified days"""
        print(f"🧹 Cleaning up snapshots older than {days} days...")

        conn = self.cpi.get_connection()
        cursor = conn.cursor()

        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            # Find old snapshots
            cursor.execute("""
                SELECT id, description FROM progress_entries
                WHERE timestamp < ? AND status = 'SNAPSHOT'
            """, (cutoff_date,))

            old_snapshots = cursor.fetchall()

            if not old_snapshots:
                print("ℹ️  No old snapshots to clean up")
                return 0

            # Delete old snapshots
            cursor.execute("""
                DELETE FROM progress_entries
                WHERE timestamp < ? AND status = 'SNAPSHOT'
            """, (cutoff_date,))

            deleted_count = cursor.rowcount
            conn.commit()

            print(f"✅ Cleaned up {deleted_count} old snapshots")
            return deleted_count

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _get_git_status(self) -> str:
        """Get current git status summary"""
        try:
            # Check if we're in a git repository
            result = subprocess.run(['git', 'rev-parse', '--git-dir'],
                                  capture_output=True, text=True, cwd=Path(__file__).parent.parent)
            if result.returncode != 0:
                return ""

            # Get branch name
            result = subprocess.run(['git', 'branch', '--show-current'],
                                  capture_output=True, text=True, cwd=Path(__file__).parent.parent)
            branch = result.stdout.strip() if result.returncode == 0 else "unknown"

            # Get status summary
            result = subprocess.run(['git', 'status', '--porcelain'],
                                  capture_output=True, text=True, cwd=Path(__file__).parent.parent)
            if result.returncode == 0:
                changes = len(result.stdout.strip().split('\n')) if result.stdout.strip() else 0
                return f"branch:{branch}, changes:{changes}"
            else:
                return f"branch:{branch}"

        except Exception:
            return ""

    def _detect_recent_changes(self) -> str:
        """Detect recent changes that warrant a snapshot"""
        changes = []

        # Check git changes
        git_status = self._get_git_status()
        if git_status and 'changes:' in git_status:
            changes_part = git_status.split('changes:')[1].split(',')[0]
            if changes_part != '0':
                changes.append(f"git changes ({changes_part} files)")

        # Check for recent progress entries (last hour)
        recent_progress = self.cpi.get_current_progress(limit=5)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_entries = [p for p in recent_progress
                         if datetime.fromisoformat(p['timestamp']) > one_hour_ago]

        if recent_entries:
            changes.append(f"{len(recent_entries)} recent progress entries")

        # Check for recent decisions
        recent_decisions = self.cpi.get_recent_decisions(limit=3)
        recent_decisions_filtered = [d for d in recent_decisions
                                   if datetime.fromisoformat(d['timestamp']) > one_hour_ago]

        if recent_decisions_filtered:
            changes.append(f"{len(recent_decisions_filtered)} recent decisions")

        return ", ".join(changes) if changes else ""


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    args = sys.argv[2:]

    pp = PeriodicProgress()

    try:
        if command == 'snapshot':
            description = ' '.join(args) if args else ""
            pp.take_snapshot(description)

        elif command == 'auto_snapshot':
            result = pp.auto_snapshot()
            if result is None:
                print("ℹ️  Auto-snapshot skipped (no changes detected)")

        elif command == 'cleanup':
            days = int(args[0]) if args else 30
            pp.cleanup_old_snapshots(days)

        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()