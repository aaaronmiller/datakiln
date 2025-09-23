interface TranscriptResult {
  success: boolean
  video_id: string
  transcript: string
  word_count: number
  analysis?: {
    statistics: {
      total_words: number
      total_sentences: number
      average_words_per_sentence: number
      top_keywords: [string, number][]
    }
    summary: {
      length_category: string
      estimated_reading_time_minutes: number
      main_topics: string[]
    }
  }
  files?: {
    transcript: string
    analysis: string
  }
}

class TranscriptService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  async processYouTubeTranscript(url: string): Promise<TranscriptResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/youtube/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(url),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to process YouTube transcript:', error)
      throw error
    }
  }

  async analyzeTranscript(transcriptText: string, url: string): Promise<TranscriptResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/transcript/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptText,
          url: url
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to analyze transcript:', error)
      throw error
    }
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // Try parsing as URL
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v')
      } else if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1)
      }
    } catch {
      // Invalid URL
    }

    return null
  }

  isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null
  }
}

const transcriptService = new TranscriptService()

export default transcriptService
export type { TranscriptResult }