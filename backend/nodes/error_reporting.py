"""
Comprehensive Error Reporting and Logging System

This module provides centralized error reporting, logging, and monitoring
for the node-based workflow system.
"""

import logging
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
import traceback

# Removed circular imports - Any, ErrorCategory, ErrorSeverity will be imported when needed


class LogLevel(Enum):
    """Log levels for error reporting"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ReportFormat(Enum):
    """Formats for error reports"""
    JSON = "json"
    TEXT = "text"
    HTML = "html"
    XML = "xml"


@dataclass
class ErrorReport:
    """Comprehensive error report"""
    report_id: str
    timestamp: datetime
    workflow_id: Optional[str] = None
    node_id: Optional[str] = None
    session_id: Optional[str] = None
    errors: List[Any] = field(default_factory=list)  # List[Any] - imported locally to avoid circular import
    summary: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "timestamp": self.timestamp.isoformat(),
            "workflow_id": self.workflow_id,
            "node_id": self.node_id,
            "session_id": self.session_id,
            "errors": [error.to_dict() for error in self.errors],
            "summary": self.summary,
            "context": self.context,
            "recommendations": self.recommendations
        }


class ErrorLogger:
    """Enhanced error logger with multiple outputs"""

    def __init__(self, log_file: Optional[str] = None, log_level: LogLevel = LogLevel.INFO):
        self.log_file = log_file or "error_logs.jsonl"
        self.log_level = log_level
        self._setup_logger()
        self._error_buffer: List[Any] = []
        self._buffer_size = 100

    def _setup_logger(self):
        """Setup Python logger"""
        self.logger = logging.getLogger("node_error_logger")
        self.logger.setLevel(getattr(logging, self.log_level.value))

        # Remove existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, self.log_level.value))
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

        # File handler if specified
        if self.log_file:
            file_handler = logging.FileHandler(self.log_file)
            file_handler.setLevel(getattr(logging, self.log_level.value))
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

    def log_error(self, error: Any, context: Optional[Dict[str, Any]] = None):  # Any - imported locally to avoid circular import
        """Log a single error"""
        # Add to buffer
        self._error_buffer.append(error)
        if len(self._error_buffer) >= self._buffer_size:
            self._flush_buffer()

        # Log to Python logger
        log_message = f"Node {error.node_id} error: {error.message}"
        log_data = {
            "node_id": error.node_id,
            "category": error.category.value,
            "severity": error.severity.value,
            "code": error.code,
            "context": context
        }

        if error.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(log_message, extra=log_data)
        elif error.severity == ErrorSeverity.HIGH:
            self.logger.error(log_message, extra=log_data)
        elif error.severity == ErrorSeverity.MEDIUM:
            self.logger.warning(log_message, extra=log_data)
        else:
            self.logger.info(log_message, extra=log_data)

    def log_error_batch(self, errors: List[Any], context: Optional[Dict[str, Any]] = None):  # List[Any] - imported locally to avoid circular import
        """Log multiple errors"""
        for error in errors:
            self.log_error(error, context)

    def _flush_buffer(self):
        """Flush error buffer to persistent storage"""
        if not self._error_buffer:
            return

        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                for error in self._error_buffer:
                    f.write(json.dumps(error.to_dict(), ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Failed to flush error buffer: {str(e)}")

        self._error_buffer.clear()

    def get_recent_errors(
        self,
        node_id: Optional[str] = None,
        category: Optional[Any] = None,  # ErrorCategory - imported locally to avoid circular import
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Any]:  # List[Any] - imported locally to avoid circular import
        """Get recent errors from log file"""
        errors = []

        try:
            if not Path(self.log_file).exists():
                return errors

            with open(self.log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue

                    try:
                        error_data = json.loads(line)
                        error = Any(
                            node_id=error_data["node_id"],
                            node_type=error_data["node_type"],
                            category=ErrorCategory(error_data["category"]),
                            severity=ErrorSeverity(error_data["severity"]),
                            message=error_data["message"],
                            details=error_data.get("details"),
                            timestamp=datetime.fromisoformat(error_data["timestamp"]),
                            attempt_number=error_data.get("attempt_number", 1),
                            max_attempts=error_data.get("max_attempts", 3),
                            recoverable=error_data.get("recoverable", True),
                            context=error_data.get("context")
                        )

                        # Apply filters
                        if node_id and error.node_id != node_id:
                            continue
                        if category and error.category != category:
                            continue
                        if since and error.timestamp < since:
                            continue

                        errors.append(error)
                        if len(errors) >= limit:
                            break

                    except (json.JSONDecodeError, KeyError, ValueError) as e:
                        self.logger.warning(f"Failed to parse error log line: {str(e)}")
                        continue

        except Exception as e:
            self.logger.error(f"Failed to read error logs: {str(e)}")

        return errors


class ErrorReporter:
    """Generates comprehensive error reports"""

    def __init__(self, logger: ErrorLogger):
        self.logger = logger
        self._report_templates: Dict[str, Callable] = {
            "workflow_failure": self._generate_workflow_failure_report,
            "node_error_summary": self._generate_node_error_summary,
            "system_health": self._generate_system_health_report,
        }

    def generate_report(
        self,
        report_type: str,
        workflow_id: Optional[str] = None,
        node_id: Optional[str] = None,
        session_id: Optional[str] = None,
        time_range: Optional[timedelta] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorReport:
        """Generate an error report"""
        report_id = f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        timestamp = datetime.now()

        # Get relevant errors
        since = timestamp - (time_range or timedelta(hours=24))
        errors = self.logger.get_recent_errors(
            node_id=node_id,
            since=since,
            limit=1000
        )

        # Generate report using template
        if report_type in self._report_templates:
            report = self._report_templates[report_type](
                report_id, timestamp, workflow_id, node_id, session_id, errors, context
            )
        else:
            report = self._generate_generic_report(
                report_id, timestamp, workflow_id, node_id, session_id, errors, context
            )

        return report

    def _generate_workflow_failure_report(
        self,
        report_id: str,
        timestamp: datetime,
        workflow_id: Optional[str],
        node_id: Optional[str],
        session_id: Optional[str],
        errors: List[Any],  # List[Any] - imported locally to avoid circular import
        context: Optional[Dict[str, Any]]
    ) -> Any:  # ErrorReport - imported locally to avoid circular import
        """Generate workflow failure report"""
        # Filter errors for this workflow
        workflow_errors = [e for e in errors if not workflow_id or e.context.get("workflow_id") == workflow_id]

        # Calculate summary
        summary = {
            "total_errors": len(workflow_errors),
            "error_categories": {},
            "failed_nodes": set(),
            "severity_breakdown": {},
            "time_span": {
                "start": min((e.timestamp for e in workflow_errors), default=timestamp).isoformat(),
                "end": max((e.timestamp for e in workflow_errors), default=timestamp).isoformat()
            }
        }

        for error in workflow_errors:
            # Category breakdown
            cat = error.category.value
            summary["error_categories"][cat] = summary["error_categories"].get(cat, 0) + 1

            # Failed nodes
            if error.node_id:
                summary["failed_nodes"].add(error.node_id)

            # Severity breakdown
            sev = error.severity.value
            summary["severity_breakdown"][sev] = summary["severity_breakdown"].get(sev, 0) + 1

        summary["failed_nodes"] = list(summary["failed_nodes"])

        # Generate recommendations
        recommendations = self._generate_workflow_recommendations(workflow_errors, summary)

        return ErrorReport(
            report_id=report_id,
            timestamp=timestamp,
            workflow_id=workflow_id,
            session_id=session_id,
            errors=workflow_errors,
            summary=summary,
            context=context or {},
            recommendations=recommendations
        )

    def _generate_node_error_summary(
        self,
        report_id: str,
        timestamp: datetime,
        workflow_id: Optional[str],
        node_id: Optional[str],
        session_id: Optional[str],
        errors: List[Any],  # List[Any] - imported locally to avoid circular import
        context: Optional[Dict[str, Any]]
    ) -> Any:  # ErrorReport - imported locally to avoid circular import
        """Generate node error summary report"""
        # Filter errors for this node
        node_errors = [e for e in errors if e.node_id == node_id]

        summary = {
            "node_id": node_id,
            "total_errors": len(node_errors),
            "error_patterns": self._analyze_error_patterns(node_errors),
            "recovery_effectiveness": self._calculate_recovery_effectiveness(node_errors),
            "time_span": {
                "start": min((e.timestamp for e in node_errors), default=timestamp).isoformat(),
                "end": max((e.timestamp for e in node_errors), default=timestamp).isoformat()
            }
        }

        recommendations = self._generate_node_recommendations(node_errors, summary)

        return ErrorReport(
            report_id=report_id,
            timestamp=timestamp,
            workflow_id=workflow_id,
            node_id=node_id,
            session_id=session_id,
            errors=node_errors,
            summary=summary,
            context=context or {},
            recommendations=recommendations
        )

    def _generate_system_health_report(
        self,
        report_id: str,
        timestamp: datetime,
        workflow_id: Optional[str],
        node_id: Optional[str],
        session_id: Optional[str],
        errors: List[Any],  # List[Any] - imported locally to avoid circular import
        context: Optional[Dict[str, Any]]
    ) -> ErrorReport:
        """Generate system health report"""
        summary = {
            "total_errors": len(errors),
            "system_health_score": self._calculate_health_score(errors),
            "error_trends": self._analyze_error_trends(errors),
            "most_problematic_nodes": self._identify_problematic_nodes(errors),
            "most_common_errors": self._identify_common_errors(errors),
            "time_span": {
                "start": min((e.timestamp for e in errors), default=timestamp).isoformat(),
                "end": max((e.timestamp for e in errors), default=timestamp).isoformat()
            }
        }

        recommendations = self._generate_system_recommendations(errors, summary)

        return ErrorReport(
            report_id=report_id,
            timestamp=timestamp,
            session_id=session_id,
            errors=errors[-100:],  # Last 100 errors for brevity
            summary=summary,
            context=context or {},
            recommendations=recommendations
        )

    def _generate_generic_report(
        self,
        report_id: str,
        timestamp: datetime,
        workflow_id: Optional[str],
        node_id: Optional[str],
        session_id: Optional[str],
        errors: List[Any],  # List[Any] - imported locally to avoid circular import
        context: Optional[Dict[str, Any]]
    ) -> ErrorReport:
        """Generate generic error report"""
        summary = {
            "total_errors": len(errors),
            "error_categories": {},
            "severity_breakdown": {}
        }

        for error in errors:
            cat = error.category.value
            sev = error.severity.value
            summary["error_categories"][cat] = summary["error_categories"].get(cat, 0) + 1
            summary["severity_breakdown"][sev] = summary["severity_breakdown"].get(sev, 0) + 1

        return ErrorReport(
            report_id=report_id,
            timestamp=timestamp,
            workflow_id=workflow_id,
            node_id=node_id,
            session_id=session_id,
            errors=errors,
            summary=summary,
            context=context or {},
            recommendations=["Review error logs for patterns and root causes"]
        )

    def _analyze_error_patterns(self, errors: List[Any]) -> Dict[str, Any]:
        """Analyze patterns in errors"""
        if not errors:
            return {}

        patterns = {
            "most_common_category": None,
            "most_common_severity": None,
            "error_frequency": {},
            "temporal_patterns": {}
        }

        # Category frequency
        categories = {}
        severities = {}

        for error in errors:
            cat = error.category.value
            sev = error.severity.value

            categories[cat] = categories.get(cat, 0) + 1
            severities[sev] = severities.get(sev, 0) + 1

        patterns["most_common_category"] = max(categories.keys(), key=lambda k: categories[k]) if categories else None
        patterns["most_common_severity"] = max(severities.keys(), key=lambda k: severities[k]) if severities else None
        patterns["error_frequency"] = {"categories": categories, "severities": severities}

        return patterns

    def _calculate_recovery_effectiveness(self, errors: List[Any]) -> Dict[str, Any]:
        """Calculate how effective error recovery has been"""
        if not errors:
            return {}

        total_errors = len(errors)
        recovered_errors = len([e for e in errors if e.context and e.context.get("recovered", False)])
        fatal_errors = len([e for e in errors if not e.recoverable])

        return {
            "recovery_rate": recovered_errors / total_errors if total_errors > 0 else 0,
            "fatal_error_rate": fatal_errors / total_errors if total_errors > 0 else 0,
            "average_attempts": sum(e.attempt_number for e in errors) / total_errors if total_errors > 0 else 0
        }

    def _calculate_health_score(self, errors: List[Any]) -> float:
        """Calculate system health score (0-100, higher is better)"""
        if not errors:
            return 100.0

        # Weight errors by severity
        severity_weights = {
            ErrorSeverity.LOW: 1,
            ErrorSeverity.MEDIUM: 2,
            ErrorSeverity.HIGH: 3,
            ErrorSeverity.CRITICAL: 4
        }

        total_weight = 0
        time_span_hours = 24  # Assume 24-hour window

        for error in errors:
            weight = severity_weights.get(error.severity, 1)
            # More recent errors have higher weight
            hours_old = (datetime.now() - error.timestamp).total_seconds() / 3600
            recency_factor = max(0.1, 1 - (hours_old / time_span_hours))
            total_weight += weight * recency_factor

        # Normalize to 0-100 scale (arbitrary scaling)
        health_score = max(0, 100 - (total_weight * 2))
        return round(health_score, 2)

    def _analyze_error_trends(self, errors: List[Any]) -> Dict[str, Any]:
        """Analyze error trends over time"""
        if len(errors) < 2:
            return {"trend": "insufficient_data"}

        # Sort by timestamp
        sorted_errors = sorted(errors, key=lambda e: e.timestamp)

        # Simple trend analysis
        first_half = sorted_errors[:len(sorted_errors)//2]
        second_half = sorted_errors[len(sorted_errors)//2:]

        first_half_rate = len(first_half) / max(1, (sorted_errors[len(sorted_errors)//2 - 1].timestamp - sorted_errors[0].timestamp).total_seconds() / 3600)
        second_half_rate = len(second_half) / max(1, (sorted_errors[-1].timestamp - sorted_errors[len(sorted_errors)//2].timestamp).total_seconds() / 3600)

        if second_half_rate > first_half_rate * 1.5:
            trend = "increasing"
        elif second_half_rate < first_half_rate * 0.7:
            trend = "decreasing"
        else:
            trend = "stable"

        return {
            "trend": trend,
            "first_half_rate": round(first_half_rate, 2),
            "second_half_rate": round(second_half_rate, 2)
        }

    def _identify_problematic_nodes(self, errors: List[Any]) -> List[Dict[str, Any]]:
        """Identify nodes with the most errors"""
        node_errors = {}
        for error in errors:
            if error.node_id:
                if error.node_id not in node_errors:
                    node_errors[error.node_id] = []
                node_errors[error.node_id].append(error)

        # Sort by error count
        sorted_nodes = sorted(
            node_errors.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )[:10]  # Top 10

        return [
            {
                "node_id": node_id,
                "error_count": len(node_errors),
                "most_common_error": max(
                    (e.category.value for e in node_errors),
                    key=lambda c: sum(1 for e in node_errors if e.category.value == c)
                ) if node_errors else None
            }
            for node_id, node_errors in sorted_nodes
        ]

    def _identify_common_errors(self, errors: List[Any]) -> List[Dict[str, Any]]:
        """Identify most common error types"""
        error_counts = {}
        for error in errors:
            key = f"{error.category.value}:{error.code}"
            if key not in error_counts:
                error_counts[key] = {"count": 0, "examples": []}
            error_counts[key]["count"] += 1
            if len(error_counts[key]["examples"]) < 3:
                error_counts[key]["examples"].append(error.message)

        # Sort by frequency
        sorted_errors = sorted(
            error_counts.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:10]  # Top 10

        return [
            {
                "error_type": error_type,
                "count": data["count"],
                "examples": data["examples"]
            }
            for error_type, data in sorted_errors
        ]

    def _generate_workflow_recommendations(self, errors: List[Any], summary: Dict[str, Any]) -> List[str]:  # List[Any] - imported locally to avoid circular import
        """Generate recommendations for workflow issues"""
        recommendations = []

        if summary.get("total_errors", 0) > 10:
            recommendations.append("Consider implementing circuit breaker patterns for frequently failing nodes")

        failed_nodes = summary.get("failed_nodes", [])
        if len(failed_nodes) > len(errors) * 0.5:
            recommendations.append("High failure rate detected - review workflow design and node dependencies")

        if summary.get("error_categories", {}).get("VALIDATION", 0) > summary.get("total_errors", 1) * 0.3:
            recommendations.append("Many validation errors - review input data quality and validation rules")

        return recommendations

    def _generate_node_recommendations(self, errors: List[Any], summary: Dict[str, Any]) -> List[str]:  # List[Any] - imported locally to avoid circular import
        """Generate recommendations for node issues"""
        recommendations = []

        recovery_effectiveness = summary.get("recovery_effectiveness", {})
        if recovery_effectiveness.get("recovery_rate", 0) < 0.5:
            recommendations.append("Low recovery rate - consider improving error handling strategies")

        if recovery_effectiveness.get("fatal_error_rate", 0) > 0.2:
            recommendations.append("High fatal error rate - review node implementation for robustness")

        error_patterns = summary.get("error_patterns", {})
        if error_patterns.get("most_common_category") == "TIMEOUT":
            recommendations.append("Frequent timeouts - consider increasing timeout values or optimizing node performance")

        return recommendations

    def _generate_system_recommendations(self, errors: List[Any], summary: Dict[str, Any]) -> List[str]:  # List[Any] - imported locally to avoid circular import
        """Generate recommendations for system health"""
        recommendations = []

        health_score = summary.get("system_health_score", 100)
        if health_score < 50:
            recommendations.append("Critical: System health is poor - immediate attention required")

        error_trends = summary.get("error_trends", {})
        if error_trends.get("trend") == "increasing":
            recommendations.append("Error rate is increasing - investigate recent changes or external factors")

        problematic_nodes = summary.get("most_problematic_nodes", [])
        if problematic_nodes:
            top_node = problematic_nodes[0]
            recommendations.append(f"Focus on node {top_node['node_id']} - highest error count ({top_node['error_count']})")

        return recommendations

    def export_report(self, report: ErrorReport, format: ReportFormat = ReportFormat.JSON, file_path: Optional[str] = None) -> str:
        """Export error report in specified format"""
        if format == ReportFormat.JSON:
            content = json.dumps(report.to_dict(), indent=2, ensure_ascii=False)
        elif format == ReportFormat.TEXT:
            content = self._format_report_text(report)
        elif format == ReportFormat.HTML:
            content = self._format_report_html(report)
        else:
            raise ValueError(f"Unsupported format: {format}")

        if file_path:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

        return content

    def _format_report_text(self, report: ErrorReport) -> str:
        """Format report as text"""
        lines = [
            f"Error Report: {report.report_id}",
            f"Timestamp: {report.timestamp.isoformat()}",
            f"Workflow: {report.workflow_id or 'N/A'}",
            f"Node: {report.node_id or 'N/A'}",
            f"Session: {report.session_id or 'N/A'}",
            "",
            "Summary:",
        ]

        for key, value in report.summary.items():
            lines.append(f"  {key}: {value}")

        lines.extend(["", "Errors:"])
        for error in report.errors:
            lines.extend([
                f"  - {error.node_id}: {error.message} ({error.category.value})",
                f"    Severity: {error.severity.value}, Attempts: {error.attempt_number}/{error.max_attempts}"
            ])

        if report.recommendations:
            lines.extend(["", "Recommendations:"])
            for rec in report.recommendations:
                lines.append(f"  - {rec}")

        return "\n".join(lines)

    def _format_report_html(self, report: ErrorReport) -> str:
        """Format report as HTML"""
        html = f"""
        <html>
        <head><title>Error Report: {report.report_id}</title></head>
        <body>
        <h1>Error Report: {report.report_id}</h1>
        <p><strong>Timestamp:</strong> {report.timestamp.isoformat()}</p>
        <p><strong>Workflow:</strong> {report.workflow_id or 'N/A'}</p>
        <p><strong>Node:</strong> {report.node_id or 'N/A'}</p>

        <h2>Summary</h2>
        <ul>
        {"".join(f"<li><strong>{key}:</strong> {value}</li>" for key, value in report.summary.items())}
        </ul>

        <h2>Errors ({len(report.errors)})</h2>
        <ul>
        {"".join(f"<li><strong>{error.node_id}:</strong> {error.message} <em>({error.category.value})</em></li>" for error in report.errors)}
        </ul>

        {"<h2>Recommendations</h2><ul>" + "".join(f"<li>{rec}</li>" for rec in report.recommendations) + "</ul>" if report.recommendations else ""}
        </body>
        </html>
        """
        return html


# Global instances
error_logger = ErrorLogger()
error_reporter = ErrorReporter(error_logger)


# Convenience functions
def log_execution_error(error: Any, context: Optional[Dict[str, Any]] = None):
    """Log an execution error"""
    error_logger.log_error(error, context)


def generate_error_report(
    report_type: str,
    workflow_id: Optional[str] = None,
    node_id: Optional[str] = None,
    session_id: Optional[str] = None,
    time_range: Optional[timedelta] = None,
    context: Optional[Dict[str, Any]] = None
) -> ErrorReport:
    """Generate an error report"""
    return error_reporter.generate_report(
        report_type, workflow_id, node_id, session_id, time_range, context
    )


def export_error_report(
    report: ErrorReport,
    format: ReportFormat = ReportFormat.JSON,
    file_path: Optional[str] = None
) -> str:
    """Export an error report"""
    return error_reporter.export_report(report, format, file_path)