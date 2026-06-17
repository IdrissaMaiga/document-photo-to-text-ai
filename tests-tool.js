import UniversalDocumentProcessor from './index.js';
import fs from 'fs';
import path from 'path';

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

const testUrls = [
  {
    url: 'https://www.google.com',
    description: 'Google homepage (HTML extraction)'
  },
  {
    url: 'https://httpbin.org/json',
    description: 'JSON API response'
  }
];

function resolveProviderConfig() {
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.GOOGLE_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GOOGLE_API_KEY };
  }
  return null;
}

async function runFileTests(processor) {
  console.log('--- Testing Local Files ---\n');

  let passed = 0;
  let failed = 0;

  for (const fileName of testFiles) {
    const filePath = path.join('./test', fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP ${fileName}: File not found`);
      continue;
    }

    try {
      const result = await processor.processDocument(filePath);

      if (!result.extracted_text && result.extracted_text !== '') {
        console.log(`  FAIL ${fileName}: extracted_text is ${result.extracted_text}`);
        failed++;
        continue;
      }

      if (!result.file_type) {
        console.log(`  FAIL ${fileName}: missing file_type`);
        failed++;
        continue;
      }

      if (!result.file_hash) {
        console.log(`  FAIL ${fileName}: missing file_hash`);
        failed++;
        continue;
      }

      const textLen = result.extracted_text.length;
      console.log(`  PASS ${fileName} (type=${result.file_type}, size=${result.file_size}b, text=${textLen} chars)`);
      passed++;

    } catch (error) {
      console.log(`  FAIL ${fileName}: ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

async function runBufferTests(processor) {
  console.log('\n--- Testing Buffer Processing ---\n');

  let passed = 0;
  let failed = 0;

  const bufferTests = [
    { file: 'sample.json', mime: 'application/json' },
    { file: 'sample.txt', mime: 'text/plain' },
    { file: 'sample.html', mime: 'text/html' },
    { file: 'sample.csv', mime: 'text/csv' },
    { file: 'sample.xml', mime: 'application/xml' },
  ];

  for (const { file, mime } of bufferTests) {
    const filePath = path.join('./test', file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP ${file}: File not found`);
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const result = await processor.processDocument(buffer, {
        filename: file,
        mimetype: mime
      });

      if (result.extracted_text === null || result.extracted_text === undefined) {
        console.log(`  FAIL Buffer(${file}): extracted_text is null/undefined`);
        failed++;
        continue;
      }

      if (result.extracted_text.length === 0) {
        console.log(`  FAIL Buffer(${file}): extracted_text is empty`);
        failed++;
        continue;
      }

      console.log(`  PASS Buffer(${file}) (text=${result.extracted_text.length} chars)`);
      passed++;

    } catch (error) {
      console.log(`  FAIL Buffer(${file}): ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

async function runConstructorTests() {
  console.log('\n--- Testing Constructor Variants ---\n');

  let passed = 0;
  let failed = 0;

  // Test 1: No config (text extraction only)
  try {
    const p = new UniversalDocumentProcessor();
    const formats = p.getSupportedFormats();
    if (formats.length > 20) {
      console.log(`  PASS No-config constructor (${formats.length} formats)`);
      passed++;
    } else {
      console.log(`  FAIL No-config constructor: only ${formats.length} formats`);
      failed++;
    }
  } catch (error) {
    console.log(`  FAIL No-config constructor: ${error.message}`);
    failed++;
  }

  // Test 2: String config (backward compat)
  try {
    const p = new UniversalDocumentProcessor('fake-key-for-test');
    const formats = p.getSupportedFormats();
    console.log(`  PASS String config (backward compat, ${formats.length} formats)`);
    passed++;
  } catch (error) {
    console.log(`  FAIL String config: ${error.message}`);
    failed++;
  }

  // Test 3: Object config
  try {
    const p = new UniversalDocumentProcessor({ provider: 'gemini', apiKey: 'fake-key' });
    console.log(`  PASS Object config (gemini)`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Object config: ${error.message}`);
    failed++;
  }

  // Test 4: Object config with OpenAI
  try {
    const p = new UniversalDocumentProcessor({ provider: 'openai', apiKey: 'fake-key', model: 'gpt-4o' });
    console.log(`  PASS Object config (openai)`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Object config openai: ${error.message}`);
    failed++;
  }

  // Test 5: Object config with Anthropic
  try {
    const p = new UniversalDocumentProcessor({ provider: 'anthropic', apiKey: 'fake-key' });
    console.log(`  PASS Object config (anthropic)`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Object config anthropic: ${error.message}`);
    failed++;
  }

  // Test 6: Function config
  try {
    const customFn = async (prompt, inlineData) => 'custom result';
    const p = new UniversalDocumentProcessor(customFn);
    console.log(`  PASS Function config (custom provider)`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Function config: ${error.message}`);
    failed++;
  }

  // Test 7: Options work
  try {
    const p = new UniversalDocumentProcessor(null, {
      maxFileSize: 50 * 1024 * 1024,
      timeout: 60000,
      cacheEnabled: false
    });
    if (p.options.maxFileSize === 50 * 1024 * 1024 && p.options.timeout === 60000 && p.options.cacheEnabled === false) {
      console.log(`  PASS Options (maxFileSize, timeout, cacheEnabled)`);
      passed++;
    } else {
      console.log(`  FAIL Options not applied correctly`);
      failed++;
    }
  } catch (error) {
    console.log(`  FAIL Options: ${error.message}`);
    failed++;
  }

  // Test 8: Cache works
  try {
    const p = new UniversalDocumentProcessor();
    const stats = p.getCacheStats();
    if (stats.size === 0) {
      console.log(`  PASS Cache stats (empty on init)`);
      passed++;
    } else {
      console.log(`  FAIL Cache not empty on init`);
      failed++;
    }
    p.clearCache();
    console.log(`  PASS clearCache()`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Cache: ${error.message}`);
    failed++;
  }

  return { passed, failed };
}

async function runCustomProviderTest() {
  console.log('\n--- Testing Custom AI Provider ---\n');

  let passed = 0;
  let failed = 0;

  const customFn = async (prompt, inlineData) => {
    return `Custom AI processed: prompt length=${prompt.length}, hasData=${!!inlineData}`;
  };

  const processor = new UniversalDocumentProcessor({ provider: customFn });

  // Test that custom provider is used for image-like processing
  try {
    const fakeImageBuffer = Buffer.alloc(10000, 0xFF);
    const result = await processor.processDocument(fakeImageBuffer, {
      filename: 'test.jpg',
      mimetype: 'image/jpeg'
    });

    // Image processing with our custom provider should return something
    console.log(`  PASS Custom provider for image buffer (type=${result.file_type})`);
    passed++;
  } catch (error) {
    console.log(`  FAIL Custom provider image: ${error.message}`);
    failed++;
  }

  // Test that text files work without hitting the provider
  try {
    const txtBuffer = Buffer.from('Hello world test content');
    const result = await processor.processDocument(txtBuffer, {
      filename: 'test.txt',
      mimetype: 'text/plain'
    });

    if (result.extracted_text === 'Hello world test content') {
      console.log(`  PASS Text file bypasses AI provider`);
      passed++;
    } else {
      console.log(`  FAIL Text content mismatch: "${result.extracted_text}"`);
      failed++;
    }
  } catch (error) {
    console.log(`  FAIL Text bypass: ${error.message}`);
    failed++;
  }

  return { passed, failed };
}

async function runUrlTests(processor) {
  console.log('\n--- Testing URL Processing ---\n');

  let passed = 0;
  let failed = 0;

  for (const { url, description } of testUrls) {
    try {
      const result = await processor.processDocument(url);

      if (result.extracted_text && result.extracted_text.length > 0) {
        console.log(`  PASS ${description} (text=${result.extracted_text.length} chars)`);
        passed++;
      } else {
        console.log(`  FAIL ${description}: no text extracted`);
        failed++;
      }
    } catch (error) {
      console.log(`  FAIL ${description}: ${error.message}`);
      failed++;
    }
  }

  return { passed, failed };
}

async function runComprehensiveTests() {
  const config = resolveProviderConfig();

  console.log('=== Document Photo to Text AI v2.0 — Test Suite ===\n');

  if (config) {
    console.log(`AI Provider: ${config.provider}`);
  } else {
    console.log('AI Provider: NONE (text extraction only, image/OCR tests will be limited)');
    console.log('Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY to enable AI tests.');
  }
  console.log('');

  const processor = new UniversalDocumentProcessor(config);

  let totalPassed = 0;
  let totalFailed = 0;

  // Constructor tests
  const c = await runConstructorTests();
  totalPassed += c.passed;
  totalFailed += c.failed;

  // Custom provider tests
  const cp = await runCustomProviderTest();
  totalPassed += cp.passed;
  totalFailed += cp.failed;

  // File tests
  const f = await runFileTests(processor);
  totalPassed += f.passed;
  totalFailed += f.failed;

  // Buffer tests
  const b = await runBufferTests(processor);
  totalPassed += b.passed;
  totalFailed += b.failed;

  // URL tests
  const u = await runUrlTests(processor);
  totalPassed += u.passed;
  totalFailed += u.failed;

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Total:  ${totalPassed + totalFailed}`);

  if (totalFailed > 0) {
    console.log('\nSome tests failed. Check output above.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

runComprehensiveTests().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
