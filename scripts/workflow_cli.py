#!/usr/bin/env python3
"""
DataKiln CLI - Execute workflows from command line

Usage:
  python workflow_cli.py execute <workflow_id>
  python workflow_cli.py execute --json workflow.json
  python workflow_cli.py list
  python workflow_cli.py status <execution_id>
"""
import sys
import json
import argparse
import requests
from pathlib import Path

API_BASE = "http://localhost:8000"

def execute_workflow_by_id(workflow_id: str, api_base: str = API_BASE):
    """Execute a saved workflow by ID"""
    url = f"{api_base}/api/v1/workflows/{workflow_id}/execute"
    
    print(f"🚀 Executing workflow: {workflow_id}")
    print(f"📡 Endpoint: {url}")
    
    try:
        response = requests.post(url, json={}, timeout=300)
        response.raise_for_status()
        
        result = response.json()
        print("✅ Workflow execution started")
        print(f"📊 Execution ID: {result.get('execution_id')}")
        print(json.dumps(result, indent=2))
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def execute_workflow_from_json(json_file: str, api_base: str = API_BASE):
    """Execute a workflow defined in a JSON file"""
    workflow_data = json.loads(Path(json_file).read_text())
    
    # Extract workflow ID from JSON or use filename
    workflow_id = workflow_data.get('id', Path(json_file).stem)
    
    url = f"{api_base}/api/v1/workflows/{workflow_id}/execute"
    
    print(f"🚀 Executing workflow from: {json_file}")
    print(f"📡 Endpoint: {url}")
    
    try:
        response = requests.post(url, json=workflow_data, timeout=300)
        response.raise_for_status()
        
        result = response.json()
        print("✅ Workflow execution completed")
        print(json.dumps(result, indent=2))
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def list_workflows(api_base: str = API_BASE):
    """List all available workflows"""
    url = f"{api_base}/api/v1/workflows"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        workflows = response.json()
        print(f"📋 Available Workflows ({len(workflows)}):")
        for wf in workflows:
            print(f"  • {wf['id']}: {wf.get('name', 'Unnamed')}")
        
        return workflows
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def check_status(execution_id: str, api_base: str = API_BASE):
    """Check execution status"""
    url = f"{api_base}/api/v1/executions/{execution_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        status = response.json()
        print(f"📊 Execution Status: {execution_id}")
        print(json.dumps(status, indent=2))
        
        return status
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='DataKiln CLI - Execute workflows')
    parser.add_argument('command', choices=['execute', 'list', 'status'], help='Command to run')
    parser.add_argument('args', nargs='*', help='Command arguments')
    parser.add_argument('--json', help='JSON file with workflow definition')
    parser.add_argument('--api', default=API_BASE, help='API base URL')
    
    args = parser.parse_args()
    
    if args.command == 'execute':
        if args.json:
            execute_workflow_from_json(args.json, args.api)
        elif args.args:
            execute_workflow_by_id(args.args[0], args.api)
        else:
            print("❌ Error: Specify workflow ID or --json file")
            sys.exit(1)
    
    elif args.command == 'list':
        list_workflows(args.api)
    
    elif args.command == 'status':
        if args.args:
            check_status(args.args[0], args.api)
        else:
            print("❌ Error: Specify execution ID")
            sys.exit(1)

if __name__ == '__main__':
    main()
