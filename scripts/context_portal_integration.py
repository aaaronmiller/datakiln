#!/usr/bin/env python3
"""
Context Portal Integration Script

This script provides build-phase memory retention tools for development workflow management.
It integrates with the Context Portal database to track progress, decisions, and project state
between development phases.

Usage:
    python scripts/context_portal_integration.py <command> [args...]

Commands:
    start_task <task_name> [description]    - Start a new development task
    update_progress <status> <description>  - Update current progress
    end_task [completion_notes]             - End current task with notes
    baseline_snapshot                       - Store current project baseline
    list_tasks                              - List recent tasks
    get_context                             - Get current active context
"""

import sqlite3
import json
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Database path
DB_PATH = Path(__file__).parent.parent / "context_portal" / "context.db"
WORKSPACE_ID = str(Path(__file__).parent.parent.resolve())

class ContextPortalIntegration:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.workspace_id = WORKSPACE_ID

    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)

    def start_task(self, task_name: str, description: str = ""):
        """Start a new development task"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Log the task start in progress_entries
            cursor.execute("""
                INSERT INTO progress_entries (timestamp, status, description)
                VALUES (?, ?, ?)
            """, (datetime.now(), 'IN_PROGRESS', f"Started: {task_name} - {description}"))

            task_id = cursor.lastrowid

            # Update active context with current task
            active_context = self.get_active_context()
            active_context['current_task'] = {
                'id': task_id,
                'name': task_name,
                'description': description,
                'started_at': datetime.now().isoformat()
            }

            self.update_active_context(active_context)

            # Log decision about starting this task
            self.log_decision(
                summary=f"Started development task: {task_name}",
                rationale=f"Task description: {description}",
                tags=['task', 'development', 'start']
            )

            conn.commit()
            print(f"Started task '{task_name}' with ID {task_id}")
            return task_id

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def update_progress(self, status: str, description: str):
        """Update current progress"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO progress_entries (timestamp, status, description)
                VALUES (?, ?, ?)
            """, (datetime.now(), status, description))

            progress_id = cursor.lastrowid

            # Update active context with latest progress
            active_context = self.get_active_context()
            if 'progress_updates' not in active_context:
                active_context['progress_updates'] = []
            active_context['progress_updates'].append({
                'id': progress_id,
                'status': status,
                'description': description,
                'timestamp': datetime.now().isoformat()
            })
            # Keep only last 10 progress updates
            active_context['progress_updates'] = active_context['progress_updates'][-10:]

            self.update_active_context(active_context)

            conn.commit()
            print(f"Progress updated: {status} - {description}")
            return progress_id

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def end_task(self, completion_notes: str = ""):
        """End current task"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Get current task from active context
            active_context = self.get_active_context()
            current_task = active_context.get('current_task')

            if not current_task:
                print("No active task found")
                return

            # Update the task status to completed
            cursor.execute("""
                INSERT INTO progress_entries (timestamp, status, description)
                VALUES (?, ?, ?)
            """, (datetime.now(), 'DONE', f"Completed: {current_task['name']} - {completion_notes}"))

            # Clear current task from active context
            active_context['current_task'] = None
            active_context['last_completed_task'] = current_task
            active_context['last_completed_task']['completed_at'] = datetime.now().isoformat()
            active_context['last_completed_task']['completion_notes'] = completion_notes

            self.update_active_context(active_context)

            # Log completion decision
            self.log_decision(
                summary=f"Completed development task: {current_task['name']}",
                rationale=f"Completion notes: {completion_notes}",
                tags=['task', 'development', 'complete']
            )

            conn.commit()
            print(f"Completed task '{current_task['name']}'")

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def baseline_snapshot(self):
        """Store current project progress baseline"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Get current project state
            baseline_data = {
                'timestamp': datetime.now().isoformat(),
                'workspace_id': self.workspace_id,
                'active_context': self.get_active_context(),
                'product_context': self.get_product_context(),
                'recent_decisions': self.get_recent_decisions(limit=5),
                'current_progress': self.get_current_progress(limit=10),
                'system_patterns': self.get_system_patterns(limit=5)
            }

            # Store as custom data
            cursor.execute("""
                INSERT OR REPLACE INTO custom_data (timestamp, category, key, value)
                VALUES (?, ?, ?, ?)
            """, (
                datetime.now(),
                'ProjectBaselines',
                f"baseline_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                json.dumps(baseline_data)
            ))

            baseline_id = cursor.lastrowid

            # Log baseline creation
            self.log_decision(
                summary="Created project progress baseline snapshot",
                rationale="Periodic baseline storage for memory retention between development phases",
                tags=['baseline', 'memory', 'retention']
            )

            conn.commit()
            print(f"Baseline snapshot stored with ID {baseline_id}")
            return baseline_id

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_active_context(self) -> Dict[str, Any]:
        """Get current active context"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT content FROM active_context WHERE id = 1")
            result = cursor.fetchone()
            return json.loads(result[0]) if result else {}
        finally:
            conn.close()

    def update_active_context(self, context: Dict[str, Any]):
        """Update active context"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                UPDATE active_context SET content = ? WHERE id = 1
            """, (json.dumps(context),))
            conn.commit()
        finally:
            conn.close()

    def get_product_context(self) -> Dict[str, Any]:
        """Get product context"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT content FROM product_context WHERE id = 1")
            result = cursor.fetchone()
            return json.loads(result[0]) if result else {}
        finally:
            conn.close()

    def log_decision(self, summary: str, rationale: str = "", implementation_details: str = "", tags: List[str] = None):
        """Log a decision"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            tags_str = json.dumps(tags) if tags else None
            cursor.execute("""
                INSERT INTO decisions (timestamp, summary, rationale, implementation_details, tags)
                VALUES (?, ?, ?, ?, ?)
            """, (datetime.now(), summary, rationale, implementation_details, tags_str))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def get_recent_decisions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent decisions"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT id, timestamp, summary, rationale, implementation_details, tags
                FROM decisions
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))

            decisions = []
            for row in cursor.fetchall():
                decision = {
                    'id': row[0],
                    'timestamp': row[1],
                    'summary': row[2],
                    'rationale': row[3],
                    'implementation_details': row[4],
                    'tags': json.loads(row[5]) if row[5] else []
                }
                decisions.append(decision)
            return decisions
        finally:
            conn.close()

    def get_current_progress(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get current progress entries"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT id, timestamp, status, description
                FROM progress_entries
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))

            progress = []
            for row in cursor.fetchall():
                entry = {
                    'id': row[0],
                    'timestamp': row[1],
                    'status': row[2],
                    'description': row[3]
                }
                progress.append(entry)
            return progress
        finally:
            conn.close()

    def get_system_patterns(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get system patterns"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT id, timestamp, name, description, tags
                FROM system_patterns
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))

            patterns = []
            for row in cursor.fetchall():
                pattern = {
                    'id': row[0],
                    'timestamp': row[1],
                    'name': row[2],
                    'description': row[3],
                    'tags': json.loads(row[4]) if row[4] else []
                }
                patterns.append(pattern)
            return patterns
        finally:
            conn.close()

    def list_tasks(self):
        """List recent tasks"""
        progress = self.get_current_progress(limit=20)
        print("Recent Tasks/Progress:")
        for entry in progress:
            print(f"[{entry['timestamp']}] {entry['status']}: {entry['description']}")

    def get_context(self):
        """Get current context summary"""
        active = self.get_active_context()
        product = self.get_product_context()

        print("=== ACTIVE CONTEXT ===")
        print(json.dumps(active, indent=2))
        print("\n=== PRODUCT CONTEXT ===")
        print(json.dumps(product, indent=2))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    args = sys.argv[2:]

    cpi = ContextPortalIntegration()

    try:
        if command == 'start_task':
            if not args:
                print("Usage: start_task <task_name> [description]")
                sys.exit(1)
            task_name = args[0]
            description = args[1] if len(args) > 1 else ""
            cpi.start_task(task_name, description)

        elif command == 'update_progress':
            if len(args) < 2:
                print("Usage: update_progress <status> <description>")
                sys.exit(1)
            status, description = args[0], ' '.join(args[1:])
            cpi.update_progress(status, description)

        elif command == 'end_task':
            completion_notes = ' '.join(args) if args else ""
            cpi.end_task(completion_notes)

        elif command == 'baseline_snapshot':
            cpi.baseline_snapshot()

        elif command == 'list_tasks':
            cpi.list_tasks()

        elif command == 'get_context':
            cpi.get_context()

        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()