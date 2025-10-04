import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../../types/workflow';

interface SplitterNodeData extends WorkflowNodeData {
  num_splits: number;
  model?: string;
  structure?: 'json_array' | 'structured';
  prompt?: string;
}

const SplitterNode: React.FC<NodeProps<SplitterNodeData>> = ({ data }) => {
  const numOutputs = data.num_splits || 3;
  const structure = data.structure || 'json_array';

  return (
    <div className="bg-yellow-100 border-2 border-yellow-300 rounded px-3 py-2 min-w-24 max-w-32">
      <div className="text-xs font-medium text-yellow-800">{data.name}</div>
      <div className="text-xs text-yellow-700">Splitter</div>
      <div className="text-xs text-yellow-600 mt-1">Outputs: {numOutputs}</div>
      {data.model && <div className="text-xs text-gray-600">AI: {data.model}</div>}
      <div className="text-xs text-gray-500">{structure.toUpperCase()}</div>

      {/* Single input */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-400" />

      {/* Multiple outputs */}
      {Array.from({ length: numOutputs }, (_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          className={`w-3 h-3 bg-green-400 ${i > 0 ? 'mt-2' : ''}`}
          style={{ top: `${(i + 1) * 100 / (numOutputs + 1)}%` }}
        />
      ))}
    </div>
  );
};

export default SplitterNode;