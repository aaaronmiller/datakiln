import React, { useState } from 'react'
import { Badge } from '../components/ui/badge'
import transcriptService, { TranscriptResult } from '../services/transcriptService'

const Transcript: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TranscriptResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcessTranscript = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!transcriptService.isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const transcriptResult = await transcriptService.processYouTubeTranscript(url)
      setResult(transcriptResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process transcript')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProcessTranscript()
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">YouTube Transcript Analysis</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              YouTube Video URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleProcessTranscript}
                disabled={loading || !url.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Extract Transcript'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Enter a YouTube video URL to extract and analyze its transcript
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Transcript Summary</h2>
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
          </div>

          {/* Analysis Card */}
          {result.analysis && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Analysis</h3>

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
            </div>
          )}

          {/* Transcript Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Transcript</h3>
              <button
                onClick={() => navigator.clipboard.writeText(result.transcript)}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Copy
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {result.transcript}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transcript