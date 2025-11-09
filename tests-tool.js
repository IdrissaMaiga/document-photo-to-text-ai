import UniversalDocumentProcessor from './index.js';
import fs from 'fs';
import path from 'path';

// Test script to run all extraction possibilities
const testFiles = [
  'Calculator.java',
  'README.md',
  'sample.cpp',
  'sample.cs',
  'sample.csv',
  'sample.docx',
  'sample.go',
  'sample.html',
  'sample.ini',
  'sample.js',
  'sample.json',
  'sample.log',
  'sample.md',
  'sample.pdf',
  'sample.php',
  'sample.py',
  'sample.rb',
  'sample.rs',
  'sample.sql',
  'sample.svg',
  'sample.toml',
  'sample.ts',
  'sample.txt',
  'sample.xml',
  'sample.yaml'
];

// URL tests (these will work without local files)
const testUrls = [
  {
    url: 'https://www.google.com',
    description: 'Google homepage (HTML extraction)'
  },
  {
    url: 'https://httpbin.org/json',
    description: 'JSON API response'
  },
  // YouTube URLs - uncomment and add real video IDs
  {
    url: 'https://www.youtube.com/watch?v=BxMxjLCVJK0',
    description: 'YouTube video (transcript extraction)'
  }
];

// Binary file tests (these need actual files to be placed in test/ folder)
const binaryFileTests = [
  {
    filename: 'sample.pdf',
    description: 'PDF document',
    note: 'Place a PDF file here to test PDF extraction'
  },
  {
    filename: 'sample.docx',
    description: 'Word document (.docx)',
    note: 'Place a .docx file here to test Word document extraction'
  },
  {
    filename: 'sample.xlsx',
    description: 'Excel spreadsheet',
    note: 'Place a .xlsx file here to test Excel extraction'
  },
  {
    filename: 'sample.png',
    description: 'PNG image',
    note: 'Place a .png file here to test image OCR'
  },
  {
    filename: 'sample.jpg',
    description: 'JPEG image',
    note: 'Place a .jpg file here to test image OCR'
  }
];

async function runFileTests(processor) {
  console.log('📁 Testing Local Files\n');
  console.log('='.repeat(50));

  for (const fileName of testFiles) {
    const filePath = path.join('./test', fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${fileName}: File not found`);
      continue;
    }

    try {
      console.log(`\n📄 Testing: ${fileName}`);
      console.log('-'.repeat(30));

      const result = await processor.processDocument(filePath);

      console.log(`✅ File Type: ${result.file_type}`);
      console.log(`📏 File Size: ${result.file_size} bytes`);
      console.log(`🔒 File Hash: ${result.file_hash.substring(0, 16)}...`);

      if (result.metadata && Object.keys(result.metadata).length > 0) {
        console.log(`📊 Metadata keys: ${Object.keys(result.metadata).join(', ')}`);
      }

      const textPreview = result.extracted_text.substring(0, 150);
      console.log(`📝 Text Preview: "${textPreview}${result.extracted_text.length > 150 ? '...' : ''}"`);

    } catch (error) {
      console.log(`❌ Error processing ${fileName}: ${error.message}`);
    }
  }
}

async function runUrlTests(processor) {
  console.log('\n🌐 Testing URL Processing\n');
  console.log('='.repeat(50));

  for (const { url, description } of testUrls) {
    try {
      console.log(`\n🔗 Testing: ${description}`);
      console.log(`URL: ${url}`);
      console.log('-'.repeat(40));

      const result = await processor.processDocument(url);

      console.log(`✅ File Type: ${result.file_type}`);
      console.log(`📏 Content Size: ${result.file_size} bytes`);
      console.log(`🌐 URL: ${result.file_url}`);

      const textPreview = result.extracted_text.substring(0, 150);
      console.log(`📝 Text Preview: "${textPreview}${result.extracted_text.length > 150 ? '...' : ''}"`);

    } catch (error) {
      console.log(`❌ Error processing URL ${url}: ${error.message}`);
    }
  }
}

async function runBinaryFileTests(processor) {
  console.log('\n📋 Binary File Tests (Manual)\n');
  console.log('='.repeat(50));

  for (const { filename, description, note } of binaryFileTests) {
    const filePath = path.join('./test', filename);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filename}: ${note}`);
      continue;
    }

    try {
      console.log(`\n📄 Testing: ${description} (${filename})`);
      console.log('-'.repeat(40));

      const result = await processor.processDocument(filePath);

      console.log(`✅ File Type: ${result.file_type}`);
      console.log(`📏 File Size: ${result.file_size} bytes`);
      console.log(`🔒 File Hash: ${result.file_hash.substring(0, 16)}...`);

      const textPreview = result.extracted_text.substring(0, 150);
      console.log(`📝 Text Preview: "${textPreview}${result.extracted_text.length > 150 ? '...' : ''}"`);

    } catch (error) {
      console.log(`❌ Error processing ${filename}: ${error.message}`);
    }
  }
}

async function runBufferTests(processor) {
  console.log('\n🧪 Testing Buffer Processing\n');
  console.log('='.repeat(50));

  // Test 1: JSON Buffer - use actual sample.json content
  try {
    console.log('\n📄 Testing: JSON Buffer (from sample.json)');
    console.log('-'.repeat(25));

    const jsonContent = fs.readFileSync(path.join('./test', 'sample.json'), 'utf8');
    const jsonBuffer = Buffer.from(jsonContent);

    const result = await processor.processDocument(jsonBuffer, {
      filename: 'test.json',
      mimetype: 'application/json'
    });

    console.log(`✅ File Type: ${result.file_type}`);
    console.log(`📏 Buffer Size: ${result.file_size} bytes`);
    const textPreview = result.extracted_text.substring(0, 150);
    console.log(`📝 Text Preview: "${textPreview}${result.extracted_text.length > 150 ? '...' : ''}"`);

  } catch (error) {
    console.log(`❌ JSON Buffer test error: ${error.message}`);
  }

  // Test 2: Text Buffer - use actual sample.txt content
  try {
    console.log('\n📄 Testing: Text Buffer (from sample.txt)');
    console.log('-'.repeat(25));

    const textContent = fs.readFileSync(path.join('./test', 'sample.txt'), 'utf8');
    const textBuffer = Buffer.from(textContent);

    const result = await processor.processDocument(textBuffer, {
      filename: 'test.txt',
      mimetype: 'text/plain'
    });

    console.log(`✅ File Type: ${result.file_type}`);
    console.log(`� Buffer Size: ${result.file_size} bytes`);
    console.log(`�📝 Extracted Text: "${result.extracted_text}"`);

  } catch (error) {
    console.log(`❌ Text Buffer test error: ${error.message}`);
  }

  // Test 3: HTML Buffer - use actual sample.html content
  try {
    console.log('\n📄 Testing: HTML Buffer (from sample.html)');
    console.log('-'.repeat(25));

    const htmlContent = fs.readFileSync(path.join('./test', 'sample.html'), 'utf8');

    const htmlBuffer = Buffer.from(htmlContent);

    const result = await processor.processDocument(htmlBuffer, {
      filename: 'test.html',
      mimetype: 'text/html'
    });

    console.log(`✅ File Type: ${result.file_type}`);
    console.log(`📏 Buffer Size: ${result.file_size} bytes`);
    const textPreview = result.extracted_text.substring(0, 150);
    console.log(`📝 Text Preview: "${textPreview}${result.extracted_text.length > 150 ? '...' : ''}"`);

  } catch (error) {
    console.log(`❌ HTML Buffer test error: ${error.message}`);
  }
}

async function runComprehensiveTests() {
  // Check for API key
  const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';

  if (apiKey === 'YOUR_GOOGLE_API_KEY_HERE') {
    console.log('⚠️  GOOGLE_API_KEY not set. Some tests may fail.');
    console.log('Set it with: $env:GOOGLE_API_KEY = "your-key-here"');
    console.log('');
  }

  const processor = new UniversalDocumentProcessor(apiKey);

  console.log('🧪 Universal Document Processor - Comprehensive Test Suite\n');
  console.log('Testing all extraction possibilities...\n');

  try {
    // Test local files
    await runFileTests(processor);

    // Test URLs
    await runUrlTests(processor);

    // Test buffer processing with real file content
    await runBufferTests(processor);

    // Show supported formats
    console.log('\n📋 Supported File Formats\n');
    console.log('='.repeat(50));
    const formats = processor.getSupportedFormats();
    console.log(`Total formats supported: ${formats.length}`);
    console.log('Formats:', formats.join(', '));

    // Show cache stats
    console.log('\n💾 Cache Statistics\n');
    console.log('='.repeat(50));
    const cacheStats = processor.getCacheStats();
    console.log(`Cache size: ${cacheStats.size} items`);
    if (cacheStats.keys.length > 0) {
      console.log('Cached items:', cacheStats.keys.length);
    }

  } catch (error) {
    console.error('💥 Test suite error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Testing completed!');
  console.log('\n💡 Tips:');
  console.log('- All test files are in the test/ folder');
  console.log('- Set GOOGLE_API_KEY for AI-powered processing');
  console.log('- Check test/README.md for more details');
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);