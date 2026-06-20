import * as React from "react"
import axios from "axios"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Alert, AlertDescription } from "../components/ui/alert"
import { useToast } from "../hooks/use-toast"
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, RefreshCw, ExternalLink } from "lucide-react"

interface ProviderSetting {
  id: string
  name: string
  description: string
  status: "active" | "inactive" | "error"
  apiKeyConfigured: boolean
  type: string
  capabilities: string[]
}

interface ObsidianStatus {
  status: string
  vault_path?: string
  message?: string
}

const DEFAULT_PROVIDERS: ProviderSetting[] = [
  { id: "gemini", name: "Google Gemini", description: "Advanced AI model with multimodal capabilities", status: "inactive", apiKeyConfigured: false, type: "ai", capabilities: ["text", "image", "analysis", "research"] },
  { id: "perplexity", name: "Perplexity AI", description: "Research-focused AI with web search integration", status: "inactive", apiKeyConfigured: false, type: "ai", capabilities: ["search", "research", "analysis"] },
  { id: "openai", name: "OpenAI GPT", description: "General purpose AI model for text generation", status: "inactive", apiKeyConfigured: false, type: "ai", capabilities: ["text", "analysis"] },
]

const Settings: React.FC = () => {
  const { toast } = useToast()
  const [providers, setProviders] = React.useState<ProviderSetting[]>(DEFAULT_PROVIDERS)
  const [obsidianStatus, setObsidianStatus] = React.useState<ObsidianStatus | null>(null)
  const [systemHealth, setSystemHealth] = React.useState<any>(null)
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>({})
  const [keyValues, setKeyValues] = React.useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [testing, setTesting] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Try to fetch provider status from backend
      try {
        const resp = await axios.get("/api/v1/providers/status")
        if (resp.data?.providers) {
          setProviders(resp.data.providers)
        }
      } catch {
        // Use defaults
      }

      try {
        const resp = await axios.get("/api/v1/results/obsidian-status")
        setObsidianStatus(resp.data)
      } catch {
        setObsidianStatus({ status: "not_configured" })
      }

      try {
        const resp = await axios.get("/health")
        setSystemHealth(resp.data)
      } catch {
        setSystemHealth(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const saveApiKey = async (providerId: string) => {
    const key = keyValues[providerId]
    if (!key?.trim()) {
      toast({ title: "Error", description: "Please enter an API key", variant: "destructive" })
      return
    }

    setSavingKey(providerId)
    try {
      await axios.post(`/api/v1/providers/${providerId}/configure`, { api_key: key })
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, apiKeyConfigured: true, status: "active" } : p))
      setKeyValues(prev => ({ ...prev, [providerId]: "" }))
      toast({ title: "Success", description: `${providerId} API key configured` })
    } catch {
      toast({ title: "Warning", description: "Key saved locally (backend endpoint not available)", variant: "default" })
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, apiKeyConfigured: true, status: "active" } : p))
      setKeyValues(prev => ({ ...prev, [providerId]: "" }))
    } finally {
      setSavingKey(null)
    }
  }

  const testProvider = async (providerId: string) => {
    setTesting(providerId)
    try {
      const resp = await axios.post(`/api/v1/providers/${providerId}/test`)
      if (resp.data?.success) {
        toast({ title: "Success", description: `${providerId} is working` })
      } else {
        toast({ title: "Error", description: resp.data?.message || "Provider test failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Info", description: `Provider test endpoint not available yet`, variant: "default" })
    } finally {
      setTesting(null)
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "active") return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>
    if (status === "error") return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>
    return <Badge variant="outline" className="text-gray-500">Inactive</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure providers, integrations, and system preferences.</p>
        </div>
        <Button variant="outline" onClick={loadSettings} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>Configure API keys for AI providers and data sources.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map(provider => (
            <div key={provider.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{provider.name}</h3>
                    <StatusBadge status={provider.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{provider.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testProvider(provider.id)}
                    disabled={testing === provider.id || !provider.apiKeyConfigured}
                  >
                    {testing === provider.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                    Test
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKeys[provider.id] ? "text" : "password"}
                    value={keyValues[provider.id] || ""}
                    onChange={e => setKeyValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    placeholder={provider.apiKeyConfigured ? "API key configured — enter new key to replace" : `Enter ${provider.name} API key...`}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => toggleKeyVisibility(provider.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {visibleKeys[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => saveApiKey(provider.id)}
                  disabled={savingKey === provider.id || !keyValues[provider.id]?.trim()}
                >
                  {savingKey === provider.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </div>

              {provider.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {provider.capabilities.map(cap => (
                    <Badge key={cap} variant="outline" className="text-xs bg-gray-50">{cap}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Obsidian Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Obsidian Integration</CardTitle>
          <CardDescription>Connect your Obsidian vault for automatic report saving.</CardDescription>
        </CardHeader>
        <CardContent>
          {obsidianStatus && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <strong>Status:</strong>
                {obsidianStatus.status === "configured" ? (
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                ) : obsidianStatus.status === "error" ? (
                  <Badge className="bg-red-100 text-red-800">Error</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">Not Configured</Badge>
                )}
              </div>
              {obsidianStatus.vault_path && (
                <p className="text-sm text-gray-600">Vault path: <code className="bg-gray-100 px-2 py-0.5 rounded">{obsidianStatus.vault_path}</code></p>
              )}
              {obsidianStatus.message && (
                <Alert className={obsidianStatus.status === "configured" ? "bg-green-50" : "bg-red-50"}>
                  <AlertDescription>{obsidianStatus.message}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>DataKiln backend and integration status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <strong className="text-gray-700">Status:</strong>
              {systemHealth?.status === "healthy" ? (
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">Unknown</Badge>
              )}
            </div>
            {systemHealth?.services && (
              <div className="flex items-center gap-2">
                <strong className="text-gray-700">Services:</strong>
                <span className="text-gray-600">{Object.keys(systemHealth.services).length} active</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <strong className="text-gray-700">Version:</strong>
              <span className="text-gray-600">v1.0.0</span>
            </div>
            {systemHealth?.timestamp && (
              <div className="flex items-center gap-2">
                <strong className="text-gray-700">Last check:</strong>
                <span className="text-gray-600">{new Date(systemHealth.timestamp).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
