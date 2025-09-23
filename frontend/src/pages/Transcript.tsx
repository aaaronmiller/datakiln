import React, { useState } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, ExternalLink, Copy, Play } from 'lucide-react'
import transcriptService, { TranscriptResult } from '../services/transcriptService'

const Transcript: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'input' | 'extract' | 'analyze'>('input')

  const handleOpenTranscriptSite = () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!transcriptService.isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL')
      return
    }

    // Open youtubetotranscript.com in new tab
    const transcriptUrl = `https://youtubetranscript.com/transcript?url=${encodeURIComponent(url)}`
    window.open(transcriptUrl, '_blank')

    setCurrentStep('extract')
    setError(null)
  }

  const handlePasteTranscript = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setTranscriptText(clipboardText)
      setCurrentStep('analyze')
    } catch (err) {
      setError('Failed to read clipboard. Please paste the transcript manually.')
    }
  }

  const handleAnalyzeTranscript = async () => {
    if (!transcriptText.trim()) {
      setError('Please paste the transcript text')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use the transcript analysis API with the pasted text
      const analysisResult = await transcriptService.analyzeTranscript(transcriptText, url)
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze transcript')
    } finally {
      setLoading(false)
    }
  }

  const handleChainToDeepResearch = () => {
    // Navigate to dashboard and trigger deep research with the transcript analysis as context
    window.location.href = '/#/dashboard'
    // Could pass the analysis result as context for deep research
  }


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">YouTube Transcript Analysis</h1>
      </div>

      {/* Step indicator */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${currentStep === 'input' ? 'text-blue-600' : currentStep === 'extract' || currentStep === 'analyze' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'input' ? 'bg-blue-100' : currentStep === 'extract' || currentStep === 'analyze' ? 'bg-green-100' : 'bg-gray-100'}`}>
              1
            </div>
            <span className="text-sm font-medium">Enter URL</span>
          </div>
          <div className={`flex-1 h-px ${currentStep === 'extract' || currentStep === 'analyze' ? 'bg-green-300' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center space-x-2 ${currentStep === 'extract' ? 'text-blue-600' : currentStep === 'analyze' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'extract' ? 'bg-blue-100' : currentStep === 'analyze' ? 'bg-green-100' : 'bg-gray-100'}`}>
              2
            </div>
            <span className="text-sm font-medium">Extract Transcript</span>
          </div>
          <div className={`flex-1 h-px ${currentStep === 'analyze' ? 'bg-green-300' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center space-x-2 ${currentStep === 'analyze' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'analyze' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              3
            </div>
            <span className="text-sm font-medium">Analyze</span>
          </div>
        </div>
      </div>

      {/* Step 1: URL Input */}
      {currentStep === 'input' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Enter YouTube Video URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the YouTube video URL you want to analyze
                </p>
              </div>
              <Button onClick={handleOpenTranscriptSite} disabled={!url.trim()}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Transcript Site
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Extract Transcript */}
      {currentStep === 'extract' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 2: Extract Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  1. The transcript site has opened in a new tab<br/>
                  2. On the transcript site, click the "Copy" button to copy the transcript<br/>
                  3. Return here and paste the transcript below
                </AlertDescription>
              </Alert>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Paste Transcript Text
                </label>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste the transcript text here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasteTranscript}>
                  <Copy className="h-4 w-4 mr-2" />
                  Paste from Clipboard
                </Button>
                <Button onClick={handleAnalyzeTranscript} disabled={!transcriptText.trim() || loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Analyze Transcript
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {result && currentStep === 'analyze' && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-600">
                    Video ID: <span className="font-mono">{result.video_id}</span>
                  </p>
                </div>
                <Badge variant="secondary">
                  {result.word_count} words
                </Badge>
              </div>

              {result.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.analysis.statistics.total_sentences}
                    </div>
                    <div className="text-sm text-gray-600">Sentences</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(result.analysis.summary.estimated_reading_time_minutes)}m
                    </div>
                    <div className="text-sm text-gray-600">Reading Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.analysis.summary.length_category}
                    </div>
                    <div className="text-sm text-gray-600">Length</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button onClick={handleChainToDeepResearch}>
                  <Play className="h-4 w-4 mr-2" />
                  Chain to Deep Research
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(result.transcript)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Transcript
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Card */}
          {result.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Content Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Top Keywords</h4>
                    <div className="space-y-1">
                      {result.analysis.statistics.top_keywords.slice(0, 10).map(([keyword, count]) => (
                        <div key={keyword} className="flex justify-between items-center">
                          <span className="text-sm">{keyword}</span>
                          <Badge variant="outline" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Main Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.summary.main_topics.map(topic => (
                        <Badge key={topic} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcript Card */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript Text</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {result.transcript}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Transcript