import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import mime from 'mime-types';
import { URL } from 'url';
import { Readable } from 'stream';

// Document processing libraries
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import * as cheerio from 'cheerio';
import ytdl from 'ytdl-core';
import { getSubtitles } from 'youtube-captions-scraper';

async function createAIProvider(config) {
  if (!config) return null;

  const { provider, apiKey, model, baseURL } = config;

  if (typeof provider === 'function') {
    return { name: 'custom', generateContent: provider };
  }

  switch (provider) {
    case 'gemini': {
      let GoogleGenerativeAI;
      try {
        const mod = await import('@google/generative-ai');
        GoogleGenerativeAI = mod.GoogleGenerativeAI;
      } catch {
        throw new Error('Gemini provider requires "@google/generative-ai". Install it with: npm install @google/generative-ai');
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const aiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.5-flash' });
      return {
        name: 'gemini',
        async generateContent(prompt, inlineData) {
          const parts = [prompt];
          if (inlineData) {
            parts.push({ inlineData: { data: inlineData.data, mimeType: inlineData.mimeType } });
          }
          const result = await aiModel.generateContent(parts);
          return result.response.text();
        }
      };
    }

    case 'openai': {
      let OpenAI;
      try {
        const mod = await import('openai');
        OpenAI = mod.default || mod.OpenAI;
      } catch {
        throw new Error('OpenAI provider requires "openai". Install it with: npm install openai');
      }
      const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
      const modelName = model || 'gpt-4o';
      return {
        name: 'openai',
        async generateContent(prompt, inlineData) {
          const content = [{ type: 'text', text: prompt }];
          if (inlineData) {
            content.push({
              type: 'image_url',
              image_url: { url: `data:${inlineData.mimeType};base64,${inlineData.data}` }
            });
          }
          const result = await client.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content }]
          });
          return result.choices[0].message.content;
        }
      };
    }

    case 'anthropic': {
      let Anthropic;
      try {
        const mod = await import('@anthropic-ai/sdk');
        Anthropic = mod.default || mod.Anthropic;
      } catch {
        throw new Error('Anthropic provider requires "@anthropic-ai/sdk". Install it with: npm install @anthropic-ai/sdk');
      }
      const client = new Anthropic({ apiKey });
      const modelName = model || 'claude-sonnet-4-20250514';
      return {
        name: 'anthropic',
        async generateContent(prompt, inlineData) {
          const content = [];
          if (inlineData) {
            const mt = inlineData.mimeType.toLowerCase();
            if (mt.startsWith('image/')) {
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: mt, data: inlineData.data }
              });
            } else if (mt === 'application/pdf') {
              content.push({
                type: 'document',
                source: { type: 'base64', media_type: mt, data: inlineData.data }
              });
            } else {
              throw new Error(`Anthropic does not support inline ${mt} content`);
            }
          }
          content.push({ type: 'text', text: prompt });
          const result = await client.messages.create({
            model: modelName,
            max_tokens: 4096,
            messages: [{ role: 'user', content }]
          });
          return result.content[0].text;
        }
      };
    }

    default:
      throw new Error(`Unknown AI provider: "${provider}". Supported: gemini, openai, anthropic, or pass a custom function.`);
  }
}

class UniversalDocumentProcessor {
  /**
   * @param {string|object|function} [config] - Google API key (string, backward compat), provider config object, or custom AI function
   *   Config object: { provider: 'gemini'|'openai'|'anthropic'|Function, apiKey: string, model?: string, baseURL?: string }
   * @param {object} [options] - Processing options: maxFileSize, timeout, cacheEnabled
   */
  constructor(config, options = {}) {
    if (typeof config === 'string') {
      this._providerConfig = { provider: 'gemini', apiKey: config };
    } else if (typeof config === 'function') {
      this._providerConfig = { provider: config };
    } else if (typeof config === 'object' && config !== null) {
      this._providerConfig = config;
    } else {
      this._providerConfig = null;
    }

    this._aiProvider = null;

    this.options = {
      maxFileSize: options.maxFileSize || 20 * 1024 * 1024,
      timeout: options.timeout || 30000,
      cacheEnabled: options.cacheEnabled !== false,
      ...options
    };

    this.cache = new Map();
    this.supportedFormats = {
      // Documents
      'pdf': this.processPDF.bind(this),
      'docx': this.processWord.bind(this),
      'doc': this.processWordLegacy.bind(this),
      'txt': this.processText.bind(this),
      'rtf': this.processWithAI.bind(this),

      // Presentations
      'pptx': this.processPowerPoint.bind(this),
      'ppt': this.processPowerPoint.bind(this),

      // Data formats
      'json': this.processJSON.bind(this),
      'xml': this.processXML.bind(this),
      'yaml': this.processText.bind(this),
      'yml': this.processText.bind(this),
      'md': this.processText.bind(this),
      'markdown': this.processText.bind(this),
      'toml': this.processText.bind(this),
      'ini': this.processText.bind(this),
      'conf': this.processText.bind(this),
      'log': this.processText.bind(this),

      // Code files
      'js': this.processText.bind(this),
      'ts': this.processText.bind(this),
      'py': this.processText.bind(this),
      'java': this.processText.bind(this),
      'cpp': this.processText.bind(this),
      'c': this.processText.bind(this),
      'cs': this.processText.bind(this),
      'php': this.processText.bind(this),
      'rb': this.processText.bind(this),
      'go': this.processText.bind(this),
      'rs': this.processText.bind(this),
      'sql': this.processText.bind(this),

      // Spreadsheets
      'xlsx': this.processExcel.bind(this),
      'xls': this.processExcel.bind(this),
      'csv': this.processCSV.bind(this),

      // Images
      'png': this.processImage.bind(this),
      'jpg': this.processImage.bind(this),
      'jpeg': this.processImage.bind(this),
      'webp': this.processImage.bind(this),
      'gif': this.processImage.bind(this),
      'bmp': this.processImage.bind(this),
      'tiff': this.processImage.bind(this),
      'svg': this.processSVG.bind(this),

      // Web content
      'html': this.processHTML.bind(this),
      'htm': this.processHTML.bind(this)
    };
  }

  async _getAIProvider() {
    if (this._aiProvider) return this._aiProvider;
    if (!this._providerConfig) return null;
    this._aiProvider = await createAIProvider(this._providerConfig);
    return this._aiProvider;
  }

  async _aiGenerateContent(prompt, inlineData) {
    const provider = await this._getAIProvider();
    if (!provider) {
      throw new Error('No AI provider configured. Pass a provider config to the constructor or use: new UniversalDocumentProcessor({ provider: "gemini", apiKey: "..." })');
    }
    return provider.generateContent(prompt, inlineData);
  }

  async processDocument(input, options = {}) {
    try {
      if (Buffer.isBuffer(input)) {
        return await this.processBuffer(input, options);
      }

      const inputHash = crypto.createHash('md5').update(input).digest('hex');

      if (this.options.cacheEnabled && this.cache.has(inputHash)) {
        return this.cache.get(inputHash);
      }

      let result;

      if (this.isYouTubeURL(input)) {
        result = await this.processYouTube(input);
      } else if (this.isURL(input)) {
        result = await this.processURL(input);
      } else {
        result = await this.processLocalFile(input);
      }

      if (this.options.cacheEnabled && result) {
        this.cache.set(inputHash, result);
      }

      return result;

    } catch (error) {
      console.error('Error processing document:', error);
      return {
        file_type: 'unknown',
        mime_type: null,
        file_size: null,
        file_url: this.isURL(input) ? input : null,
        file_hash: null,
        metadata: { error: error.message },
        extracted_text: ''
      };
    }
  }

  async processBuffer(buffer, options = {}) {
    try {
      const { filename = 'unknown', mimetype = 'application/octet-stream' } = options;

      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      const fileExtension = filename.includes('.') ?
        filename.split('.').pop().toLowerCase() :
        'unknown';

      if (buffer.length > this.options.maxFileSize) {
        throw new Error(`File too large: ${buffer.length} bytes (max: ${this.options.maxFileSize})`);
      }

      let extractedText = '';
      let metadata = {
        original_name: filename,
        processing_method: 'buffer',
        file_extension: fileExtension
      };

      const processor = this.supportedFormats[fileExtension];

      if (processor) {
        try {
          const processed = await processor(null, buffer);
          extractedText = processed.text || '';
          metadata = { ...metadata, ...processed.metadata };
        } catch (processorError) {
          console.warn(`Processor failed for ${fileExtension}, falling back to text processing:`, processorError.message);
          const textProcessed = await this.processText(null, buffer);
          extractedText = textProcessed.text || '';
          metadata = { ...metadata, ...textProcessed.metadata, fallback_reason: 'processor_failed' };
        }
      } else {
        if (this.isTextLikeContent(buffer)) {
          console.log(`No specific processor for ${fileExtension}, treating as text`);
          const textProcessed = await this.processText(null, buffer);
          extractedText = textProcessed.text || '';
          metadata = { ...metadata, ...textProcessed.metadata, processing_method: 'text_fallback' };
        } else {
          if (this.isAISupportedMimeType(mimetype)) {
            try {
              extractedText = await this.processWithAIBuffer(buffer, mimetype);
            } catch (aiError) {
              console.warn(`AI processing failed, treating as text:`, aiError.message);
              const textProcessed = await this.processText(null, buffer);
              extractedText = textProcessed.text || '';
              metadata = { ...metadata, ...textProcessed.metadata, fallback_reason: 'ai_failed' };
            }
          } else {
            console.log(`Unsupported mime type ${mimetype}, treating as text`);
            const textProcessed = await this.processText(null, buffer);
            extractedText = textProcessed.text || '';
            metadata = { ...metadata, ...textProcessed.metadata, processing_method: 'unsupported_mimetype_fallback' };
          }
        }
      }

      const sanitizeText = (text) => {
        if (!text || typeof text !== 'string') return '';
        return text
          .replace(/ /g, '')
          .replace(/[---]/g, '')
          .trim();
      };

      const sanitizedText = sanitizeText(extractedText);

      return {
        file_type: fileExtension,
        mime_type: mimetype,
        file_size: buffer.length,
        file_url: null,
        file_hash: fileHash,
        metadata,
        extracted_text: sanitizedText
      };

    } catch (error) {
      console.error('Error processing buffer:', error);
      return {
        file_type: 'unknown',
        mime_type: options.mimetype || 'application/octet-stream',
        file_size: buffer ? buffer.length : 0,
        file_url: null,
        file_hash: null,
        metadata: {
          error: error.message,
          original_name: options.filename || 'unknown'
        },
        extracted_text: ''
      };
    }
  }

  isTextLikeContent(buffer) {
    if (!buffer || buffer.length === 0) return false;

    const sampleSize = Math.min(1024, buffer.length);
    const sample = buffer.slice(0, sampleSize);

    let textBytes = 0;
    let nullBytes = 0;

    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];

      if (byte === 0) {
        nullBytes++;
      }

      if ((byte >= 32 && byte <= 126) ||
          byte === 9 || byte === 10 || byte === 13 ||
          (byte >= 128 && byte <= 255)) {
        textBytes++;
      }
    }

    if (nullBytes / sample.length > 0.05) return false;

    return (textBytes / sample.length) > 0.8;
  }

  isAISupportedMimeType(mimetype) {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/avi',
      'video/x-flv',
      'video/mpg',
      'video/webm',
      'video/3gpp',
      'audio/wav',
      'audio/mp3',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/x-javascript'
    ];

    return supportedTypes.includes(mimetype.toLowerCase());
  }

  async processLocalFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (fileSize > this.options.maxFileSize) {
      throw new Error(`File too large: ${fileSize} bytes (max: ${this.options.maxFileSize})`);
    }

    const fileExtension = path.extname(filePath).toLowerCase().substring(1);
    const mimeType = mime.lookup(filePath) || null;
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    let extractedText = '';
    let metadata = {
      filename: path.basename(filePath),
      extension: fileExtension,
      created: stats.birthtime,
      modified: stats.mtime
    };

    const effectiveMimeType = mimeType || 'application/octet-stream';

    if (this.supportedFormats[fileExtension]) {
      try {
        const processor = this.supportedFormats[fileExtension];
        const processed = await processor(filePath, fileBuffer);
        extractedText = processed.text || '';
        metadata = { ...metadata, ...processed.metadata };
      } catch (error) {
        console.warn(`Standard processor failed for ${fileExtension}, trying AI fallback`);
        extractedText = await this.processWithAIBuffer(fileBuffer, effectiveMimeType);
      }
    } else {
      extractedText = await this.processWithAIBuffer(fileBuffer, effectiveMimeType);
    }

    return {
      file_type: fileExtension || 'unknown',
      mime_type: mimeType,
      file_size: fileSize,
      file_url: null,
      file_hash: fileHash,
      metadata: metadata,
      extracted_text: extractedText
    };
  }

  async processURL(url) {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: this.options.timeout
        };

        const req = client.request(options, (res) => {
          const chunks = [];
          let totalSize = 0;

          res.on('data', (chunk) => {
            chunks.push(chunk);
            totalSize += chunk.length;

            if (totalSize > this.options.maxFileSize) {
              req.destroy();
              reject(new Error(`File too large: ${totalSize} bytes (max: ${this.options.maxFileSize})`));
              return;
            }
          });

          res.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              const contentType = res.headers['content-type'] || '';
              const fileSize = buffer.length;
              const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

              const urlPath = urlObj.pathname;
              const fileExtension = path.extname(urlPath).toLowerCase().substring(1) ||
                                   this.getExtensionFromMimeType(contentType);

              let extractedText = '';
              let metadata = {
                url: url,
                content_type: contentType,
                response_status: res.statusCode
              };

              if (contentType.startsWith('text/html')) {
                const processed = await this.processHTMLBuffer(buffer);
                extractedText = processed.text;
                metadata = { ...metadata, ...processed.metadata };
              } else if (contentType.startsWith('image/')) {
                extractedText = await this.processImageBuffer(buffer, contentType.split(';')[0].trim());
              } else if (contentType.includes('pdf')) {
                const processed = await this.processPDFBuffer(buffer);
                extractedText = processed.text;
                metadata = { ...metadata, ...processed.metadata };
              } else if (this.supportedFormats[fileExtension]) {
                const processor = this.supportedFormats[fileExtension];
                const processed = await processor(null, buffer);
                extractedText = processed.text || '';
                metadata = { ...metadata, ...processed.metadata };
              } else {
                extractedText = await this.processWithAIBuffer(buffer, contentType || 'application/octet-stream');
              }

              resolve({
                file_type: fileExtension || this.getFileTypeFromMimeType(contentType || 'application/octet-stream'),
                mime_type: contentType || null,
                file_size: fileSize,
                file_url: url,
                file_hash: fileHash,
                metadata: metadata,
                extracted_text: extractedText
              });
            } catch (error) {
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`Failed to process URL: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request timeout after ${this.options.timeout}ms`));
        });

        req.end();
      } catch (error) {
        reject(new Error(`Failed to process URL: ${error.message}`));
      }
    });
  }

  async processYouTube(url) {
    try {
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      let extractedText = '';
      let metadata = {
        video_id: videoId,
        url: url,
        platform: 'youtube'
      };

      try {
        const info = await ytdl.getInfo(videoId);
        metadata.title = info.videoDetails.title;
        metadata.description = info.videoDetails.description;
        metadata.duration = info.videoDetails.lengthSeconds;
        metadata.view_count = info.videoDetails.viewCount;

        try {
          const captions = await getSubtitles({
            videoID: videoId,
            lang: 'en'
          });

          if (captions && captions.length > 0) {
            extractedText = captions.map(caption => caption.text).join(' ');
          }
        } catch (captionError) {
          console.warn('Could not extract captions:', captionError.message);
        }

        if (!extractedText && metadata.description) {
          extractedText = `Title: ${metadata.title}\n\nDescription: ${metadata.description}`;
        }

      } catch (error) {
        console.warn('Could not get video info:', error.message);
        extractedText = "";
        metadata.extraction_status = 'failed';
        metadata.extraction_error = error.message;
      }

      return {
        file_type: 'youtube',
        mime_type: 'video/youtube',
        file_size: null,
        file_url: url,
        file_hash: crypto.createHash('md5').update(url).digest('hex'),
        metadata: metadata,
        extracted_text: extractedText
      };

    } catch (error) {
      throw new Error(`Failed to process YouTube video: ${error.message}`);
    }
  }

  // Document processors
  async processPDF(filePath, buffer) {
    const data = buffer || fs.readFileSync(filePath);

    try {
      const parsed = await pdfParse(data);

      if (parsed.text && parsed.text.trim().length > 0) {
        return {
          text: parsed.text,
          metadata: {
            pages: parsed.numpages,
            info: parsed.info,
            processing_method: 'pdf-parse',
            text_length: parsed.text.length
          }
        };
      }

      console.log('PDF-parse extracted no text, trying AI for OCR...');

      const aiText = await this.processWithAIBuffer(data, 'application/pdf');

      return {
        text: aiText || '',
        metadata: {
          pages: parsed.numpages || 'unknown',
          info: parsed.info || {},
          processing_method: 'ai_ocr',
          text_length: aiText?.length || 0,
          note: 'Processed with AI OCR (likely image-based PDF)'
        }
      };

    } catch (pdfError) {
      console.log(`PDF-parse failed (${pdfError.message}), trying AI...`);

      try {
        const aiText = await this.processWithAIBuffer(data, 'application/pdf');

        return {
          text: aiText || '',
          metadata: {
            pages: 'unknown',
            processing_method: 'ai_fallback',
            text_length: aiText?.length || 0,
            pdf_parse_error: pdfError.message,
            note: 'PDF-parse failed, processed with AI'
          }
        };
      } catch (aiError) {
        console.log(`Both PDF-parse and AI failed: ${aiError.message}`);

        return {
          text: '',
          metadata: {
            pages: 'unknown',
            processing_method: 'failed',
            text_length: 0,
            pdf_parse_error: pdfError.message,
            ai_error: aiError.message,
            note: 'All processing methods failed'
          }
        };
      }
    }
  }

  async processPDFBuffer(buffer) {
    return this.processPDF(null, buffer);
  }

  async processWord(filePath, buffer) {
    const data = buffer || fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: data });

    return {
      text: result.value,
      metadata: {
        messages: result.messages
      }
    };
  }

  async processWordLegacy(filePath, buffer) {
    const data = buffer || (filePath ? fs.readFileSync(filePath) : null);
    if (!data) {
      return { text: '', metadata: { processed_with: 'failed', error: 'No input data' } };
    }
    return {
      text: await this.processWithAIBuffer(data, 'application/msword'),
      metadata: { processed_with: 'ai' }
    };
  }

  async processPowerPoint(filePath, buffer) {
    try {
      const data = buffer || fs.readFileSync(filePath);
      const extension = filePath ? path.extname(filePath).toLowerCase() : '.pptx';
      const mimeType = extension === '.ppt' ?
        'application/vnd.ms-powerpoint' :
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      if (extension === '.pptx') {
        try {
          const text = data.toString('utf8');
          const textMatches = text.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
          if (textMatches && textMatches.length > 0) {
            const extractedText = textMatches
              .map(match => match.replace(/<[^>]*>/g, ''))
              .join(' ')
              .trim();

            if (extractedText.length > 0) {
              return {
                text: extractedText,
                metadata: {
                  processed_with: 'xml_extraction',
                  slides_detected: textMatches.length,
                  presentation_type: 'pptx'
                }
              };
            }
          }
        } catch (xmlError) {
          console.warn('PowerPoint XML extraction failed, using AI:', xmlError.message);
        }
      }

      return {
        text: await this.processWithAIBuffer(data, mimeType),
        metadata: {
          processed_with: 'ai',
          presentation_type: extension.substring(1)
        }
      };
    } catch (error) {
      console.error('PowerPoint processing error:', error);
      return {
        text: '',
        metadata: {
          error: error.message,
          processed_with: 'failed'
        }
      };
    }
  }

  async processExcel(filePath, buffer) {
    const data = buffer || fs.readFileSync(filePath);
    const workbook = xlsx.read(data, { type: 'buffer' });

    let text = '';
    const metadata = {
      sheets: [],
      total_sheets: workbook.SheetNames.length
    };

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      text += `\n=== SHEET: ${sheetName} ===\n`;
      text += jsonData.map(row => row.join(' | ')).join('\n');
      text += '\n';

      metadata.sheets.push({
        name: sheetName,
        rows: jsonData.length,
        columns: jsonData[0] ? jsonData[0].length : 0
      });
    });

    return { text, metadata };
  }

  async processCSV(filePath, buffer) {
    const data = buffer ? buffer.toString() : fs.readFileSync(filePath, 'utf8');

    return new Promise((resolve, reject) => {
      const results = [];
      const metadata = { rows: 0, columns: 0 };

      Readable.from([data])
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
          if (metadata.columns === 0) {
            metadata.columns = Object.keys(row).length;
          }
        })
        .on('end', () => {
          metadata.rows = results.length;
          const text = results.map(row => Object.values(row).join(' | ')).join('\n');
          resolve({ text, metadata });
        })
        .on('error', reject);
    });
  }

  async processText(filePath, buffer) {
    const text = buffer ? buffer.toString('utf8') : fs.readFileSync(filePath, 'utf8');
    return {
      text,
      metadata: {
        lines: text.split('\n').length,
        characters: text.length
      }
    };
  }

  async processJSON(filePath, buffer) {
    try {
      const jsonText = buffer ? buffer.toString('utf8') : fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(jsonText);

      const extractTextFromJson = (obj, prefix = '') => {
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
        if (Array.isArray(obj)) {
          return obj.map((item, index) => extractTextFromJson(item, `${prefix}[${index}]`)).join(' ');
        }
        if (typeof obj === 'object' && obj !== null) {
          return Object.entries(obj)
            .map(([key, value]) => `${key}: ${extractTextFromJson(value, `${prefix}.${key}`)}`)
            .join(' ');
        }
        return '';
      };

      const extractedText = extractTextFromJson(jsonData);

      return {
        text: extractedText,
        metadata: {
          type: 'json',
          keys: (typeof jsonData === 'object' && jsonData !== null) ? Object.keys(jsonData) : [],
          size: jsonText.length,
          valid: true
        }
      };
    } catch (error) {
      const text = buffer ? buffer.toString('utf8') : fs.readFileSync(filePath, 'utf8');
      return {
        text,
        metadata: {
          type: 'json',
          valid: false,
          error: error.message,
          size: text.length
        }
      };
    }
  }

  async processXML(filePath, buffer) {
    const xmlText = buffer ? buffer.toString('utf8') : fs.readFileSync(filePath, 'utf8');

    const textContent = xmlText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text: textContent,
      metadata: {
        type: 'xml',
        originalSize: xmlText.length,
        extractedSize: textContent.length,
        tagCount: (xmlText.match(/<[^>]*>/g) || []).length
      }
    };
  }

  async processImage(filePath, buffer) {
    const imageBuffer = buffer || fs.readFileSync(filePath);
    const mimeType = (filePath && mime.lookup(filePath)) || 'image/jpeg';

    return {
      text: await this.processImageBuffer(imageBuffer, mimeType),
      metadata: {
        processed_with: 'ai_vision'
      }
    };
  }

  async processImageBuffer(buffer, mimeType) {
    try {
      if (!buffer || buffer.length < 100) {
        return "";
      }

      if (buffer.length < 5000 && this.isLikelyTestImage(buffer)) {
        return "";
      }

      const prompt = "Describe this image in detail. Extract any text you can see. Focus on the main content and any readable text or information.";

      return await this._aiGenerateContent(prompt, {
        data: buffer.toString('base64'),
        mimeType: mimeType
      });
    } catch (error) {
      return "";
    }
  }

  isLikelyTestImage(buffer) {
    const uniqueBytes = new Set(buffer).size;
    return uniqueBytes < 20 || buffer.length < 2000;
  }

  async processSVG(filePath, buffer) {
    const svgContent = buffer ? buffer.toString() : fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(svgContent, { xmlMode: true });

    let text = '';
    $('text, tspan').each((i, elem) => {
      text += $(elem).text() + ' ';
    });

    return {
      text: text.trim() || 'SVG image with no readable text',
      metadata: {
        svg_elements: $('*').length
      }
    };
  }

  async processHTML(filePath, buffer) {
    const htmlContent = buffer ? buffer.toString() : fs.readFileSync(filePath, 'utf8');
    return this.processHTMLBuffer(Buffer.from(htmlContent));
  }

  async processHTMLBuffer(buffer) {
    const html = buffer.toString();
    const $ = cheerio.load(html);

    $('script, style, nav, header, footer, aside').remove();

    const title = $('title').text() || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      text: `${title ? `Title: ${title}\n\n` : ''}${bodyText}`,
      metadata: {
        title,
        has_title: !!title,
        body_length: bodyText.length
      }
    };
  }

  async processWithAI(filePath, buffer) {
    const fileBuffer = buffer || fs.readFileSync(filePath);
    const mimeType = (filePath && mime.lookup(filePath)) || 'application/octet-stream';
    const text = await this.processWithAIBuffer(fileBuffer, mimeType);
    return {
      text: text || '',
      metadata: { processed_with: 'ai' }
    };
  }

  async processWithAIBuffer(buffer, mimeType) {
    try {
      const prompt = `Extract all text content from this document. Preserve formatting and structure where possible. If this contains tables or structured data, format it clearly.`;

      return await this._aiGenerateContent(prompt, {
        data: buffer.toString('base64'),
        mimeType: mimeType
      });
    } catch (error) {
      console.warn('AI processing failed:', error.message);
      return "";
    }
  }

  // Utility methods
  isURL(input) {
    try {
      const url = new URL(input);
      return url.protocol.length > 2 && (url.protocol.startsWith('http') ||
             url.protocol.startsWith('ftp') || url.protocol.startsWith('ws'));
    } catch {
      return false;
    }
  }

  isYouTubeURL(url) {
    return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url);
  }

  extractYouTubeId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }

  getExtensionFromMimeType(mimeType) {
    const extensions = {
      'application/pdf': 'pdf',
      'application/json': 'json',
      'application/xml': 'xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',
      'text/csv': 'csv',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/xml': 'xml',
      'text/markdown': 'md',
      'application/javascript': 'js',
      'text/javascript': 'js',
      'text/yaml': 'yaml',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    };

    return extensions[mimeType.split(';')[0]] || 'unknown';
  }

  getFileTypeFromMimeType(mimeType) {
    const type = mimeType.split('/')[0];
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'video';
      case 'audio': return 'audio';
      case 'text': return 'text';
      case 'application':
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word')) return 'doc';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
        return 'document';
      default: return 'unknown';
    }
  }

  getSupportedFormats() {
    return Object.keys(this.supportedFormats);
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default UniversalDocumentProcessor;
export { createAIProvider };
