"""
Real-time System Monitoring Service
Provides comprehensive system health and performance monitoring
"""

import asyncio
import json
import time
import psutil
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from fastapi import WebSocket, WebSocketDisconnect
import aiohttp
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class SystemMetrics:
    timestamp: str
    backend: Dict[str, Any]
    frontend: Dict[str, Any]
    workflows: Dict[str, Any]
    extension: Dict[str, Any]

@dataclass
class Alert:
    id: str
    type: str  # error, warning, info
    message: str
    timestamp: str
    component: str

class MonitoringService:
    """Comprehensive system monitoring service"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.metrics_history: List[SystemMetrics] = []
        self.alerts: List[Alert] = []
        self.monitoring_active = False
        self.last_metrics: Optional[SystemMetrics] = None
        
        # Thresholds for alerts
        self.thresholds = {
            'cpu_warning': 70,
            'cpu_critical': 90,
            'memory_warning': 80,
            'memory_critical': 95,
            'response_time_warning': 1000,
            'response_time_critical': 5000,
            'error_rate_warning': 5,
            'error_rate_critical': 10
        }
        
        # Counters
        self.workflow_executions = 0
        self.successful_executions = 0
        self.failed_executions = 0
        self.execution_times = []
        
    async def start_monitoring(self):
        """Start the monitoring service"""
        self.monitoring_active = True
        logger.info("Monitoring service started")
        
        # Start monitoring loop
        asyncio.create_task(self.monitoring_loop())
        
    async def stop_monitoring(self):
        """Stop the monitoring service"""
        self.monitoring_active = False
        logger.info("Monitoring service stopped")
        
    async def monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect metrics
                metrics = await self.collect_metrics()
                
                # Store metrics
                self.last_metrics = metrics
                self.metrics_history.append(metrics)
                
                # Keep only last 100 metrics
                if len(self.metrics_history) > 100:
                    self.metrics_history.pop(0)
                
                # Check for alerts
                await self.check_alerts(metrics)
                
                # Broadcast to connected clients
                await self.broadcast_metrics(metrics)
                
                # Wait before next collection
                await asyncio.sleep(5)  # Collect every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(10)  # Wait longer on error
                
    async def collect_metrics(self) -> SystemMetrics:
        """Collect comprehensive system metrics"""
        timestamp = datetime.now().isoformat()
        
        # Backend metrics
        backend_metrics = await self.collect_backend_metrics()
        
        # Frontend metrics
        frontend_metrics = await self.collect_frontend_metrics()
        
        # Workflow metrics
        workflow_metrics = self.collect_workflow_metrics()
        
        # Extension metrics
        extension_metrics = self.collect_extension_metrics()
        
        return SystemMetrics(
            timestamp=timestamp,
            backend=backend_metrics,
            frontend=frontend_metrics,
            workflows=workflow_metrics,
            extension=extension_metrics
        )
        
    async def collect_backend_metrics(self) -> Dict[str, Any]:
        """Collect backend-specific metrics"""
        try:
            # System resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Test backend response time
            start_time = time.time()
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get('http://localhost:8000/health', timeout=5) as response:
                        response_time = (time.time() - start_time) * 1000
                        status = 'healthy' if response.status == 200 else 'degraded'
            except Exception:
                response_time = 5000
                status = 'down'
            
            # Active connections (simplified)
            active_connections = len(self.active_connections)
            
            return {
                'status': status,
                'responseTime': round(response_time),
                'activeConnections': active_connections,
                'memoryUsage': round(memory.percent, 1),
                'cpuUsage': round(cpu_percent, 1)
            }
            
        except Exception as e:
            logger.error(f"Error collecting backend metrics: {e}")
            return {
                'status': 'down',
                'responseTime': 0,
                'activeConnections': 0,
                'memoryUsage': 0,
                'cpuUsage': 0
            }
            
    async def collect_frontend_metrics(self) -> Dict[str, Any]:
        """Collect frontend-specific metrics"""
        try:
            # Test frontend availability
            start_time = time.time()
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get('http://localhost:3000', timeout=5) as response:
                        load_time = (time.time() - start_time) * 1000
                        status = 'healthy' if response.status == 200 else 'degraded'
            except Exception:
                load_time = 5000
                status = 'down'
            
            # Bundle size (check if dist exists)
            bundle_size = "Unknown"
            try:
                dist_path = Path("frontend/dist")
                if dist_path.exists():
                    total_size = sum(f.stat().st_size for f in dist_path.rglob('*') if f.is_file())
                    bundle_size = f"{total_size // 1024}KB"
            except Exception:
                pass
            
            return {
                'status': status,
                'loadTime': round(load_time),
                'bundleSize': bundle_size,
                'activeUsers': len(self.active_connections)  # Simplified
            }
            
        except Exception as e:
            logger.error(f"Error collecting frontend metrics: {e}")
            return {
                'status': 'down',
                'loadTime': 0,
                'bundleSize': 'Unknown',
                'activeUsers': 0
            }
            
    def collect_workflow_metrics(self) -> Dict[str, Any]:
        """Collect workflow execution metrics"""
        try:
            success_rate = 0
            if self.workflow_executions > 0:
                success_rate = round((self.successful_executions / self.workflow_executions) * 100, 1)
            
            avg_execution_time = 0
            if self.execution_times:
                avg_execution_time = round(sum(self.execution_times) / len(self.execution_times), 1)
            
            return {
                'totalExecutions': self.workflow_executions,
                'successRate': success_rate,
                'averageExecutionTime': avg_execution_time,
                'activeExecutions': 0  # Would need to track active executions
            }
            
        except Exception as e:
            logger.error(f"Error collecting workflow metrics: {e}")
            return {
                'totalExecutions': 0,
                'successRate': 0,
                'averageExecutionTime': 0,
                'activeExecutions': 0
            }
            
    def collect_extension_metrics(self) -> Dict[str, Any]:
        """Collect extension-specific metrics"""
        try:
            # These would be collected from extension usage data
            return {
                'activeInstalls': 1,  # Placeholder
                'captureRate': 95.5,  # Placeholder
                'errorRate': 0.5  # Placeholder
            }
            
        except Exception as e:
            logger.error(f"Error collecting extension metrics: {e}")
            return {
                'activeInstalls': 0,
                'captureRate': 0,
                'errorRate': 0
            }
            
    async def check_alerts(self, metrics: SystemMetrics):
        """Check metrics against thresholds and generate alerts"""
        try:
            current_time = datetime.now().isoformat()
            
            # CPU usage alerts
            cpu_usage = metrics.backend['cpuUsage']
            if cpu_usage > self.thresholds['cpu_critical']:
                await self.add_alert('error', f'Critical CPU usage: {cpu_usage}%', 'backend')
            elif cpu_usage > self.thresholds['cpu_warning']:
                await self.add_alert('warning', f'High CPU usage: {cpu_usage}%', 'backend')
            
            # Memory usage alerts
            memory_usage = metrics.backend['memoryUsage']
            if memory_usage > self.thresholds['memory_critical']:
                await self.add_alert('error', f'Critical memory usage: {memory_usage}%', 'backend')
            elif memory_usage > self.thresholds['memory_warning']:
                await self.add_alert('warning', f'High memory usage: {memory_usage}%', 'backend')
            
            # Response time alerts
            response_time = metrics.backend['responseTime']
            if response_time > self.thresholds['response_time_critical']:
                await self.add_alert('error', f'Critical response time: {response_time}ms', 'backend')
            elif response_time > self.thresholds['response_time_warning']:
                await self.add_alert('warning', f'Slow response time: {response_time}ms', 'backend')
            
            # Service status alerts
            if metrics.backend['status'] == 'down':
                await self.add_alert('error', 'Backend service is down', 'backend')
            elif metrics.backend['status'] == 'degraded':
                await self.add_alert('warning', 'Backend service is degraded', 'backend')
                
            if metrics.frontend['status'] == 'down':
                await self.add_alert('error', 'Frontend service is down', 'frontend')
            elif metrics.frontend['status'] == 'degraded':
                await self.add_alert('warning', 'Frontend service is degraded', 'frontend')
                
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")
            
    async def add_alert(self, alert_type: str, message: str, component: str):
        """Add a new alert"""
        alert = Alert(
            id=f"alert-{int(time.time())}-{len(self.alerts)}",
            type=alert_type,
            message=message,
            timestamp=datetime.now().strftime('%H:%M:%S'),
            component=component
        )
        
        self.alerts.append(alert)
        
        # Keep only last 50 alerts
        if len(self.alerts) > 50:
            self.alerts.pop(0)
        
        # Broadcast alert to connected clients
        await self.broadcast_alert(alert)
        
        logger.info(f"Alert generated: {alert_type} - {message} ({component})")
        
    async def connect_websocket(self, websocket: WebSocket):
        """Connect a new WebSocket client"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Send current metrics immediately
        if self.last_metrics:
            await websocket.send_text(json.dumps({
                'type': 'metrics',
                'data': asdict(self.last_metrics)
            }))
        
        # Send recent alerts
        for alert in self.alerts[-10:]:  # Last 10 alerts
            await websocket.send_text(json.dumps({
                'type': 'alert',
                'data': asdict(alert)
            }))
        
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")
        
    async def disconnect_websocket(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")
        
    async def broadcast_metrics(self, metrics: SystemMetrics):
        """Broadcast metrics to all connected clients"""
        if not self.active_connections:
            return
            
        message = json.dumps({
            'type': 'metrics',
            'data': asdict(metrics)
        })
        
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            await self.disconnect_websocket(websocket)
            
    async def broadcast_alert(self, alert: Alert):
        """Broadcast alert to all connected clients"""
        if not self.active_connections:
            return
            
        message = json.dumps({
            'type': 'alert',
            'data': asdict(alert)
        })
        
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting alert to WebSocket: {e}")
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            await self.disconnect_websocket(websocket)
            
    def record_workflow_execution(self, success: bool, execution_time: float):
        """Record workflow execution metrics"""
        self.workflow_executions += 1
        if success:
            self.successful_executions += 1
        else:
            self.failed_executions += 1
            
        self.execution_times.append(execution_time)
        
        # Keep only last 100 execution times
        if len(self.execution_times) > 100:
            self.execution_times.pop(0)
            
    def get_current_metrics(self) -> Optional[Dict[str, Any]]:
        """Get current metrics as dictionary"""
        if self.last_metrics:
            return asdict(self.last_metrics)
        return None
        
    def get_metrics_history(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get metrics history for the last N minutes"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        filtered_metrics = []
        for metrics in self.metrics_history:
            metrics_time = datetime.fromisoformat(metrics.timestamp)
            if metrics_time >= cutoff_time:
                filtered_metrics.append(asdict(metrics))
                
        return filtered_metrics
        
    def get_recent_alerts(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get recent alerts"""
        return [asdict(alert) for alert in self.alerts[-count:]]

# Global monitoring service instance
monitoring_service = MonitoringService()