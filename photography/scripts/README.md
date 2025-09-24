# Photo Import Scripts

This directory contains scripts for importing and processing photos for the photography website.

## Setup

1. Install dependencies:
```bash
cd scripts
npm install
```

## Photo Import Script

The `import-photos.js` script automates the process of importing new photos into your photography website.

### What it does:

1. **Scans album folders** in `assets/images/albums/` for new directories
2. **Auto-creates album entries** in `albums.json` for new folders found
3. **Checks for new photos** in each album folder
4. **Cross-references** against existing photos to avoid duplicates
5. **Generates thumbnails** (800px width, WebP format, 85% quality)
6. **Processes full-size images** (2000px width, WebP format, 90% quality)
7. **Updates albums.json** with new photo entries and album metadata
8. **Maintains proper folder structure** for thumbnails and full images

### Usage:

```bash
# Import photos for a specific album
node import-photos.js nature
node import-photos.js portraits  
node import-photos.js events

# Scan and import ALL album folders automatically
node import-photos.js

# Or using the shell script
./import.sh nature          # Import specific album
./import.sh                 # Interactive mode - scan all albums

# Or using npm script
npm run import nature       # Import specific album
npm run import              # Scan all albums
```

### Workflow:

**Option 1: Create any new album folder**
1. **Create a new folder** in `assets/images/albums/` with any name (e.g., `wedding`, `travel`, `street`)
2. **Add photos** to that folder
3. **Run the import script** - it will automatically detect the new folder and create the album entry:
   ```bash
   node import-photos.js wedding    # For specific album
   # OR
   node import-photos.js            # Scan all folders automatically
   ```

**Option 2: Use existing album structure**
1. **Export photos** to existing album folders:
   - `assets/images/albums/nature/` - for nature photos
   - `assets/images/albums/portraits/` - for portrait photos  
   - `assets/images/albums/events/` - for event photos

2. **Run the import script** for that album:
   ```bash
   node import-photos.js nature
   ```

**Generated files** will be created in:
- Thumbnails: `assets/images/thumbnails/{album}/`
- Full-size: `assets/images/full/{album}/`
- Updated: `data/albums.json` (with new album entry if needed)

### Supported Image Formats:

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- TIFF (.tiff)
- RAW formats (.raw, .cr2, .nef, .arw)

### Features:

- **Duplicate Prevention**: Checks existing photo IDs to avoid importing the same image twice
- **Automatic ID Generation**: Creates unique IDs based on album and filename
- **Metadata Preservation**: Stores original filename and dimensions
- **Date Assignment**: Uses current date for new imports (can be manually adjusted later)
- **Title Generation**: Converts filenames to readable titles
- **Error Handling**: Continues processing other photos if one fails

### File Structure After Import:

```
assets/images/
├── albums/
│   ├── nature/          # Source photos you export here
│   ├── portraits/       
│   └── events/
├── thumbnails/
│   ├── nature/          # Generated 800px thumbnails
│   ├── portraits/
│   └── events/
└── full/
    ├── nature/          # Generated 2000px full-size
    ├── portraits/
    └── events/
```

### Example albums.json Entry:

The script will add entries like this to your albums.json:

```json
{
  "id": "natmountain123456",
  "title": "Mountain Sunrise",
  "thumbnail": "assets/images/thumbnails/nature/natmountain123456.webp",
  "full": "assets/images/full/nature/natmountain123456.webp", 
  "date": "2024-02-11",
  "metadata": {
    "width": 6000,
    "height": 4000,
    "originalFilename": "mountain_sunrise_dsc1234.jpg"
  }
}
```

### Notes:

- Source files are **not deleted** after import (for safety)
- All processed images are converted to WebP format for optimal web performance
- The script maintains the existing album structure in albums.json
- Images are automatically sorted by date (newest first) after import

### Troubleshooting:

- **"Album not found"**: Make sure the album name exists in albums.json
- **"Permission denied"**: Check file permissions on the images directories
- **"Sharp not found"**: Run `npm install` in the scripts directory
- **"No new photos found"**: Photos may already be imported, or source folder doesn't exist
