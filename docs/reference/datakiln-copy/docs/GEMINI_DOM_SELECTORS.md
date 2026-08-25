# Gemini DOM Selectors Reference (Gemini 3 - December 2024)

This document contains the authoritative DOM selectors for interacting with the Gemini web interface via Playwright automation.

> **Note**: These selectors are current as of December 2024 (Gemini 3). If conflicts exist with older documentation, this is the authoritative source.

---

## Gemini Gem (Summary XML)
```html
<span class="bot-name gds-body-m">XML enhanced transcription pattern extractor</span>
```

## Copy Response
```html
<span class="mat-mdc-button-touch-target"></span>
```

## Add Element (Add Files)
```html
<mat-icon fonticon="add_2" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true"></mat-icon>
```

## Prompt Input Area
```html
<p><br></p>
```
- Target: Any `contenteditable="true"` div containing `<p>` elements

## Submit Button
```html
<mat-icon fonticon="send" class="send-button-icon icon-filled gds-icon-xl google-symbols mat-ligature-font mat-icon-no-color"></mat-icon>
```

## Add Files Menu Items
- **Upload files**: `<div class="menu-text">Upload files</div>`
- **Add from Drive**: `<div class="menu-text">Add from Drive</div>`
- **Photos**: `button[data-test-id="uploader-photos-button"]`

## Thinking/Fast Mode Dropdown
- **Dropdown arrow**: `mat-icon[fonticon="keyboard_arrow_down"]`
- **Select Thinking**: `button[data-test-id="bard-mode-option-thinkingwith3pro"]`
- **Select Fast**: `button[data-test-id="bard-mode-option-fast"]`

---

## Deep Research (Available after Deep Research tool is selected)

### Sources Dropdown Toggle
```html
<mat-icon fonticon="keyboard_arrow_down" class="chip-icon dropdown-icon"></mat-icon>
```

### Source Options
- **Search** (default): `<div class="gds-label-l label"> Search </div>`
- **Gmail**: `<div class="gds-label-l label"> Gmail </div>`
- **Drive**: `<div class="gds-label-l label"> Drive </div>`
- **Chat**: `<div class="gds-label-l label"> Chat </div>`

### Attach Files (Deep Research)
```html
<mat-icon fonticon="upload" class="gds-icon-m chip-icon"></mat-icon>
<!-- Inside: <div class="gds-label-l chip-text">Files</div> -->
```

### Start Research Button
```html
<span class="mdc-button__label"> Start research </span>
```

---

## Tools Menu

### Tools Select Button
```html
<span>Tools</span>
```

### Tool Options (inside .label.gds-label-l)
- **Deep Research**: `<div class="label gds-label-l"> Deep Research </div>`
- **Create videos**: `<div class="label gds-label-l"> Create videos (Veo 3.1) </div>`
- **Create images**: `<div class="label gds-label-l"> Create images </div>`
- **Canvas**: `<div class="label gds-label-l"> Canvas </div>`
- **Guided Learning**: `<div class="label gds-label-l"> Guided Learning </div>`
- **Visual layout**: `<div class="label gds-label-l"> Visual layout </div>` (Labs badge)

---

## Playwright Selector Summary

| Element | Selector |
|:--------|:---------|
| Submit button | `mat-icon[fonticon="send"]` |
| Add files | `mat-icon[fonticon="add_2"]` |
| Deep Research mode | `div.label.gds-label-l:has-text("Deep Research")` |
| Start research | `span.mdc-button__label:has-text("Start research")` |
| Thinking mode | `button[data-test-id="bard-mode-option-thinkingwith3pro"]` |
| Fast mode | `button[data-test-id="bard-mode-option-fast"]` |
| Tools button | `span:has-text("Tools")` |
| Prompt input | `[contenteditable="true"]` |
