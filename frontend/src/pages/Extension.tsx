import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Download, Shield, Zap, Globe } from "lucide-react"

const Extension: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Chrome Extension</h1>
          <p className="text-white/60 mt-1">Connect your browser to the DataKiln Engine</p>
        </div>
        <Button onClick={() => window.open('chrome://extensions', '_blank')}>
          Open Chrome Extensions
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
              <li>Download the <code>chrome-extension</code> folder from the project root.</li>
              <li>Open Chrome and navigate to <code>chrome://extensions</code>.</li>
              <li>Enable <strong>Developer Mode</strong> in the top right.</li>
              <li>Click <strong>Load Unpacked</strong>.</li>
              <li>Select the <code>chrome-extension</code> folder.</li>
            </ol>
            <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
              Make sure the backend is running at <code>http://localhost:8000</code> for the extension to connect.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Globe className="h-5 w-5 text-violet-300" />
              <div>
                <h4 className="font-medium text-sm">Context-Aware Triggers</h4>
                <p className="text-xs text-white/50">
                  The extension detects which site you are on (e.g., YouTube, Gemini) and suggests relevant workflows to run instantly.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-emerald-500" />
              <div>
                <h4 className="font-medium text-sm">Secure Capture</h4>
                <p className="text-xs text-white/50">
                  Use the "Capture Selector" mode to click any element on a page and save its robust generic selector to your Registry.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/60 mb-4">
            By default, the extension connects to `http://localhost:8000`. You can configure this in the extension popup settings if you deploy DataKiln remotely.
          </p>
          {/* Placeholder for status check if we had one */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-white/50">Extension Link Status: Unknown (Install to verify)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Extension