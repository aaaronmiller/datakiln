import React, { useState } from 'react'
import EnhancedQueryEditor from './components/core/EnhancedQueryEditor'
import { QueryGraph } from './types/query'

function App() {
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const handleOpenEditor = () => {
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
  }

  const handleSaveQuery = (queryGraph: QueryGraph) => {
    console.log('Saving query graph:', queryGraph)
    // TODO: Implement save functionality
  }

  const handleExecuteQuery = async (queryGraph: QueryGraph) => {
    console.log('Executing query graph:', queryGraph)
    // TODO: Implement execution functionality
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate async operation
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>DataKiln</h1>
        <button
          onClick={handleOpenEditor}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open Query Editor
        </button>
      </header>
      <main>
        <div className="p-4">
          <h2>Welcome to DataKiln</h2>
          <p>Click the button above to open the enhanced query editor.</p>
        </div>
      </main>

      <EnhancedQueryEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveQuery}
        onExecute={handleExecuteQuery}
      />
    </div>
  )
}

export default App