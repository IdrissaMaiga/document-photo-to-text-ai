#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import UniversalDocumentProcessor from './index.js';

class DocumentProcessorMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'document-photo-to-text-ai',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.processor = null;
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'process_document',
            description: 'Process a document, image, or URL to extract text content. Supports 40+ file formats including PDF, Word, Excel, images, code files, and more.',
            inputSchema: {
              type: 'object',
              properties: {
                input: {
                  type: 'string',
                  description: 'File path, URL, or YouTube URL to process'
                },
                googleApiKey: {
                  type: 'string',
                  description: 'Google Gemini API key (optional if set in environment)'
                }
              },
              required: ['input']
            }
          },
          {
            name: 'get_supported_formats',
            description: 'Get a list of all supported file formats and document types',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'process_buffer',
            description: 'Process raw file content as a buffer with specified MIME type',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Base64 encoded file content'
                },
                filename: {
                  type: 'string',
                  description: 'Original filename with extension'
                },
                mimetype: {
                  type: 'string',
                  description: 'MIME type of the content'
                },
                googleApiKey: {
                  type: 'string',
                  description: 'Google Gemini API key (optional if set in environment)'
                }
              },
              required: ['content', 'filename', 'mimetype']
            }
          },
          {
            name: 'get_cache_stats',
            description: 'Get statistics about the processing cache',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'process_document':
            return await this.handleProcessDocument(args);
          case 'get_supported_formats':
            return await this.handleGetSupportedFormats(args);
          case 'process_buffer':
            return await this.handleProcessBuffer(args);
          case 'get_cache_stats':
            return await this.handleGetCacheStats(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async initializeProcessor(apiKey) {
    if (!this.processor) {
      const key = apiKey || process.env.GOOGLE_API_KEY;
      if (!key) {
        throw new Error('Google API key is required. Set GOOGLE_API_KEY environment variable or pass googleApiKey parameter.');
      }
      this.processor = new UniversalDocumentProcessor(key);
    }
    return this.processor;
  }

  async handleProcessDocument(args) {
    const { input, googleApiKey } = args;

    if (!input) {
      throw new Error('Input parameter is required');
    }

    const processor = await this.initializeProcessor(googleApiKey);
    const result = await processor.processDocument(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            file_type: result.file_type,
            mime_type: result.mime_type,
            file_size: result.file_size,
            file_url: result.file_url,
            extracted_text: result.extracted_text,
            metadata: result.metadata
          }, null, 2)
        }
      ]
    };
  }

  async handleGetSupportedFormats(args) {
    const processor = await this.initializeProcessor();
    const formats = processor.getSupportedFormats();

    return {
      content: [
        {
          type: 'text',
          text: `Supported file formats (${formats.length} total):\n\n${formats.join(', ')}\n\nCategories:\n• Documents: PDF, DOCX, DOC, RTF\n• Presentations: PPTX, PPT\n• Spreadsheets: XLSX, XLS, CSV\n• Code: JS, TS, PY, JAVA, CPP, CS, PHP, RB, GO, RS, SQL\n• Data: JSON, XML, YAML, TOML, INI\n• Images: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, SVG\n• Web: HTML, HTM\n• Text: TXT, MD, LOG`
        }
      ]
    };
  }

  async handleProcessBuffer(args) {
    const { content, filename, mimetype, googleApiKey } = args;

    if (!content || !filename || !mimetype) {
      throw new Error('content, filename, and mimetype parameters are required');
    }

    // Decode base64 content
    let buffer;
    try {
      buffer = Buffer.from(content, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 content');
    }

    const processor = await this.initializeProcessor(googleApiKey);
    const result = await processor.processDocument(buffer, { filename, mimetype });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            file_type: result.file_type,
            mime_type: result.mime_type,
            file_size: result.file_size,
            extracted_text: result.extracted_text,
            metadata: result.metadata
          }, null, 2)
        }
      ]
    };
  }

  async handleGetCacheStats(args) {
    const processor = await this.initializeProcessor();
    const stats = processor.getCacheStats();

    return {
      content: [
        {
          type: 'text',
          text: `Cache Statistics:\n• Size: ${stats.size} items\n• Keys: ${stats.keys.length} cached items\n• Cache enabled: ${processor.options.cacheEnabled}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Document Processor MCP Server running...');
  }
}

// Run the server
const server = new DocumentProcessorMCPServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});