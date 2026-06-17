import UniversalDocumentProcessor from './index.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) { console.log('  PASS', label); passed++; }
  else { console.log('  FAIL', label); failed++; }
}

async function run() {
  const p = new UniversalDocumentProcessor();

  // === Edge case inputs ===
  console.log('--- Edge Case Inputs ---');

  const r1 = await p.processDocument(12345);
  assert('Number input returns error gracefully', r1.file_type === 'unknown' && r1.extracted_text === '' && !!r1.metadata.error);

  const r3 = await p.processDocument('/nonexistent/file.txt');
  assert('Non-existent file returns error', !!r3.metadata.error && r3.extracted_text === '');

  const r4 = await p.processDocument(Buffer.alloc(0), { filename: 'empty.txt', mimetype: 'text/plain' });
  assert('Empty buffer returns result', r4.file_type === 'txt' && r4.extracted_text === '');

  const r5 = await p.processDocument(Buffer.from('hello'), {});
  assert('Buffer no filename defaults to unknown ext', r5.file_type === 'unknown');

  const smallP = new UniversalDocumentProcessor(null, { maxFileSize: 10 });
  const r6 = await smallP.processDocument(Buffer.alloc(100), { filename: 'big.txt', mimetype: 'text/plain' });
  assert('Oversized buffer returns error', !!r6.metadata.error && r6.metadata.error.includes('too large'));

  // === Cache ===
  console.log('\n--- Cache ---');

  const cacheP = new UniversalDocumentProcessor();
  const r7a = await cacheP.processDocument('./test/sample.txt');
  const r7b = await cacheP.processDocument('./test/sample.txt');
  assert('Cache returns same result on second call', r7a.extracted_text === r7b.extracted_text && cacheP.getCacheStats().size === 1);

  const noCacheP = new UniversalDocumentProcessor(null, { cacheEnabled: false });
  await noCacheP.processDocument('./test/sample.txt');
  assert('Cache disabled: size stays 0', noCacheP.getCacheStats().size === 0);

  cacheP.clearCache();
  assert('clearCache empties cache', cacheP.getCacheStats().size === 0);

  // === Supported formats ===
  console.log('\n--- Formats ---');
  const formats = p.getSupportedFormats();
  assert('42 formats registered', formats.length === 42);
  assert('Includes pdf, jpg, csv, html', formats.includes('pdf') && formats.includes('jpg') && formats.includes('csv') && formats.includes('html'));

  // === URL detection ===
  console.log('\n--- URL Detection ---');
  assert('http:// is URL', p.isURL('http://example.com'));
  assert('https:// is URL', p.isURL('https://example.com'));
  assert('ftp:// is URL', p.isURL('ftp://files.example.com'));
  assert('C:\\ path is NOT URL', !p.isURL('C:\\Users\\file.txt'));
  assert('E:\\Projects is NOT URL', !p.isURL('E:\\Projects\\test'));
  assert('Random string NOT URL', !p.isURL('hello world'));
  assert('Empty string NOT URL', !p.isURL(''));

  // === YouTube detection ===
  console.log('\n--- YouTube ---');
  assert('youtube.com/watch detected', p.isYouTubeURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  assert('youtu.be detected', p.isYouTubeURL('https://youtu.be/dQw4w9WgXcQ'));
  assert('youtube embed detected', p.isYouTubeURL('https://www.youtube.com/embed/dQw4w9WgXcQ'));
  assert('non-youtube NOT detected', !p.isYouTubeURL('https://example.com'));
  assert('extractYouTubeId correct', p.extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ');
  assert('extractYouTubeId returns null for non-youtube', p.extractYouTubeId('https://example.com') === null);

  // === MIME type mapping ===
  console.log('\n--- MIME Mapping ---');
  assert('application/json -> json', p.getExtensionFromMimeType('application/json') === 'json');
  assert('application/pdf -> pdf', p.getExtensionFromMimeType('application/pdf') === 'pdf');
  assert('text/html;charset -> html', p.getExtensionFromMimeType('text/html; charset=utf-8') === 'html');
  assert('image/svg+xml -> svg', p.getExtensionFromMimeType('image/svg+xml') === 'svg');
  assert('application/xml -> xml', p.getExtensionFromMimeType('application/xml') === 'xml');
  assert('text/yaml -> yaml', p.getExtensionFromMimeType('text/yaml') === 'yaml');
  assert('unknown -> unknown', p.getExtensionFromMimeType('application/x-weird') === 'unknown');

  assert('image/png -> image type', p.getFileTypeFromMimeType('image/png') === 'image');
  assert('application/pdf -> pdf type', p.getFileTypeFromMimeType('application/pdf') === 'pdf');
  assert('application/msword -> doc type', p.getFileTypeFromMimeType('application/msword') === 'doc');
  assert('video/mp4 -> video type', p.getFileTypeFromMimeType('video/mp4') === 'video');
  assert('audio/mp3 -> audio type', p.getFileTypeFromMimeType('audio/mp3') === 'audio');

  // === isTextLikeContent ===
  console.log('\n--- Text Detection ---');
  assert('ASCII text is text-like', p.isTextLikeContent(Buffer.from('Hello world, this is a test of text detection that should pass easily')));
  assert('Lots of nulls NOT text-like', !p.isTextLikeContent(Buffer.alloc(100, 0)));
  assert('Empty buffer NOT text-like', !p.isTextLikeContent(Buffer.alloc(0)));
  assert('null NOT text-like', !p.isTextLikeContent(null));

  // === isAISupportedMimeType ===
  console.log('\n--- AI MIME Support ---');
  assert('image/jpeg supported', p.isAISupportedMimeType('image/jpeg'));
  assert('application/pdf supported', p.isAISupportedMimeType('application/pdf'));
  assert('audio/mp3 supported', p.isAISupportedMimeType('audio/mp3'));
  assert('application/zip NOT supported', !p.isAISupportedMimeType('application/zip'));
  assert('case insensitive', p.isAISupportedMimeType('IMAGE/JPEG'));

  // === Custom provider integration ===
  console.log('\n--- Custom Provider ---');

  let callCount = 0;
  let lastPrompt = '';
  let lastData = null;
  const customP = new UniversalDocumentProcessor({
    provider: async (prompt, inlineData) => {
      callCount++;
      lastPrompt = prompt;
      lastData = inlineData;
      return 'AI extracted: test content';
    }
  });

  // .doc triggers AI
  callCount = 0;
  const docBuf = Buffer.from('fake doc content');
  const rDoc = await customP.processDocument(docBuf, { filename: 'test.doc', mimetype: 'application/msword' });
  assert('.doc calls custom provider', callCount > 0);
  assert('.doc provider receives prompt', lastPrompt.length > 0);
  assert('.doc provider receives inlineData with mimeType', lastData !== null && lastData.mimeType === 'application/msword');
  assert('.doc provider result used in output', rDoc.extracted_text === 'AI extracted: test content');

  // .rtf triggers AI with {text, metadata}
  callCount = 0;
  const rtfBuf = Buffer.from('{\\rtf1 hello}');
  const rRtf = await customP.processDocument(rtfBuf, { filename: 'test.rtf', mimetype: 'application/rtf' });
  assert('.rtf calls custom provider', callCount > 0);
  assert('.rtf returns text correctly', rRtf.extracted_text === 'AI extracted: test content');
  assert('.rtf file_type is rtf', rRtf.file_type === 'rtf');

  // .txt does NOT trigger AI
  callCount = 0;
  const txtBuf = Buffer.from('plain text content here');
  const rTxt = await customP.processDocument(txtBuf, { filename: 'test.txt', mimetype: 'text/plain' });
  assert('.txt does NOT call AI provider', callCount === 0);
  assert('.txt returns text content directly', rTxt.extracted_text === 'plain text content here');

  // .json does NOT trigger AI
  callCount = 0;
  const jsonBuf = Buffer.from('{"key": "value"}');
  const rJson = await customP.processDocument(jsonBuf, { filename: 'test.json', mimetype: 'application/json' });
  assert('.json does NOT call AI provider', callCount === 0);
  assert('.json extracts key-value text', rJson.extracted_text.includes('key') && rJson.extracted_text.includes('value'));

  // === Buffer with various file types ===
  console.log('\n--- Buffer File Types ---');

  // CSV from buffer
  const csvBuf = Buffer.from('name,age\nAlice,30\nBob,25');
  const rCsv = await p.processDocument(csvBuf, { filename: 'data.csv', mimetype: 'text/csv' });
  assert('CSV buffer extracts rows', rCsv.extracted_text.includes('Alice') && rCsv.extracted_text.includes('Bob'));
  assert('CSV metadata has row count', rCsv.metadata.rows === 2);

  // HTML from buffer
  const htmlBuf = Buffer.from('<html><head><title>Test</title></head><body><p>Hello World</p></body></html>');
  const rHtml = await p.processDocument(htmlBuf, { filename: 'page.html', mimetype: 'text/html' });
  assert('HTML buffer extracts title', rHtml.extracted_text.includes('Test'));
  assert('HTML buffer extracts body', rHtml.extracted_text.includes('Hello World'));

  // XML from buffer
  const xmlBuf = Buffer.from('<root><item>Value1</item><item>Value2</item></root>');
  const rXml = await p.processDocument(xmlBuf, { filename: 'data.xml', mimetype: 'application/xml' });
  assert('XML buffer extracts text', rXml.extracted_text.includes('Value1') && rXml.extracted_text.includes('Value2'));

  // SVG from buffer
  const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">SVG Text</text></svg>');
  const rSvg = await p.processDocument(svgBuf, { filename: 'icon.svg', mimetype: 'image/svg+xml' });
  assert('SVG buffer extracts text elements', rSvg.extracted_text.includes('SVG Text'));

  // === Consistency checks ===
  console.log('\n--- Output Consistency ---');

  // All results should have these fields
  const required = ['file_type', 'mime_type', 'file_size', 'file_url', 'file_hash', 'metadata', 'extracted_text'];
  const testResult = await p.processDocument('./test/sample.txt');
  const hasAll = required.every(key => key in testResult);
  assert('Result has all required fields', hasAll);
  assert('extracted_text is always string', typeof testResult.extracted_text === 'string');
  assert('file_hash is string', typeof testResult.file_hash === 'string');
  assert('file_size is number', typeof testResult.file_size === 'number');
  assert('metadata is object', typeof testResult.metadata === 'object');

  // Error results also have all fields
  const errResult = await p.processDocument('/nonexistent.txt');
  const errHasAll = required.every(key => key in errResult);
  assert('Error result has all required fields', errHasAll);
  assert('Error extracted_text is string (not null)', typeof errResult.extracted_text === 'string');

  // Buffer results have all fields
  const bufResult = await p.processDocument(Buffer.from('test'), { filename: 'a.txt', mimetype: 'text/plain' });
  const bufHasAll = required.every(key => key in bufResult);
  assert('Buffer result has all required fields', bufHasAll);
  assert('Buffer file_url is null', bufResult.file_url === null);

  // === Summary ===
  console.log('\n=== EDGE CASE RESULTS ===');
  console.log('  Passed:', passed);
  console.log('  Failed:', failed);
  console.log('  Total: ', passed + failed);
  if (failed > 0) process.exit(1);
  else console.log('\nAll edge case tests passed!');
}

run().catch(e => { console.error('Test crash:', e); process.exit(1); });
