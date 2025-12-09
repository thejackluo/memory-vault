# Assets.json and Image Loading Guide

## How Assets Work in ChatGPT Export

When you export your ChatGPT data, you get:
1. `conversations.json` - Your conversation history
2. `assets.json` - Mapping of asset IDs to file paths
3. **Image/Audio/Video files** - The actual media files

## Current Status

The `assets.json` file maps sediment:// URLs to local file paths:
```json
"sediment://file_0000000088e471f5a28be230acaa5edc": "file_0000000088e471f5a28be230acaa5edc-sanitized.jpeg"
```

## Why Images Show "[Image not found]"

The HTML is looking for these files but can't find them because:
- The actual image files weren't extracted from the ChatGPT export
- The files are in a different directory
- The ChatGPT export only downloaded JSON files, not the media

## Solution: Extract ALL Files from ChatGPT Export

1. Go back to your ChatGPT data export
2. Look for folders with images/audio/video files
3. Copy ALL media files to the same directory as `chat-optimized.html`
4. Make sure the filenames match those in `assets.json`

## Directory Structure Should Look Like:
```
memory-vault/
├── chat-optimized.html
├── conversations.json
├── assets.json
├── file_0000000088e471f5a28be230acaa5edc-sanitized.jpeg
├── file_00000000576071fdb10b0b879bdd0153-sanitized.jpg
├── 692f75f0-09b4-8329-a584-3ac581d77f00/
│   └── audio/
│       └── file_00000000a11471f7aa45dc47f5a996ac-578ee607-0a63-4ff1-a0c9-2d7a65048b6a.wav
└── ... (more files)
```

## Testing

After copying files:
1. Open browser console (F12)
2. Load `chat-optimized.html`
3. Look for message: "Successfully loaded assets.json with X assets"
4. Navigate to a conversation with images
5. Images should load, or you'll see which file is missing

## Notes

- assets.json has ~2500+ entries in your export
- File paths can be in subdirectories (like audio/ folders)
- If files are truly missing from export, you may need to re-export from ChatGPT
