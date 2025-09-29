#!/usr/bin/env node

// Simple Node.js script to test if workflow components are accessible
console.log('🎯 TESTING WORKFLOW COMPONENTS ACCESSIBILITY')
console.log('===========================================\n')

const path = require('path')
const fs = require('fs')

// Check main React Flow files
const reactFlowPaths = [
  'node_modules/@xyflow/react/dist/style.css',
  'node_modules/@xyflow/react/package.json'
]

console.log('📦 Checking React Flow Package:')
reactFlowPaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filePath} exists`)
    // Read some content to verify
    if (filePath.endsWith('style.css')) {
      const content = fs.readFileSync(filePath, 'utf8').substring(0, 100)
      console.log(`   First 100 chars: ${content.substring(0, 50)}...`)
    }
  } else {
    console.log(`❌ ${filePath} NOT FOUND`)
  }
})

console.log('\n🔧 Checking Workflow Component Files:')
const workflowFiles = [
  'src/components/workflow/WorkflowEditor.tsx',
  'src/components/workflow/AiDomNode.tsx',
  'src/components/workflow/NodeConfigDialog.tsx'
]

workflowFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').length
    console.log(`✅ ${filePath} exists (${lines} lines)`)
    // Check if it has the key imports
    if (content.includes('@xyflow/react')) {
      console.log('   ✅ React Flow import found')
    } else {
      console.log('   ❌ React Flow import NOT found')
    }
  } else {
    console.log(`❌ ${filePath} NOT FOUND`)
  }
})

console.log('\n🎯 If you see React Flow imports and files exist, React Flow should work!')
console.log('💡 Try: npm run dev and check browser console logs')