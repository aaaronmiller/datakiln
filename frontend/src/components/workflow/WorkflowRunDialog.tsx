import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { LoadingSpinner } from "../ui/spinner"
import nodeRegistryService from "../../services/nodeRegistryService"
import { useToast } from "../../hooks/use-toast"

interface WorkflowRunDialogProps {
    isOpen: boolean
    onClose: () => void
    onRun: (inputs: Record<string, unknown>) => Promise<void>
    workflowId: string
    workflowName?: string
}

const WorkflowRunDialog: React.FC<WorkflowRunDialogProps> = ({
    isOpen,
    onClose,
    onRun,
    workflowId,
    workflowName
}) => {
    const { toast } = useToast()
    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [isRunning, setIsRunning] = useState(false)

    // We'll try to infer inputs. For v1, we'll default to standard ones if we can't find definition
    // or allow adding arbitrary keys.
    const [definedInputs, setDefinedInputs] = useState<string[]>([])

    useEffect(() => {
        if (isOpen && workflowId) {
            detectInputs()
        }
    }, [isOpen, workflowId])

    const detectInputs = async () => {
        setLoading(true)
        try {
            // If it's a known system workflow, hardcode inputs for better UX
            if (workflowId === 'deep-research') {
                setDefinedInputs(['query', 'depth'])
                setInputs({ depth: 'balanced' })
                return
            }

            // If valid custom node, load definition
            const node = nodeRegistryService.getNodeType(workflowId)
            if (node) {
                // This logic depends on how inputs are defined in the node registry
                // Assuming 'parameters' or checking for specific node types in the workflow
                // For now, we'll offer a generic "Input" field and "URL" if it sounds like a scraper
                setDefinedInputs(['input'])
            } else {
                // Fallback: Generic Input
                setDefinedInputs(['input'])
            }
        } catch (error) {
            console.error("Failed to detect inputs", error)
            setDefinedInputs(['input'])
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (key: string, value: string) => {
        setInputs(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsRunning(true)
        try {
            await onRun(inputs)
            onClose()
        } catch (error) {
            console.error("Failed to run workflow", error)
            toast({
                title: "Execution Failed",
                description: "Could not start the workflow.",
                variant: "destructive"
            })
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Run {workflowName || 'Workflow'}</DialogTitle>
                    <DialogDescription>
                        Configure parameters for this execution.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-4">
                        <LoadingSpinner className="h-6 w-6" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {definedInputs.map(key => (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key} className="capitalize">{key}</Label>
                                {key === 'query' || key === 'input' ? (
                                    <Textarea
                                        id={key}
                                        value={inputs[key] || ''}
                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                        placeholder={`Enter ${key}...`}
                                        rows={3}
                                    />
                                ) : (
                                    <Input
                                        id={key}
                                        value={inputs[key] || ''}
                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                        placeholder={`Enter ${key}...`}
                                    />
                                )}
                            </div>
                        ))}

                        {/* Dynamic Field Adder could go here for arbitrary inputs */}

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isRunning}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isRunning}>
                                {isRunning ? (
                                    <>
                                        <LoadingSpinner className="mr-2 h-4 w-4" />
                                        Starting...
                                    </>
                                ) : (
                                    'Execute Workflow'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default WorkflowRunDialog
