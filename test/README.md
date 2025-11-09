# Test Suite for Document Photo to Text AI

This test folder contains sample files of various formats to test the document extraction capabilities of the Universal Document Processor.

## Available Test Files

### Text & Code Files
- `sample.txt` - Plain text file
- `sample.md` - Markdown document
- `sample.js` - JavaScript code
- `sample.py` - Python code
- `sample.log` - Log file

### Data Formats
- `sample.json` - JSON data structure
- `sample.xml` - XML document
- `sample.yaml` - YAML configuration
- `sample.toml` - TOML configuration
- `sample.ini` - INI configuration
- `sample.csv` - CSV spreadsheet data

### Web & Graphics
- `sample.html` - HTML web page
- `sample.svg` - SVG vector graphic (text-based)

## Running Tests

1. Set your Google AI API key:
   ```bash
   export GOOGLE_API_KEY="your-api-key-here"
   ```

2. Run the test suite:
   ```bash
   node run-tests.js
   ```

## What Gets Tested

The test suite will:
- ✅ Process each file type
- 📊 Display file metadata (type, size, hash)
- 📝 Extract and display text content
- 🔍 Show processing metadata
- ⚠️ Report any errors

## Expected Results

Each file should be processed successfully and return:
- Correct file type detection
- Accurate text extraction
- Proper metadata
- No processing errors

## Adding More Test Files

To add more test files:
1. Place them in this `test/` folder
2. Add the filename to the `testFiles` array in `run-tests.js`
3. Run the tests to verify processing

## Note

For binary formats like PDFs, images, Word documents, etc., you'll need to add actual binary files to this folder since they can't be created as text files.