#!/usr/bin/env node

console.log('Starting basic functionality test...');

import UniversalDocumentProcessor from './index.js';

console.log('Import successful, starting test...');

async function testBasicFunctionality() {
  console.log('Testing basic document processor functionality...\n');

  try {
    // Test 1: Initialize processor
    console.log('1. Initializing processor...');
    const processor = new UniversalDocumentProcessor(process.env.GOOGLE_API_KEY || 'test-key');
    console.log('✓ Processor initialized successfully');

    // Test 2: Get supported formats
    console.log('\n2. Getting supported formats...');
    const formats = processor.getSupportedFormats();
    console.log(`✓ Found ${formats.length} supported formats`);
    console.log(`  Sample formats: ${formats.slice(0, 5).join(', ')}...`);

    console.log('\n✓ Basic functionality tests passed!');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('Calling test function...');
testBasicFunctionality().then(() => {
  console.log('Test completed successfully');
}).catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});