// Test file for Node Signatures ⟨I,O,C⟩ System
// Demonstrates the complete implementation working together

import { nodeRegistry, getNodeSignature, checkNodeCompatibility, getSuggestedNodeConnections } from './registry/node-registry.js';
import { NodeSignatureUtils } from './types/node-signatures.js';
import { DataKind } from './types/data-kinds.js';

console.log('🧪 Testing Node Signatures ⟨I,O,C⟩ System\n');

// Test 1: Check that registry is populated
console.log('1. Registry Population Test:');
const allNodeTypes = nodeRegistry.getAllNodeTypes();
console.log(`   Found ${allNodeTypes.length} node types:`, allNodeTypes.slice(0, 5), '...');

// Test 2: Get specific node signatures
console.log('\n2. Node Signature Retrieval Test:');
const youtubeTranscriptSig = getNodeSignature('youtube-transcript');
if (youtubeTranscriptSig) {
  console.log(`   YouTube Transcript Node:`);
  console.log(`     Category: ${youtubeTranscriptSig.category}`);
  console.log(`     Inputs: ${youtubeTranscriptSig.inputs.length} ports`);
  console.log(`     Outputs: ${youtubeTranscriptSig.outputs.length} ports`);
  console.log(`     Side Effects: ${youtubeTranscriptSig.capabilities.side_effects.join(', ')}`);
} else {
  console.log('   ❌ YouTube Transcript signature not found');
}

// Test 3: Signature validation
console.log('\n3. Signature Validation Test:');
const validation = NodeSignatureUtils.validateSignature(youtubeTranscriptSig!);
console.log(`   Validation result: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
if (validation.warnings.length > 0) {
  console.log(`   Warnings: ${validation.warnings.join(', ')}`);
}

// Test 4: Node compatibility checking
console.log('\n4. Node Compatibility Test:');
const compatibility = checkNodeCompatibility('url-injector', 'youtube-transcript');
console.log(`   URL Injector → YouTube Transcript compatibility:`);
console.log(`     Compatible: ${compatibility.compatible}`);
if (compatibility.resource_conflicts.length > 0) {
  console.log(`     Resource conflicts: ${compatibility.resource_conflicts.join(', ')}`);
}

// Test 5: Connection suggestions
console.log('\n5. Connection Suggestions Test:');
const suggestions = getSuggestedNodeConnections('url-injector', 'youtube-transcript');
console.log(`   Suggested connections: ${suggestions.compatible ? suggestions.suggestions.length : 0} found`);
if (suggestions.suggestions.length > 0) {
  console.log(`   First suggestion: ${suggestions.suggestions[0].sourcePort} → ${suggestions.suggestions[0].targetPort}`);
}

// Test 6: Resource requirements aggregation
console.log('\n6. Resource Requirements Test:');
const resourceReqs = nodeRegistry.getResourceRequirements(['youtube-transcript', 'gemini-processor']);
console.log(`   Combined resource requirements:`, resourceReqs);

// Test 7: Data kind producers/consumers
console.log('\n7. Data Kind Relationships Test:');
const urlProducers = nodeRegistry.findProducersForDataKind(DataKind.HTML_URL);
const urlConsumers = nodeRegistry.findConsumersForDataKind(DataKind.HTML_URL);
console.log(`   HTML_URL producers: ${urlProducers.join(', ')}`);
console.log(`   HTML_URL consumers: ${urlConsumers.join(', ')}`);

// Test 8: Node taxonomy
console.log('\n8. Node Taxonomy Test:');
const categories = nodeRegistry.getAllCategories();
console.log(`   Available categories: ${categories.join(', ')}`);

const llmNodes = nodeRegistry.getNodesByCategory('provider/llm' as any);
console.log(`   LLM nodes: ${Object.keys(llmNodes).join(', ')}`);

console.log('\n🎉 Node Signatures ⟨I,O,C⟩ System Test Complete!');