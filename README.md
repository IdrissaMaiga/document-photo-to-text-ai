# Document Photo to Text AI

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
[![npm version](https://badge.fury.io/js/@iditechs%2Fdocument-photo-to-text-ai.svg)](https://badge.fury.io/js/@iditechs%2Fdocument-photo-to-text-ai)
[![npm downloads](https://img.shields.io/npm/dm/@iditechs/document-photo-to-text-ai.svg)](https://www.npmjs.com/package/@iditechs/document-photo-to-text-ai)

A powerful Node.js library for extracting text from various document formats using AI-powered OCR and specialized parsers. Supports multiple AI providers: **Google Gemini**, **OpenAI**, **Anthropic Claude**, and **OpenRouter** (hundreds of models with one API key).

Handles PDFs, images, Word documents, Excel spreadsheets, CSV files, HTML pages, YouTube videos, and 40+ formats total.

> **Note:** This package moved from `document-photo-to-text-ai` to `@iditechs/document-photo-to-text-ai`. The old unscoped package is no longer maintained.

## Features

- **Multi-Provider AI** — Choose your preferred AI provider: Gemini, OpenAI, Anthropic Claude, OpenRouter, or bring your own
- **Install Only What You Use** — Provider SDKs are optional; you never download the ones you don't use
- **42 Supported Formats** — PDFs, images, Word, Excel, PowerPoint, CSV, HTML, JSON, XML, YAML, code files, and more
- **AI-Powered OCR** — Uses AI vision models for accurate text extraction from images and scanned documents
- **Works Without AI** — Text-based formats (TXT, JSON, CSV, DOCX, XLSX, etc.) work without any AI provider
- **YouTube Support** — Extracts transcripts and metadata from YouTube videos
- **Web Content** — Scrapes and extracts text from any web page
- **Buffer Support** — Process files directly from memory buffers (great for uploads)
- **Built-in Caching** — Automatic caching for improved performance
- **Custom Providers** — Plug in any AI function as a custom provider

## Installation

```bash
npm install @iditechs/document-photo-to-text-ai
```

**You only download the AI provider you use.** No provider SDK is installed with this package. Add the one you need (only required for image/OCR features):

```bash
# For Google Gemini
npm install @google/genai

# For OpenAI
npm install openai

# For Anthropic Claude
npm install @anthropic-ai/sdk

# For OpenRouter: nothing to install (uses the built-in fetch)
```

If you call a provider whose SDK isn't installed, you get a clear error telling you which package to install. Projects that already have the older `@google/generative-ai` package keep working with it.

> **No AI SDK needed** if you only process text-based formats like TXT, JSON, CSV, DOCX, XLSX, HTML, XML, code files, etc.

## Quick Start

```javascript
import UniversalDocumentProcessor from '@iditechs/document-photo-to-text-ai';

// === Choose your AI provider ===

// Google Gemini
const processor = new UniversalDocumentProcessor({
  provider: 'gemini',
  apiKey: 'YOUR_GOOGLE_API_KEY',
  model: 'gemini-2.5-flash' // optional, default
});

// OpenAI
const processor = new UniversalDocumentProcessor({
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY',
  model: 'gpt-4o' // optional, default
});

// Anthropic Claude
const processor = new UniversalDocumentProcessor({
  provider: 'anthropic',
  apiKey: 'YOUR_ANTHROPIC_API_KEY',
  model: 'claude-sonnet-5-5' // optional, default
});

// OpenRouter — any vision model from https://openrouter.ai/models
const processor = new UniversalDocumentProcessor({
  provider: 'openrouter',
  apiKey: 'YOUR_OPENROUTER_API_KEY',
  model: 'google/gemini-2.5-flash', // optional, default
  siteUrl: 'https://your-site.com', // optional, sent as HTTP-Referer
  appName: 'Your App'               // optional, sent as X-Title
});

// No AI — text extraction only (PDF text, DOCX, Excel, CSV, etc.)
const processor = new UniversalDocumentProcessor();

// Backward compatible — string = Google API key (v1.x style)
const processor = new UniversalDocumentProcessor('YOUR_GOOGLE_API_KEY');

// === Process documents ===

// Local file
const result = await processor.processDocument('./document.pdf');
console.log(result.extracted_text);

// Image (requires AI provider)
const imageResult = await processor.processDocument('./photo.jpg');

// YouTube video
const ytResult = await processor.processDocument('https://www.youtube.com/watch?v=VIDEO_ID');

// Web page
const webResult = await processor.processDocument('https://example.com');

// Buffer (e.g., from file upload)
const buffer = fs.readFileSync('./report.docx');
const bufResult = await processor.processDocument(buffer, {
  filename: 'report.docx',
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});
```

## Custom AI Provider

Plug in any AI function:

```javascript
const processor = new UniversalDocumentProcessor({
  provider: async (prompt, inlineData) => {
    // inlineData = { data: 'base64...', mimeType: 'image/jpeg' } or undefined
    const response = await myCustomAI.generate(prompt, inlineData);
    return response.text;
  }
});
```

Or pass the function directly:

```javascript
const processor = new UniversalDocumentProcessor(async (prompt, inlineData) => {
  return extractedText;
});
```

## OpenAI with Custom Base URL (Azure, etc.)

```javascript
const processor = new UniversalDocumentProcessor({
  provider: 'openai',
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://your-resource.openai.azure.com/openai/deployments/gpt-4o',
  model: 'gpt-4o'
});
```

## Supported Formats

| Category | Formats |
|----------|---------|
| **Documents** | PDF, DOCX, DOC, RTF, TXT |
| **Presentations** | PPTX, PPT |
| **Spreadsheets** | XLSX, XLS, CSV |
| **Images** (AI required) | JPEG, PNG, WebP, GIF, BMP, TIFF |
| **Vector Graphics** | SVG |
| **Data** | JSON, XML, YAML, YML, TOML, INI, CONF |
| **Code** | JS, TS, PY, Java, C, CPP, CS, PHP, Ruby, Go, Rust, SQL |
| **Web** | HTML, HTM |
| **Markup** | Markdown (MD), LOG |
| **Media** | YouTube videos (transcripts) |

## API Reference

### `new UniversalDocumentProcessor(config?, options?)`

**config** (first argument):

| Type | Description |
|------|-------------|
| `{ provider: 'gemini', apiKey, model? }` | Google Gemini |
| `{ provider: 'openai', apiKey, model?, baseURL? }` | OpenAI / Azure OpenAI |
| `{ provider: 'anthropic', apiKey, model? }` | Anthropic Claude |
| `{ provider: 'openrouter', apiKey, model?, baseURL?, siteUrl?, appName? }` | OpenRouter (any model) |
| `{ provider: Function }` | Custom AI function |
| `Function` | Custom AI function (shorthand) |
| `string` | Google API key (v1.x backward compat) |
| `null` / `undefined` | No AI, text extraction only |

**options** (second argument):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFileSize` | number | 20MB | Maximum file size in bytes |
| `timeout` | number | 30000 | Request timeout in ms |
| `cacheEnabled` | boolean | true | Enable result caching |

### `processor.processDocument(input, options?)`

Process any document and extract text.

**Parameters:**
- `input` — File path (string), URL (string), YouTube URL (string), or Buffer
- `options` — For buffers: `{ filename: string, mimetype: string }`

**Returns:** `Promise<Object>`

```javascript
{
  file_type: 'pdf',              // File extension or type
  mime_type: 'application/pdf',  // MIME type
  file_size: 12345,              // Size in bytes
  file_url: null,                // URL if fetched from web
  file_hash: 'sha256...',       // SHA-256 hash
  metadata: { ... },            // Format-specific metadata
  extracted_text: '...'          // The extracted text content
}
```

### Other Methods

```javascript
processor.getSupportedFormats()  // Returns array of supported extensions
processor.getCacheStats()        // { size: number, keys: string[] }
processor.clearCache()           // Clear the result cache
processor.isURL(input)           // Check if input is a URL
processor.isYouTubeURL(url)      // Check if URL is YouTube
```

## Examples

### Batch Processing

```javascript
const files = ['./doc1.pdf', './doc2.docx', './image.jpg'];
const results = await Promise.all(
  files.map(file => processor.processDocument(file))
);
```

### Express File Upload

```javascript
app.post('/upload', async (req, res) => {
  const result = await processor.processDocument(req.file.buffer, {
    filename: req.file.originalname,
    mimetype: req.file.mimetype
  });
  res.json({ text: result.extracted_text });
});
```

### Text-Only (No AI Needed)

```javascript
const processor = new UniversalDocumentProcessor();

const csv = await processor.processDocument('./data.csv');
const json = await processor.processDocument('./config.json');
const docx = await processor.processDocument('./report.docx');
// All work without any AI provider installed
```

## Changelog

### v2.1.0
- Published as `@iditechs/document-photo-to-text-ai`
- New **OpenRouter** provider (no SDK needed)
- Gemini now uses the current `@google/genai` SDK (the legacy `@google/generative-ai` still works if installed)
- Real PowerPoint (`.pptx`) text extraction, slide by slide, without AI
- PDF parsing upgraded to `pdf-parse` v2 (handles more PDFs without AI)
- OpenAI: PDFs and documents are sent as files instead of images
- Buffers: real image type detected from the file bytes; format inferred from `mimetype` when the filename has no extension
- URLs: redirects are followed and HTTP errors (404, 500) are reported instead of processed
- YouTube: switched to the maintained `@distube/ytdl-core`; captions are still fetched if video info fails
- Updated dependencies (SheetJS `xlsx` 0.20.3 from the official CDN, `cheerio` 1.x, `mime-types` 3.x)
- Requires Node.js 20.18.1 or newer

## Migration from v1.x

v2.0 is backward compatible — existing v1.x code still works:

```javascript
// v1.x code — works unchanged in v2.0
const processor = new UniversalDocumentProcessor('YOUR_GOOGLE_API_KEY');
```

**What changed:**
- AI provider SDKs are optional peer dependencies — install only the one you use (`@google/genai` for Gemini)
- Added OpenAI and Anthropic support via object config
- MCP server removed (use the library directly instead)

To switch providers, just change the constructor:

```javascript
const processor = new UniversalDocumentProcessor({
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_KEY'
});
```

## Requirements

- Node.js >= 20.18.1
- At least one AI provider SDK installed, or an OpenRouter API key (only for image OCR / vision features)

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
