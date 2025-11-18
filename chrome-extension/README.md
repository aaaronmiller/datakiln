# DataKiln Chrome Extension

Browser extension for capturing DOM interactions and automating workflows with DataKiln.

## Features

- **DOM Element Picker**: Visual element selection tool with highlighting
- **Action Capture**: Record clicks, typing, clipboard paste, and content extraction
- **Optimal Selector Generation**: Intelligent CSS selector generation with fallbacks
- **Quick-Run Workflows**: One-click execution of predefined workflows
- **Workflow Creation**: Build workflows by clicking elements in any web page

## Installation

### Load Unpacked Extension (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` directory from this repository
5. The DataKiln icon should appear in your extensions toolbar

### Using the Extension

The extension will automatically appear in your Chrome toolbar with the DataKiln icon.

## Usage

### DOM Element Picker

1. Click the DataKiln extension icon to open the popup
2. Click "Start Element Picker"
3. Hover over elements on the page to see them highlighted
4. Click an element to select an action:
   - **Click**: Record a click action
   - **Type Text**: Enter text to type into the element
   - **Paste from Clipboard**: Paste clipboard content
   - **Extract Text**: Extract the element's text content
   - **Wait**: Add a delay

5. Press `ESC` to stop the picker

### Captured Actions

- Captured actions appear in the extension popup
- View the action count badge on the extension icon
- Save captured actions as a DataKiln workflow
- Clear all captured actions

### Quick-Run Workflows

Pre-configured workflows available for instant execution:
- **YouTube Transcript**: Extract video transcripts
- **Simple Research**: Quick web research
- **Deeper Research**: In-depth research with multiple sources

### Selector Generation

The extension automatically generates optimal CSS selectors:

1. **ID** - Uses element ID if unique (`#unique-id`)
2. **Class** - Uses unique class name (`.unique-class`)
3. **Data Attributes** - Uses data-* or name attributes (`input[name="search"]`)
4. **ARIA Labels** - Uses aria-label attributes
5. **Path** - Generates selector path with nth-child

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and state management
- `content.js` - DOM element picker and interaction capture
- `background.js` - Service worker for workflow execution
- `styles.css` - Styling for overlay, tooltips, and dialogs
- `icons/` - Extension icons (16x16, 48x48, 128x128)

## Permissions

The extension requires the following permissions:

- `activeTab` - Access the current tab for DOM interactions
- `storage` - Store captured actions and workflow state
- `clipboardRead` - Read clipboard content for paste actions
- `scripting` - Inject content scripts
- `host_permissions` - Access localhost:8000 and all URLs

## Integration with DataKiln

### Workflow Editor Integration

Captured actions can be sent to the DataKiln workflow editor:

1. Capture actions using the element picker
2. Click "Save Workflow" in the popup
3. The workflow opens in the DataKiln editor at `http://localhost:8000/workflows/new`

### Action Format

Actions are captured in the following format:

```json
{
  "selector": "button[aria-label='Search']",
  "actionType": "click",
  "value": "",
  "delay": 1000,
  "elementTag": "button",
  "elementText": "Search",
  "timestamp": "2025-11-18T12:00:00.000Z"
}
```

### Backend Compatibility

The extension generates actions compatible with DataKiln's DOM action nodes:

```json
{
  "type": "dom_action",
  "config": {
    "actions": [
      {
        "selector": "button[aria-label='Search']",
        "action": "click",
        "delayAfter": 1000
      }
    ]
  }
}
```

## Development

### Generate Icons

Run the icon generation script to create placeholder icons:

```bash
python3 generate_icons.py
```

This creates:
- `icons/icon16.png` - 16x16 toolbar icon
- `icons/icon48.png` - 48x48 extension management icon
- `icons/icon128.png` - 128x128 Chrome Web Store icon

### Testing

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the DataKiln extension card
4. Test the changes in a new tab

### Debugging

- **Popup**: Right-click the extension icon → "Inspect popup"
- **Content Script**: Open DevTools on any page → Check console for `datakiln-` prefixed messages
- **Background Script**: Go to `chrome://extensions/` → Click "Inspect views: service worker"

## Troubleshooting

### Extension doesn't appear
- Ensure Developer mode is enabled
- Check for errors in `chrome://extensions/`
- Verify all required files are present

### Element picker doesn't work
- Refresh the page after loading the extension
- Check the browser console for errors
- Ensure content script is injected

### Captured actions not saving
- Check chrome.storage permissions
- Open DevTools and check Application → Storage → Extension Storage

### Workflow execution fails
- Ensure DataKiln backend is running on `http://localhost:8000`
- Check network requests in DevTools
- Verify the workflow format is correct

## API Endpoints

The extension communicates with the DataKiln backend:

- `POST http://localhost:8000/api/v1/workflows/execute` - Execute workflow
- `GET http://localhost:8000/` - Open DataKiln dashboard
- `GET http://localhost:8000/workflows/new` - Open workflow editor

## Browser Compatibility

- **Chrome**: ✓ Fully supported (Manifest V3)
- **Edge**: ✓ Supported (Chromium-based)
- **Firefox**: ✗ Requires Manifest V2 adaptation
- **Safari**: ✗ Requires conversion to Safari extension

## Future Enhancements

- [ ] XPath selector support
- [ ] Screenshot capture
- [ ] Video recording of workflows
- [ ] Export workflows to JSON
- [ ] Import workflows from file
- [ ] Workflow versioning
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Multi-language support

## License

See the main repository LICENSE file.

## Support

For issues and feature requests, please use the main DataKiln repository issue tracker.
