import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { LoadingSpinner } from "../components/ui/spinner"
import { ArrowLeft, Download, Clock, CheckCircle, AlertCircle, Play } from "lucide-react"
import resultsService, { RunResult } from "../services/resultsService"
import ReactMarkdown from 'react-markdown'

const ResultDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [result, setResult] = useState<RunResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return
        loadResult(id)
    }, [id])

    const loadResult = async (resultId: string) => {
        try {
            setIsLoading(true)
            const data = await resultsService.getResult(resultId)
            setResult(data)
        } catch (err) {
            setError("Failed to load result details")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoadingSpinner className="w-8 h-8" />
            </div>
        )
    }

    if (error || !result) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-500 mb-4">{error || "Result not found"}</h2>
                <Button onClick={() => navigate('/results')}>Back to Results</Button>
            </div>
        )
    }

    // Determine primary output for display
    const resultsRecord = result.results as Record<string, unknown>
    const outputData = (resultsRecord?.data as unknown[] | undefined)?.[0] ?? result.results
    const outputString = typeof outputData === 'string' ? outputData : JSON.stringify(outputData, null, 2)
    const isMarkdown = typeof outputData === 'string' && (outputData.includes('# ') || outputData.includes('**'))

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Result Details</h1>
                        <p className="text-sm text-gray-500 font-mono">{result.execution_id}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Badge variant={result.status === 'completed' ? 'default' : result.status === 'failed' ? 'destructive' : 'secondary'}>
                        {result.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {result.status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Started:</span>
                                <span className="font-mono">{new Date(result.started_at).toLocaleString()}</span>
                            </div>
                            {result.completed_at && (
                                <div className="flex justify-between">
                                    <span>Completed:</span>
                                    <span className="font-mono">{new Date(result.completed_at).toLocaleString()}</span>
                                </div>
                            )}
                            {result.duration && (
                                <div className="flex justify-between font-semibold">
                                    <span>Duration:</span>
                                    <span>{result.duration.toFixed(2)}s</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                            <Play className="h-4 w-4 mr-2" />
                            Workflow Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{result.workflow_id}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                            <Download className="h-4 w-4 mr-2" />
                            Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                            const blob = new Blob([outputString], { type: 'text/plain' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `result-${result.execution_id}.${isMarkdown ? 'md' : 'json'}`
                            a.click()
                        }}>
                            Download Raw
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Output Content */}
            <Card className="min-h-[400px]">
                <CardHeader>
                    <CardTitle>Output Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 overflow-auto max-h-[600px]">
                        {isMarkdown ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown>{outputString}</ReactMarkdown>
                            </div>
                        ) : (
                            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-800">
                                {outputString}
                            </pre>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default ResultDetails
