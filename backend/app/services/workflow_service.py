from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
from .playwright_automation import PlaywrightAutomation
from .obsidian_service import ObsidianService
from ..models.workflow import Workflow, Task, WorkflowExecution

class WorkflowService:
    """
    Service for managing and executing research workflows.
    """

    def __init__(self):
        self.playwright_automation = PlaywrightAutomation()
        self.executions: Dict[str, WorkflowExecution] = {}
        self.obsidian_service = None

        # Initialize Obsidian service if vault path is configured
        try:
            self.obsidian_service = ObsidianService()
        except ValueError:
            print("Obsidian vault path not configured. Obsidian integration will be skipped.")
        except Exception as e:
            print(f"Failed to initialize Obsidian service: {str(e)}")

    async def execute_workflow(self, workflow: Workflow) -> str:
        """
        Executes a workflow and returns the execution ID.

        Args:
            workflow: The workflow to execute.

        Returns:
            The execution ID for tracking the workflow status.
        """
        execution_id = str(uuid.uuid4())
        execution = WorkflowExecution(
            id=execution_id,
            workflow_id=workflow.id,
            status="running",
            started_at=datetime.now()
        )
        self.executions[execution_id] = execution

        try:
            # Execute tasks in the workflow
            results = await self._execute_tasks(workflow.tasks)

            # Save results to Obsidian if service is available
            obsidian_saved_files = {}
            if self.obsidian_service:
                try:
                    obsidian_saved_files = self.obsidian_service.save_workflow_results(execution_id, results)
                    print(f"Saved workflow results to Obsidian: {obsidian_saved_files}")
                except Exception as obsidian_error:
                    print(f"Failed to save workflow results to Obsidian: {str(obsidian_error)}")

            # Update execution with results
            execution.status = "completed"
            execution.completed_at = datetime.now()
            execution.results = {
                "task_results": results,
                "obsidian_saved_files": obsidian_saved_files
            }

        except Exception as e:
            execution.status = "failed"
            execution.completed_at = datetime.now()
            execution.results = {"error": str(e)}

        return execution_id

    async def _execute_tasks(self, tasks: List[Task]) -> Dict[str, Any]:
        """
        Executes a list of tasks and returns the combined results.

        Args:
            tasks: List of tasks to execute.

        Returns:
            Dictionary containing the results of all tasks.
        """
        results = {}

        for task in tasks:
            if task.type == "deep_research":
                task_result = await self._execute_deep_research_task(task)
                results[task.id] = task_result
            elif task.type == "youtube_transcript":
                # Placeholder for YouTube transcript task
                task_result = await self._execute_youtube_transcript_task(task)
                results[task.id] = task_result
            else:
                results[task.id] = {"error": f"Unknown task type: {task.type}"}

        return results

    async def _execute_deep_research_task(self, task: Task) -> Dict[str, Any]:
        """
        Executes a Deep Research task using Playwright automation.

        Args:
            task: The deep research task to execute.

        Returns:
            Dictionary containing the research results.
        """
        try:
            # Launch browser if not already launched
            if not self.playwright_automation.browser:
                await self.playwright_automation.launch_browser()

            # Navigate to Gemini Canvas
            await self.playwright_automation.navigate_to_gemini_canvas()

            # Extract parameters
            query = task.parameters.get("query", "")
            mode = task.parameters.get("mode", "comprehensive")

            # Perform the research
            result = await self.playwright_automation.perform_deep_research(query, mode)

            return {
                "task_type": "deep_research",
                "query": query,
                "mode": mode,
                "result": result,
                "status": "success"
            }

        except Exception as e:
            return {
                "task_type": "deep_research",
                "error": str(e),
                "status": "failed"
            }

    async def _execute_youtube_transcript_task(self, task: Task) -> Dict[str, Any]:
        """
        Executes a YouTube transcript analysis task using Playwright automation.

        Args:
            task: The YouTube transcript task to execute.

        Returns:
            Dictionary containing the transcript analysis results.
        """
        try:
            # Launch browser if not already launched
            if not self.playwright_automation.browser:
                await self.playwright_automation.launch_browser()

            # Extract parameters
            url = task.parameters.get("url", "")
            if not url:
                return {
                    "task_type": "youtube_transcript",
                    "error": "No YouTube URL provided",
                    "status": "failed"
                }

            # Perform the transcript analysis
            result = await self.playwright_automation.perform_youtube_transcript_analysis(url)

            return {
                "task_type": "youtube_transcript",
                "url": url,
                "result": result,
                "status": "success"
            }

        except Exception as e:
            return {
                "task_type": "youtube_transcript",
                "error": str(e),
                "status": "failed"
            }

    def get_execution_status(self, execution_id: str) -> Optional[WorkflowExecution]:
        """
        Gets the status of a workflow execution.

        Args:
            execution_id: The execution ID to check.

        Returns:
            The WorkflowExecution object if found, None otherwise.
        """
        return self.executions.get(execution_id)

    async def cleanup(self):
        """
        Cleans up resources, including closing the browser.
        """
        if self.playwright_automation:
            await self.playwright_automation.close_browser()

# Dependency injection provider
def get_workflow_service() -> WorkflowService:
    """
    Dependency injection provider for WorkflowService.
    """
    return WorkflowService()