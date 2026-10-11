import React, { useEffect, useState } from 'react'

interface TimelineNode {
    node_id: string
    node_type: string | null
    duration_ms: number | null
    order: number
    status: string
}

interface TimelineData {
    run_id: string
    workflow_id: string
    total_ms: number
    status: string
    nodes: TimelineNode[]
}

const COLORS = {
    sky: '#0EA5E9',
    violet: '#8B5CF6',
    cyan: '#06B6D4',
    amber: '#F59E0B',
    pink: '#EC4899',
    emerald: '#10B981',
    indigo: '#6366F1',
}

function colorForType(type: string | null): string {
    const t = (type || '').toLowerCase()
    if (t.startsWith('data_source')) return COLORS.sky
    if (t.startsWith('provider') || t.startsWith('prompt')) return COLORS.violet
    if (
        t.startsWith('transform') ||
        t.startsWith('filter') ||
        t.startsWith('aggregate') ||
        t.startsWith('consolidate')
    )
        return COLORS.cyan
    if (
        t.startsWith('condition') ||
        t.startsWith('join') ||
        t.startsWith('union') ||
        t.startsWith('delay') ||
        t.startsWith('wait')
    )
        return COLORS.amber
    if (t.startsWith('dom_action') || t.startsWith('dom.sequence')) return COLORS.pink
    if (t.startsWith('export')) return COLORS.emerald
    return COLORS.indigo
}

function shapeForType(type: string | null): 'diamond' | 'stadium' | 'rounded' {
    const t = (type || '').toLowerCase()
    if (t.startsWith('condition')) return 'diamond'
    if (t.startsWith('data_source') || t.startsWith('export')) return 'stadium'
    return 'rounded'
}

const ROW_HEIGHT = 36
const BAR_HEIGHT = 20
const LABEL_WIDTH = 200
const RIGHT_LABEL_WIDTH = 90
const CHART_WIDTH = 960
const BAR_AREA_WIDTH = CHART_WIDTH - LABEL_WIDTH - RIGHT_LABEL_WIDTH

const RunTimeline: React.FC<{ executionId: string }> = ({ executionId }) => {
    const [timeline, setTimeline] = useState<TimelineData | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(`http://localhost:8000/api/v1/results/${executionId}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then((data) => {
                if (cancelled) return
                const order: string[] = Array.isArray(data.execution_order)
                    ? data.execution_order
                    : []
                const timings: Record<string, number> = data.node_timings || {}
                const types: Record<string, string> = data.node_types || {}
                const nodeResults: Record<string, { error?: unknown }> =
                    data.node_results || {}
                const nodes: TimelineNode[] = order.map((nodeId, i) => ({
                    node_id: nodeId,
                    node_type: types[nodeId] ?? null,
                    duration_ms:
                        typeof timings[nodeId] === 'number' ? timings[nodeId] : null,
                    order: i,
                    status:
                        typeof nodeResults[nodeId]?.error === 'string' &&
                        nodeResults[nodeId].error
                            ? 'failed'
                            : 'completed',
                }))
                setTimeline({
                    run_id: data.execution_id ?? executionId,
                    workflow_id: data.workflow_id ?? '',
                    total_ms: Object.values(timings).reduce<number>(
                        (acc, v) => acc + v,
                        0
                    ),
                    status: data.status ?? '',
                    nodes,
                })
            })
            .catch(() => {
                if (!cancelled) setFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [executionId])

    if (failed) {
        return (
            <div className="rounded-lg p-6" style={{ background: '#0B0F1E', color: '#E8EAF2', fontFamily: "'Instrument Sans', sans-serif" }}>
                <p className="text-sm text-white/50">No timing data for this run</p>
            </div>
        )
    }

    if (!timeline) {
        return null
    }

    const timedNodes = timeline.nodes.filter((n) => n.duration_ms != null)

    if (timedNodes.length === 0) {
        return (
            <div className="rounded-lg p-6" style={{ background: '#0B0F1E', color: '#E8EAF2', fontFamily: "'Instrument Sans', sans-serif" }}>
                <p className="text-sm text-white/50">No timing data for this run</p>
            </div>
        )
    }

    const maxDuration = Math.max(
        ...timedNodes.map((n) => n.duration_ms as number),
        0.0001
    )
    const svgHeight = timeline.nodes.length * ROW_HEIGHT + 8

    const legendSeen: Record<string, true> = {}
    const legendTypes: string[] = []
    for (const n of timeline.nodes) {
        const type = n.node_type || ''
        if (type.length === 0 || legendSeen[type]) continue
        legendSeen[type] = true
        legendTypes.push(type)
    }

    return (
        <div
            className="rounded-lg p-6"
            style={{
                background: '#0B0F1E',
                color: '#E8EAF2',
                fontFamily: "'Instrument Sans', sans-serif",
            }}
        >
            <div className="text-sm mb-4">
                Run timeline — {timedNodes.length} nodes,{' '}
                total {timeline.total_ms.toFixed(1)}ms
            </div>

            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${svgHeight}`}
                width="100%"
                role="img"
                aria-label="Run timeline gantt chart"
            >
                {timeline.nodes.map((node, i) => {
                    const y = i * ROW_HEIGHT + ROW_HEIGHT / 2
                    const dur = node.duration_ms ?? 0
                    const barWidth = Math.max((dur / maxDuration) * BAR_AREA_WIDTH, 2)
                    const barX = LABEL_WIDTH
                    const barY = y - BAR_HEIGHT / 2
                    const fill = colorForType(node.node_type)
                    const shape = shapeForType(node.node_type)
                    const failed = node.status === 'failed'
                    const opacity = failed ? 0.5 : 1

                    let bar: React.ReactNode
                    if (shape === 'diamond') {
                        const h = BAR_HEIGHT + 4
                        const w = Math.max(barWidth, h)
                        const cx = barX + w / 2
                        const pts = `${barX},${y} ${cx},${y - h / 2} ${barX + w},${y} ${cx},${y + h / 2}`
                        bar = (
                            <polygon
                                points={pts}
                                fill={fill}
                            />
                        )
                    } else if (shape === 'stadium') {
                        bar = (
                            <rect
                                x={barX}
                                y={barY}
                                width={Math.max(barWidth, BAR_HEIGHT)}
                                height={BAR_HEIGHT}
                                rx={BAR_HEIGHT / 2}
                                ry={BAR_HEIGHT / 2}
                                fill={fill}
                                opacity={opacity}
                            />
                        )
                    } else {
                        bar = (
                            <rect
                                x={barX}
                                y={barY}
                                width={barWidth}
                                height={BAR_HEIGHT}
                                rx={4}
                                ry={4}
                                fill={fill}
                                opacity={opacity}
                            />
                        )
                    }

                    return (
                        <g key={node.node_id}>
                            <line
                                x1={LABEL_WIDTH}
                                y1={y}
                                x2={LABEL_WIDTH + BAR_AREA_WIDTH}
                                y2={y}
                                stroke="#FFFFFF"
                                strokeOpacity={0.06}
                            />
                            <text
                                x={LABEL_WIDTH - 12}
                                y={y + 4}
                                textAnchor="end"
                                fontSize={13}
                                fill="#E8EAF2"
                            >
                                {node.node_id}
                            </text>
                            {bar}
                            <text
                                x={LABEL_WIDTH + BAR_AREA_WIDTH + 12}
                                y={y + 4}
                                textAnchor="start"
                                fontSize={13}
                                fill="#E8EAF2"
                            >
                                {(node.duration_ms ?? 0).toFixed(1)}ms
                            </text>
                        </g>
                    )
                })}
            </svg>

            {legendTypes.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                    {legendTypes.map((type) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <span
                                className="inline-block w-3 h-3 rounded-sm"
                                style={{ background: colorForType(type) }}
                            />
                            <span className="text-xs text-white/60">{type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default RunTimeline
