import os
import yaml
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class ObsidianService:
    """
    Service for saving research reports and chat captures to Obsidian vault as Markdown files with YAML frontmatter.
    """

    def __init__(self, vault_path: Optional[str] = None):
        """
        Initialize the Obsidian service.

        Args:
            vault_path: Path to the Obsidian vault directory. If None, uses environment variable OBSIDIAN_VAULT_PATH.
        """
        self.vault_path = vault_path or os.getenv("OBSIDIAN_VAULT_PATH")
        if not self.vault_path:
            raise ValueError("Obsidian vault path must be provided or set via OBSIDIAN_VAULT_PATH environment variable")

    def set_vault_path(self, path: str):
        """
        Set the Obsidian vault path.

        Args:
            path: Path to the Obsidian vault directory.
        """
        self.vault_path = path

    def save_research_report(self, data: Dict[str, Any]) -> str:
        """
        Save a deep research report to Obsidian.

        Args:
            data: Dictionary containing research data with keys like query, result, etc.

        Returns:
            Path to the saved file.
        """
        try:
            # Create frontmatter
            frontmatter = {
                "title": data.get("query", "Research Report"),
                "date": datetime.now().isoformat(),
                "tags": ["research", "deep-research"],
                "type": "research_report",
                "workflow_type": "deep_research"
            }

            # Create content
            content = f"# {data.get('query', 'Research Report')}\n\n"
            content += f"**Mode:** {data.get('mode', 'comprehensive')}\n\n"
            content += f"**Status:** {data.get('status', 'unknown')}\n\n"

            if "result" in data:
                content += "## Results\n\n"
                content += str(data["result"])
            elif "error" in data:
                content += "## Error\n\n"
                content += data["error"]

            # Save to Research subdirectory
            filename = self._generate_filename(data.get("query", "Research Report"), "research")
            filepath = self._save_to_vault(filename, frontmatter, content, "Research")

            return filepath

        except Exception as e:
            raise Exception(f"Failed to save research report: {str(e)}")

    def save_youtube_analysis(self, data: Dict[str, Any]) -> str:
        """
        Save YouTube transcript analysis to Obsidian.

        Args:
            data: Dictionary containing YouTube analysis data.

        Returns:
            Path to the saved file.
        """
        try:
            # Create frontmatter
            frontmatter = {
                "title": f"YouTube Analysis: {data.get('url', 'Unknown URL')}",
                "date": datetime.now().isoformat(),
                "tags": ["youtube", "transcript", "analysis"],
                "type": "youtube_analysis",
                "workflow_type": "youtube_transcript",
                "url": data.get("url", "")
            }

            # Create content
            content = f"# YouTube Transcript Analysis\n\n"
            content += f"**URL:** {data.get('url', 'N/A')}\n\n"
            content += f"**Status:** {data.get('status', 'unknown')}\n\n"

            if "result" in data:
                content += "## Analysis Results\n\n"
                content += str(data["result"])
            elif "error" in data:
                content += "## Error\n\n"
                content += data["error"]

            # Save to Transcripts subdirectory
            filename = self._generate_filename(f"YouTube_{data.get('url', 'Unknown')}", "youtube")
            filepath = self._save_to_vault(filename, frontmatter, content, "Transcripts")

            return filepath

        except Exception as e:
            raise Exception(f"Failed to save YouTube analysis: {str(e)}")

    def save_chat_capture(self, data: Dict[str, Any]) -> str:
        """
        Save chat capture to Obsidian.

        Args:
            data: Dictionary containing chat data.

        Returns:
            Path to the saved file.
        """
        try:
            # Create frontmatter
            frontmatter = {
                "title": data.get("title", "Chat Capture"),
                "date": datetime.now().isoformat(),
                "tags": ["chat", "capture"],
                "type": "chat_capture",
                "workflow_type": "chat_export"
            }

            # Create content
            content = f"# {data.get('title', 'Chat Capture')}\n\n"
            content += f"**Status:** {data.get('status', 'unknown')}\n\n"

            if "content" in data:
                content += "## Chat Content\n\n"
                content += data["content"]
            elif "error" in data:
                content += "## Error\n\n"
                content += data["error"]

            # Save to Chats subdirectory
            filename = self._generate_filename(data.get("title", "Chat Capture"), "chat")
            filepath = self._save_to_vault(filename, frontmatter, content, "Chats")

            return filepath

        except Exception as e:
            raise Exception(f"Failed to save chat capture: {str(e)}")

    def save_workflow_results(self, workflow_id: str, results: Dict[str, Any]) -> Dict[str, str]:
        """
        Save all workflow results to Obsidian.

        Args:
            workflow_id: ID of the workflow.
            results: Dictionary of task results.

        Returns:
            Dictionary mapping task IDs to saved file paths.
        """
        saved_files = {}

        try:
            for task_id, task_result in results.items():
                if task_result.get("task_type") == "deep_research":
                    filepath = self.save_research_report(task_result)
                    saved_files[task_id] = filepath
                elif task_result.get("task_type") == "youtube_transcript":
                    filepath = self.save_youtube_analysis(task_result)
                    saved_files[task_id] = filepath
                # Add more types as needed

            return saved_files

        except Exception as e:
            raise Exception(f"Failed to save workflow results: {str(e)}")

    def _save_to_vault(self, filename: str, frontmatter: Dict[str, Any], content: str, subdirectory: str = "") -> str:
        """
        Save content to Obsidian vault.

        Args:
            filename: Name of the file (without extension).
            frontmatter: YAML frontmatter dictionary.
            content: Markdown content.
            subdirectory: Subdirectory within vault to save to.

        Returns:
            Full path to the saved file.
        """
        if not self.vault_path:
            raise Exception("Obsidian vault path not configured")

        # Ensure vault directory exists
        vault_path = Path(self.vault_path)
        if not vault_path.exists():
            raise Exception(f"Obsidian vault directory does not exist: {self.vault_path}")

        # Create subdirectory if specified
        if subdirectory:
            target_dir = vault_path / subdirectory
            self._ensure_directory(target_dir)
        else:
            target_dir = vault_path

        # Create full file path
        filepath = target_dir / f"{filename}.md"

        # Create Markdown content with frontmatter
        yaml_frontmatter = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
        full_content = f"---\n{yaml_frontmatter}---\n\n{content}"

        # Write to file
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(full_content)

        return str(filepath)

    def _ensure_directory(self, path: Path):
        """
        Ensure directory exists, create if not.

        Args:
            path: Directory path to ensure.
        """
        path.mkdir(parents=True, exist_ok=True)

    def _generate_filename(self, title: str, content_type: str) -> str:
        """
        Generate a safe filename from title and content type.

        Args:
            title: Base title for the file.
            content_type: Type of content (research, youtube, chat).

        Returns:
            Safe filename string.
        """
        # Sanitize title
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title.replace(' ', '_')

        # Add timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        return f"{content_type}_{safe_title}_{timestamp}"

# Dependency injection provider
def get_obsidian_service() -> ObsidianService:
    """
    Dependency injection provider for ObsidianService.
    """
    return ObsidianService()