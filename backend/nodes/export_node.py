from typing import Dict, Any, Optional, Literal, Union
from pydantic import Field
from .base_node import BaseNode
import json
import yaml
import os
from pathlib import Path


class ExportNode(BaseNode):
    """Node for exporting data in various formats"""

    type: str = "export"

    # Export configuration
    format: Literal["md_yaml", "json", "markdown", "yaml", "csv", "txt"] = Field(
        "json", description="Output format"
    )
    path_key: str = Field(..., description="Key or template for output file path")

    # Input data configuration
    input_key: Optional[str] = Field(None, description="Key in inputs to export")
    include_metadata: bool = Field(default=True, description="Whether to include metadata in export")

    # Formatting options
    pretty_print: bool = Field(default=True, description="Pretty print JSON/YAML output")
    include_timestamp: bool = Field(default=True, description="Include timestamp in filename")

    # CSV specific options
    csv_delimiter: str = Field(default=",", description="CSV delimiter")
    csv_headers: Optional[list] = Field(None, description="CSV headers (auto-detected if None)")

    # Markdown specific options
    md_title: Optional[str] = Field(None, description="Markdown document title")
    md_sections: list = Field(default_factory=list, description="Markdown sections to include")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data export"""
        try:
            # Get data to export
            data = self._get_export_data()
            if not data:
                raise ValueError("No data available for export")

            # Generate output path
            output_path = self._generate_output_path()

            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            # Export data based on format
            result = {}

            if self.format == "json":
                await self._export_json(data, output_path, result)
            elif self.format == "yaml":
                await self._export_yaml(data, output_path, result)
            elif self.format == "md_yaml":
                await self._export_md_yaml(data, output_path, result)
            elif self.format == "markdown":
                await self._export_markdown(data, output_path, result)
            elif self.format == "csv":
                await self._export_csv(data, output_path, result)
            elif self.format == "txt":
                await self._export_txt(data, output_path, result)
            else:
                raise ValueError(f"Unsupported export format: {self.format}")

            # Store export result
            result.update({
                "exported": True,
                "path": str(output_path),
                "format": self.format,
                "size": Path(output_path).stat().st_size if Path(output_path).exists() else 0
            })

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Export failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    def _get_export_data(self) -> Any:
        """Get data to export"""
        if self.input_key and self.input_key in self.inputs:
            return self.inputs[self.input_key]

        # If no specific input key, try to get processed data
        for key, value in self.inputs.items():
            if key.startswith("output") or key in ["data", "result", "content"]:
                return value

        return self.inputs

    def _generate_output_path(self) -> Path:
        """Generate output file path"""
        # Resolve path template variables
        path_template = self.path_key

        # Replace variables in path template
        for key, value in self.inputs.items():
            placeholder = f"{{{key}}}"
            if placeholder in path_template:
                path_template = path_template.replace(placeholder, str(value))

        # Add timestamp if requested
        if self.include_timestamp:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base, ext = os.path.splitext(path_template)
            path_template = f"{base}_{timestamp}{ext}"

        return Path(path_template)

    async def _export_json(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as JSON"""
        with open(path, 'w', encoding='utf-8') as f:
            if self.pretty_print:
                json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                json.dump(data, f, ensure_ascii=False)

    async def _export_yaml(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as YAML"""
        with open(path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)

    async def _export_md_yaml(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as Markdown with YAML frontmatter"""
        with open(path, 'w', encoding='utf-8') as f:
            # Add YAML frontmatter if it's a dict
            if isinstance(data, dict) and 'content' in data:
                # Separate frontmatter from content
                frontmatter = {k: v for k, v in data.items() if k != 'content'}
                content = data.get('content', '')

                f.write("---\n")
                yaml.dump(frontmatter, f, default_flow_style=False, allow_unicode=True)
                f.write("---\n\n")
                f.write(content)
            else:
                # Simple markdown with YAML header
                f.write("---\n")
                if self.include_metadata:
                    metadata = {
                        "exported_at": str(self.created_at),
                        "export_format": self.format
                    }
                    yaml.dump(metadata, f, default_flow_style=False, allow_unicode=True)
                f.write("---\n\n")
                f.write("# Exported Data\n\n")
                f.write(str(data))

    async def _export_markdown(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as Markdown"""
        with open(path, 'w', encoding='utf-8') as f:
            # Write title
            if self.md_title:
                f.write(f"# {self.md_title}\n\n")
            else:
                f.write("# Exported Data\n\n")

            # Write sections if specified
            if self.md_sections and isinstance(data, dict):
                for section in self.md_sections:
                    if section in data:
                        f.write(f"## {section.title()}\n\n")
                        f.write(str(data[section]))
                        f.write("\n\n")
            else:
                # Write all data
                if isinstance(data, dict):
                    for key, value in data.items():
                        f.write(f"## {key.title()}\n\n")
                        f.write(str(value))
                        f.write("\n\n")
                else:
                    f.write(str(data))
                    f.write("\n")

    async def _export_csv(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as CSV"""
        import csv

        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f, delimiter=self.csv_delimiter)

            if isinstance(data, list):
                if data and isinstance(data[0], dict):
                    # List of dicts
                    if not self.csv_headers:
                        self.csv_headers = list(data[0].keys())

                    writer.writerow(self.csv_headers)
                    for row in data:
                        writer.writerow([row.get(h, '') for h in self.csv_headers])
                else:
                    # Simple list
                    if not self.csv_headers:
                        self.csv_headers = ['value']
                    writer.writerow(self.csv_headers)
                    for item in data:
                        writer.writerow([item])
            elif isinstance(data, dict):
                # Dict to CSV
                if not self.csv_headers:
                    self.csv_headers = ['key', 'value']
                writer.writerow(self.csv_headers)
                for key, value in data.items():
                    writer.writerow([key, value])

    async def _export_txt(self, data: Any, path: Path, result: Dict[str, Any]):
        """Export data as plain text"""
        with open(path, 'w', encoding='utf-8') as f:
            if isinstance(data, (dict, list)):
                f.write(str(data))
            else:
                f.write(str(data))