from typing import Dict, Any, Optional, Literal
from pydantic import Field
from .base_node import BaseNode
import aiohttp
import json


class DataSourceNode(BaseNode):
    """Node for fetching data from various sources"""

    type: str = "dataSource"

    # Parameter validation schema
    params_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "source_type": {
                "type": "string",
                "enum": ["url", "file", "api", "database", "mock"],
                "description": "Type of data source"
            },
            "url": {
                "type": "string",
                "format": "uri",
                "description": "URL for HTTP data sources"
            },
            "file_path": {
                "type": "string",
                "description": "File path for file data sources"
            },
            "api_endpoint": {
                "type": "string",
                "format": "uri",
                "description": "API endpoint"
            },
            "database_url": {
                "type": "string",
                "description": "Database connection URL"
            },
            "query": {
                "type": "string",
                "description": "Database query or API parameters"
            },
            "headers": {
                "type": "object",
                "additionalProperties": {"type": "string"},
                "description": "HTTP headers"
            },
            "method": {
                "type": "string",
                "enum": ["GET", "POST", "PUT", "DELETE"],
                "default": "GET",
                "description": "HTTP method"
            },
            "body": {
                "type": "string",
                "description": "Request body for POST/PUT"
            },
            "mock_data": {
                "description": "Mock data for testing"
            },
            "output_key": {
                "type": "string",
                "default": "data",
                "description": "Key for output data"
            }
        },
        "required": ["source_type"],
        "dependencies": {
            "url": {"properties": {"source_type": {"enum": ["url"]}}},
            "file_path": {"properties": {"source_type": {"enum": ["file"]}}},
            "api_endpoint": {"properties": {"source_type": {"enum": ["api"]}}},
            "database_url": {"properties": {"source_type": {"enum": ["database"]}}},
            "mock_data": {"properties": {"source_type": {"enum": ["mock"]}}}
        }
    }

    # Data source properties
    source_type: Literal["url", "file", "api", "database", "mock"] = Field(
        ..., description="Type of data source"
    )
    url: Optional[str] = Field(None, description="URL for HTTP data sources")
    file_path: Optional[str] = Field(None, description="File path for file data sources")
    api_endpoint: Optional[str] = Field(None, description="API endpoint")
    database_url: Optional[str] = Field(None, description="Database connection URL")
    query: Optional[str] = Field(None, description="Database query or API parameters")
    headers: Dict[str, str] = Field(default_factory=dict, description="HTTP headers")
    method: Literal["GET", "POST", "PUT", "DELETE"] = Field(
        default="GET", description="HTTP method"
    )
    body: Optional[str] = Field(None, description="Request body for POST/PUT")
    mock_data: Optional[Any] = Field(None, description="Mock data for testing")

    # Output configuration
    output_key: str = Field(default="data", description="Key for output data")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data source operation"""
        try:
            result = {}

            if self.source_type == "url":
                result[self.output_key] = await self._fetch_url()
            elif self.source_type == "file":
                result[self.output_key] = self._read_file()
            elif self.source_type == "api":
                result[self.output_key] = await self._call_api()
            elif self.source_type == "database":
                result[self.output_key] = await self._query_database()
            elif self.source_type == "mock":
                result[self.output_key] = self.mock_data or {"message": "Mock data"}
            else:
                raise ValueError(f"Unsupported source type: {self.source_type}")

            self.mark_completed(result)
            return result

        except Exception as e:
            error_message = f"Data source failed: {str(e)}"
            self.mark_failed(error_message)
            raise

    async def _fetch_url(self) -> Any:
        """Fetch data from URL"""
        if not self.url:
            raise ValueError("URL is required for url source type")

        async with aiohttp.ClientSession() as session:
            async with session.get(self.url, headers=self.headers) as response:
                if response.status != 200:
                    raise ValueError(f"HTTP {response.status}: {await response.text()}")

                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    return await response.json()
                else:
                    return await response.text()

    async def _query_database(self) -> Any:
        """Query database"""
        if not self.database_url:
            raise ValueError("database_url is required for database source type")

        if not self.query:
            raise ValueError("query is required for database source type")

        try:
            # Basic database support - could be extended for different DB types
            import sqlite3
            import aiosqlite

            if self.database_url.startswith('sqlite:///'):
                # SQLite database
                db_path = self.database_url.replace('sqlite:///', '')
                async with aiosqlite.connect(db_path) as db:
                    async with db.execute(self.query) as cursor:
                        rows = await cursor.fetchall()
                        columns = [desc[0] for desc in cursor.description] if cursor.description else []
                        return [dict(zip(columns, row)) for row in rows]
            else:
                # For other databases, you might need additional drivers
                raise ValueError(f"Unsupported database URL format: {self.database_url}")

        except ImportError:
            raise ValueError("Database dependencies not installed. Install aiosqlite for SQLite support.")
        except Exception as e:
            raise ValueError(f"Database query failed: {str(e)}")

    def _read_file(self) -> Any:
        """Read data from file"""
        if not self.file_path:
            raise ValueError("file_path is required for file source type")

        try:
            with open(self.file_path, 'r') as f:
                content = f.read()

            # Try to parse as JSON
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return content
        except FileNotFoundError:
            raise ValueError(f"File not found: {self.file_path}")

    async def _call_api(self) -> Any:
        """Call API endpoint"""
        if not self.api_endpoint:
            raise ValueError("api_endpoint is required for api source type")

        async with aiohttp.ClientSession() as session:
            request_data = None
            if self.body:
                try:
                    request_data = json.loads(self.body)
                except json.JSONDecodeError:
                    request_data = self.body

            async with session.request(
                self.method,
                self.api_endpoint,
                headers=self.headers,
                json=request_data if isinstance(request_data, dict) else None,
                data=request_data if isinstance(request_data, str) else None
            ) as response:
                if response.status >= 400:
                    raise ValueError(f"API call failed with status {response.status}: {await response.text()}")

                content_type = response.headers.get('content-type', '')
                if 'json' in content_type:
                    return await response.json()
                else:
                    return await response.text()