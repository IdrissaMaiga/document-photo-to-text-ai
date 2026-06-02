# Document Photo to Text AI

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A powerful Node.js library for extracting text from various document formats using Google Gemini AI and specialized parsers. Supports PDFs, images, Word documents, Excel spreadsheets, CSV files, HTML pages, YouTube videos, and more.

## Features

- **Universal Document Processing**: Handles over 20 file formats including PDFs, images, documents, spreadsheets, and web content
- **AI-Powered OCR**: Uses Google Gemini AI for accurate text extraction from images and complex documents
- **YouTube Support**: Extracts transcripts and metadata from YouTube videos
- **Web Content Processing**: Scrapes and extracts text from web pages
- **Caching**: Built-in caching for improved performance
- **Buffer Support**: Process files directly from memory buffers
- **Comprehensive Metadata**: Returns detailed file information and processing metadata

## Installation

```bash
npm install document-photo-to-text-ai
```

[![npm version](https://badge.fury.io/js/document-photo-to-text-ai.svg)](https://badge.fury.io/js/document-photo-to-text-ai)
[![npm downloads](https://img.shields.io/npm/dm/document-photo-to-text-ai.svg)](https://www.npmjs.com/package/document-photo-to-text-ai)

**Package Status**: ✅ Published on npm registry  
**Version**: 1.0.0  
**License**: MIT  
**Node.js**: >= 18.0.0

## Quick Start

```javascript
import UniversalDocumentProcessor from 'document-photo-to-text-ai';

const processor = new UniversalDocumentProcessor('YOUR_GOOGLE_API_KEY');

// Process a local file
const result = await processor.processDocument('./document.pdf');
console.log(result.extracted_text);

// Process an image
const imageResult = await processor.processDocument('./photo.jpg');
console.log(imageResult.extracted_text);

// Process a YouTube video
const youtubeResult = await processor.processDocument('https://www.youtube.com/watch?v=VIDEO_ID');
console.log(youtubeResult.extracted_text);

// Process a web page
const webResult = await processor.processDocument('https://example.com');
console.log(webResult.extracted_text);

// Process from buffer
const buffer = fs.readFileSync('./document.docx');
const bufferResult = await processor.processDocument(buffer, {
  filename: 'document.docx',
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
});
console.log(bufferResult.extracted_text);
```

## Supported Formats

### Documents
- PDF (.pdf) - Text extraction with OCR fallback
- Word (.docx, .doc) - Full text extraction
- PowerPoint (.pptx, .ppt) - Presentation content extraction

### Spreadsheets
- Excel (.xlsx, .xls) - Structured data extraction
- CSV (.csv) - Tabular data processing

### Images
- JPEG, PNG, WebP, GIF, BMP, TIFF - OCR using Gemini Vision
- SVG - Text content extraction

### Code & Text
- Plain text (.txt, .md, .json, .xml, .yaml, .yml, .toml, .ini, .conf, .log)
- Programming files (.js, .ts, .py, .java, .cpp, .c, .cs, .php, .rb, .go, .rs, .sql)

### Web & Media
- HTML pages - Content extraction
- YouTube videos - Transcript and metadata extraction

## MCP Server (AI Tool Integration)

This package can also be used as a Model Context Protocol (MCP) server, allowing AI assistants like Claude or other MCP-compatible tools to access document processing capabilities.

### Running as MCP Server

```bash
# Install dependencies
npm install

# Set your Google AI API key
export GOOGLE_API_KEY="your-api-key-here"

# Run the MCP server
npm run mcp-server
```

### MCP Tools Available

The MCP server exposes the following tools:

#### `process_document`
Process a document, image, or URL to extract text content.

**Parameters:**
- `input` (string): File path, URL, or YouTube URL to process
- `googleApiKey` (string, optional): Google Gemini API key (if not set in environment)

**Example:**
```json
{
  "input": "./document.pdf",
  "googleApiKey": "your-api-key"
}
```

#### `get_supported_formats`
Get a list of all supported file formats and document types.

**Parameters:** None

#### `process_buffer`
Process raw file content as a buffer with specified MIME type.

**Parameters:**
- `content` (string): Base64 encoded file content
- `filename` (string): Original filename with extension
- `mimetype` (string): MIME type of the content
- `googleApiKey` (string, optional): Google Gemini API key

#### `get_cache_stats`
Get statistics about the processing cache.

**Parameters:** None

### Integrating with AI Assistants

To use this MCP server with AI assistants:

1. **Claude Desktop**: Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "document-processor": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "GOOGLE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop Configuration

Create or update your `claude_desktop_config.json` file (usually located in `~/Library/Application Support/Claude/` on macOS or the equivalent directory on other platforms):

```json
{
  "mcpServers": {
    "document-processor": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server.js"],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key-here"
      }
    }
  }
}
```

Replace `/absolute/path/to/mcp-server.js` with the actual absolute path to your `mcp-server.js` file.

### Usage with AI Assistants

Once configured, you can ask Claude to:

- "Extract text from this PDF file: /path/to/document.pdf"
- "What formats can you process?"
- "Get the text content from this image: /path/to/photo.jpg"
- "Process this YouTube video: https://youtu.be/VIDEO_ID"
- "Extract data from this Excel file: /path/to/spreadsheet.xlsx"

The AI assistant will use the MCP tools automatically to process documents and return the extracted text.

## API Reference

### Constructor

```javascript
const processor = new UniversalDocumentProcessor(googleApiKey, options);
```

**Parameters:**
- `googleApiKey` (string): Your Google AI API key
- `options` (object, optional):
  - `maxFileSize` (number): Maximum file size in bytes (default: 20MB)
  - `timeout` (number): Request timeout in milliseconds (default: 30000)
  - `cacheEnabled` (boolean): Enable caching (default: true)

### processDocument(input, options)

Processes a document and extracts text content.

**Parameters:**
- `input` (string|Buffer): File path, URL, YouTube URL, or Buffer
- `options` (object, optional): Options for buffer processing
  - `filename` (string): Original filename
  - `mimetype` (string): MIME type of the buffer

**Returns:** Promise resolving to an object with:
- `file_type`: File extension or type
- `mime_type`: MIME type
- `file_size`: File size in bytes
- `file_url`: URL if processed from web
- `file_hash`: SHA256 hash of the file
- `metadata`: Processing metadata
- `extracted_text`: Extracted text content

## Google AI Setup

1. Get a Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set up billing if you plan to process many documents
3. Initialize the processor with your API key

## Examples

### Processing Different File Types

```javascript
// PDF with text
const pdfResult = await processor.processDocument('./contract.pdf');

// Image with text
const imageResult = await processor.processDocument('./receipt.jpg');

// Word document
const wordResult = await processor.processDocument('./report.docx');

// Excel spreadsheet
const excelResult = await processor.processDocument('./data.xlsx');

// YouTube video
const videoResult = await processor.processDocument('https://youtu.be/dQw4w9WgXcQ');
```

### Batch Processing

```javascript
const files = ['./doc1.pdf', './doc2.docx', './image.jpg'];
const results = await Promise.all(
  files.map(file => processor.processDocument(file))
);

results.forEach((result, index) => {
  console.log(`File ${index + 1}:`, result.extracted_text.substring(0, 100) + '...');
});
```

### Error Handling

```javascript
try {
  const result = await processor.processDocument('./large-file.pdf');
  console.log(result.extracted_text);
} catch (error) {
  console.error('Processing failed:', error.message);
}
```

## Caching

The processor includes built-in caching to improve performance:

```javascript
// Check cache stats
console.log(processor.getCacheStats());

// Clear cache
processor.clearCache();
```

## Testing

A comprehensive test suite is included in the `test/` folder with sample files for all supported formats. To run the tests:

```bash
# Set your Google AI API key
export GOOGLE_API_KEY="your-api-key-here"

# Run the test suite
node run-tests.js
```

The test suite includes sample files for:
- Text files (.txt, .md, .log)
- Data formats (.json, .xml, .yaml, .toml, .ini, .csv)
- Code files (.js, .py)
- Web content (.html, .svg)

## Requirements

- Node.js >= 18.0.0
- Google AI API key with billing enabled for AI features

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.