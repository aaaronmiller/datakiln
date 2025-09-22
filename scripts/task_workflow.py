#!/usr/bin/env python3
"""
Task Workflow Management

This script provides automated workflows for task beginning and end assessments,
integrating with the Context Portal for memory retention.

Usage:
    python scripts/task_workflow.py begin <task_name> [description]
    python scripts/task_workflow.py end [completion_notes]
    python scripts/task_workflow.py status
"""

import sys
import os
import subprocess
import json
from pathlib import Path
from datetime import datetime

# Import the integration module
sys.path.append(str(Path(__file__).parent))
from context_portal_integration import ContextPortalIntegration

class TaskWorkflow:
    def __init__(self):
        self.cpi = ContextPortalIntegration()

    def begin_task_assessment(self, task_name: str, description: str = ""):
        """Perform beginning-of-task assessment"""
        print(f"🔄 Starting task assessment for: {task_name}")

        # Get current context before starting
        print("📊 Assessing current project state...")
        active_context = self.cpi.get_active_context()
        product_context = self.cpi.get_product_context()

        # Check for any incomplete previous tasks
        if active_context.get('current_task'):
            prev_task = active_context['current_task']
            print(f"⚠️  Warning: Previous task '{prev_task['name']}' is still active")
            response = input("Do you want to end the previous task first? (y/n): ")
            if response.lower().startswith('y'):
                self.end_task_assessment("Auto-ended due to new task start")

        # Analyze recent progress
        recent_progress = self.cpi.get_current_progress(limit=5)
        if recent_progress:
            print("📈 Recent progress:")
            for entry in recent_progress[:3]:  # Show last 3
                print(f"  • {entry['status']}: {entry['description'][:50]}...")

        # Start the task
        task_id = self.cpi.start_task(task_name, description)

        print(f"✅ Task '{task_name}' started successfully (ID: {task_id})")
        print("💡 Tip: Use 'python scripts/task_workflow.py status' to check progress")
        print("💡 Tip: Use 'python scripts/context_portal_integration.py update_progress <status> <desc>' for updates")

        return task_id

    def end_task_assessment(self, completion_notes: str = ""):
        """Perform end-of-task assessment"""
        print("🔄 Starting end-of-task assessment...")

        # Get current task
        active_context = self.cpi.get_active_context()
        current_task = active_context.get('current_task')

        if not current_task:
            print("❌ No active task found to end")
            return

        print(f"📋 Assessing completion of: {current_task['name']}")

        # Show task summary
        start_time = datetime.fromisoformat(current_task['started_at'])
        duration = datetime.now() - start_time
        print(f"⏱️  Task duration: {duration}")

        # Get progress during this task
        recent_progress = self.cpi.get_current_progress(limit=10)
        task_progress = [p for p in recent_progress if p['id'] > current_task['id']]
        if task_progress:
            print(f"📊 Progress entries during task: {len(task_progress)}")
            for entry in task_progress[:5]:  # Show first 5
                print(f"  • {entry['status']}: {entry['description'][:50]}...")

        # Ask for completion assessment
        if not completion_notes:
            print("\n📝 Please provide completion notes:")
            completion_notes = input("Completion notes (or press Enter for none): ").strip()

        # End the task
        self.cpi.end_task(completion_notes)

        # Create baseline snapshot
        print("📸 Creating baseline snapshot...")
        baseline_id = self.cpi.baseline_snapshot()

        print(f"✅ Task '{current_task['name']}' completed successfully")
        print(f"📦 Baseline snapshot stored (ID: {baseline_id})")

    def show_status(self):
        """Show current task status"""
        active_context = self.cpi.get_active_context()
        current_task = active_context.get('current_task')

        if current_task:
            start_time = datetime.fromisoformat(current_task['started_at'])
            duration = datetime.now() - start_time
            print(f"🎯 Current Task: {current_task['name']}")
            print(f"📝 Description: {current_task['description']}")
            print(f"⏱️  Duration: {duration}")
            print(f"🆔 Task ID: {current_task['id']}")
        else:
            print("📭 No active task")

        # Show recent progress
        recent_progress = self.cpi.get_current_progress(limit=5)
        if recent_progress:
            print("\n📈 Recent Progress:")
            for entry in recent_progress:
                print(f"  • [{entry['timestamp'][:19]}] {entry['status']}: {entry['description']}")

        # Show last completed task
        last_completed = active_context.get('last_completed_task')
        if last_completed:
            print(f"\n✅ Last Completed: {last_completed['name']} ({last_completed.get('completed_at', 'Unknown')[:19]})")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    args = sys.argv[2:]

    workflow = TaskWorkflow()

    try:
        if command == 'begin':
            if not args:
                print("Usage: begin <task_name> [description]")
                sys.exit(1)
            task_name = args[0]
            description = ' '.join(args[1:]) if len(args) > 1 else ""
            workflow.begin_task_assessment(task_name, description)

        elif command == 'end':
            completion_notes = ' '.join(args) if args else ""
            workflow.end_task_assessment(completion_notes)

        elif command == 'status':
            workflow.show_status()

        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()