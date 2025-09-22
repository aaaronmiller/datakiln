#!/usr/bin/env python3
"""
Todo List Integration with Context Portal

This script provides integration between the development todo-list system
and Context Portal progress tracking for unified task management.

Usage:
    python scripts/todo_integration.py sync_todos
    python scripts/todo_integration.py mark_complete <todo_description>
    python scripts/todo_integration.py add_todo <description>
    python scripts/todo_integration.py list_pending
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Import the integration module
sys.path.append(str(Path(__file__).parent))
from context_portal_integration import ContextPortalIntegration

class TodoIntegration:
    def __init__(self):
        self.cpi = ContextPortalIntegration()

    def sync_todos(self):
        """Sync todo list with Context Portal progress entries"""
        print("🔄 Syncing todo list with Context Portal...")

        # Get current active context to see if there are todos stored there
        active_context = self.cpi.get_active_context()

        # Get recent progress entries that might represent todos
        recent_progress = self.cpi.get_current_progress(limit=20)

        # Extract potential todos from progress entries
        todos = []
        for entry in recent_progress:
            if entry['status'] in ['TODO', 'IN_PROGRESS', 'PENDING']:
                todos.append({
                    'id': entry['id'],
                    'description': entry['description'],
                    'status': entry['status'],
                    'timestamp': entry['timestamp']
                })

        # Store todos in active context for persistence
        active_context['synced_todos'] = todos
        active_context['last_todo_sync'] = datetime.now().isoformat()
        self.cpi.update_active_context(active_context)

        print(f"✅ Synced {len(todos)} todos from Context Portal")
        return todos

    def mark_complete(self, todo_description: str):
        """Mark a todo as completed"""
        print(f"✅ Marking todo as complete: {todo_description}")

        # Update progress entry
        self.cpi.update_progress('DONE', f"Completed: {todo_description}")

        # Update active context
        active_context = self.cpi.get_active_context()
        if 'synced_todos' in active_context:
            for todo in active_context['synced_todos']:
                if todo['description'].lower() in todo_description.lower() or \
                   todo_description.lower() in todo['description'].lower():
                    todo['status'] = 'DONE'
                    todo['completed_at'] = datetime.now().isoformat()
                    break

            self.cpi.update_active_context(active_context)

        # Log decision about completing this todo
        self.cpi.log_decision(
            summary=f"Completed todo: {todo_description}",
            rationale="Todo marked as completed through integration system",
            tags=['todo', 'complete', 'integration']
        )

        print("✅ Todo marked as completed in Context Portal")

    def add_todo(self, description: str):
        """Add a new todo item"""
        print(f"📝 Adding new todo: {description}")

        # Add as progress entry
        progress_id = self.cpi.update_progress('TODO', description)

        # Update active context
        active_context = self.cpi.get_active_context()
        if 'synced_todos' not in active_context:
            active_context['synced_todos'] = []

        active_context['synced_todos'].append({
            'id': progress_id,
            'description': description,
            'status': 'TODO',
            'timestamp': datetime.now().isoformat()
        })

        self.cpi.update_active_context(active_context)

        # Log decision about adding this todo
        self.cpi.log_decision(
            summary=f"Added new todo: {description}",
            rationale="Todo added through integration system for tracking",
            tags=['todo', 'add', 'integration']
        )

        print(f"✅ Todo added with ID: {progress_id}")

    def list_pending(self):
        """List pending todos"""
        print("📋 Pending Todos:")

        active_context = self.cpi.get_active_context()
        synced_todos = active_context.get('synced_todos', [])

        pending_todos = [todo for todo in synced_todos if todo['status'] != 'DONE']

        if not pending_todos:
            print("  No pending todos found")
            return

        for i, todo in enumerate(pending_todos, 1):
            status_icon = "⏳" if todo['status'] == 'IN_PROGRESS' else "📝"
            print(f"  {i}. {status_icon} {todo['description']}")
            print(f"     Status: {todo['status']} | ID: {todo['id']}")

    def get_todo_status(self) -> Dict[str, Any]:
        """Get comprehensive todo status"""
        active_context = self.cpi.get_active_context()
        synced_todos = active_context.get('synced_todos', [])

        total = len(synced_todos)
        completed = len([t for t in synced_todos if t['status'] == 'DONE'])
        in_progress = len([t for t in synced_todos if t['status'] == 'IN_PROGRESS'])
        pending = len([t for t in synced_todos if t['status'] == 'TODO'])

        return {
            'total': total,
            'completed': completed,
            'in_progress': in_progress,
            'pending': pending,
            'completion_rate': (completed / total * 100) if total > 0 else 0,
            'last_sync': active_context.get('last_todo_sync')
        }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    args = sys.argv[2:]

    ti = TodoIntegration()

    try:
        if command == 'sync_todos':
            ti.sync_todos()

        elif command == 'mark_complete':
            if not args:
                print("Usage: mark_complete <todo_description>")
                sys.exit(1)
            description = ' '.join(args)
            ti.mark_complete(description)

        elif command == 'add_todo':
            if not args:
                print("Usage: add_todo <description>")
                sys.exit(1)
            description = ' '.join(args)
            ti.add_todo(description)

        elif command == 'list_pending':
            ti.list_pending()

        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()