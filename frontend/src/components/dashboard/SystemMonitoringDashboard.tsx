import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface SystemMetrics {
  timestamp: string;
  backend: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  frontend: {
    status: 'healthy' | 'degraded' | 'down';
    loadTime: number;
    bundleSize: string;
    activeUsers: number;
  };
  workflows: {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    activeExecutions: number;
  };
  extension: {
    activeInstalls: number;
    captureRate: number;
    errorRate: number;
  };
}

interface AlertItem {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  component: string;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/monitoring');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Monitoring WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'metrics') {
        setMetrics(data.data);
        setLastUpdate(new Date().toLocaleTimeString());
      } else if (data.type === 'alert') {
        setAlerts(prev => [data.data, ...prev.slice(0, 9)]); // Keep last 10 alerts
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('Monitoring WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('Monitoring WebSocket error:', error);
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  // Fallback polling if WebSocket fails
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/v1/monitoring/metrics');
          if (response.ok) {
            const data = await response.json();
            setMetrics(data);
            setLastUpdate(new Date().toLocaleTimeString());
          }
        } catch (error) {
          console.error('Failed to fetch metrics:', error);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time DataKiln system health and performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <span className="text-sm text-gray-500">Last update: {lastUpdate}</span>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Backend Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.backend.status)}`}>
                  {metrics.backend.status.toUpperCase()}
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.backend.responseTime}ms</p>
                <p className="text-xs text-gray-500">Response Time</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{metrics.backend.activeConnections}</p>
                <p className="text-xs text-gray-500">Active Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Frontend Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.frontend.status)}`}>
                  {metrics.frontend.status.toUpperCase()}
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.frontend.loadTime}ms</p>
                <p className="text-xs text-gray-500">Load Time</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{metrics.frontend.activeUsers}</p>
                <p className="text-xs text-gray-500">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Workflow Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.workflows.successRate}%</p>
                <p className="text-xs text-gray-500">Success Rate</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{metrics.workflows.activeExecutions}</p>
                <p className="text-xs text-gray-500">Active Workflows</p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-600">Avg: {metrics.workflows.averageExecutionTime}s</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Extension Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.extension.activeInstalls}</p>
                <p className="text-xs text-gray-500">Active Installs</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{metrics.extension.errorRate}%</p>
                <p className="text-xs text-gray-500">Error Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU Usage</span>
                  <span>{metrics.backend.cpuUsage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.backend.cpuUsage > 80 ? 'bg-red-500' : 
                      metrics.backend.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.backend.cpuUsage}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory Usage</span>
                  <span>{metrics.backend.memoryUsage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metrics.backend.memoryUsage > 80 ? 'bg-red-500' : 
                      metrics.backend.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.backend.memoryUsage}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Bundle Size</p>
                    <p className="font-medium">{metrics.frontend.bundleSize}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Executions</p>
                    <p className="font-medium">{metrics.workflows.totalExecutions}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.type)}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.component}</p>
                      </div>
                      <span className="text-xs text-gray-400">{alert.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => window.open('/api/v1/dashboard/system-status', '_blank')}
            >
              📊 Detailed Metrics
            </button>
            <button 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={() => window.open('/health', '_blank')}
            >
              🏥 Health Check
            </button>
            <button 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              onClick={() => window.open('/workflows', '_blank')}
            >
              ⚡ Workflow Editor
            </button>
            <button 
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/logs/deployment-report.json';
                link.download = 'deployment-report.json';
                link.click();
              }}
            >
              📋 Download Report
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMonitoringDashboard;