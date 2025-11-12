# Build Scripts

Automation scripts for the personal portfolio site.

## Blog Post Builder

`build-blog.py` - Convert markdown blog drafts to HTML

### Usage

Build a single post:
```bash
python3 scripts/build-blog.py post-1
```

Build all posts:
```bash
python3 scripts/build-blog.py all
```

### Workflow

1. **Write in Markdown** - Edit `.blogdrafts/post-X.md` with your content
2. **Add Images** - Reference images with `![Alt Text](filename.png)` in markdown
3. **Run Script** - Convert markdown to HTML: `python3 scripts/build-blog.py post-X`
4. **Add Image Files** - Copy actual images to `assets/blog/post-X/`
5. **Rebuild** - Run script again to update paths
6. **Test** - View at `http://localhost:8080/blog/post-X.html`

### Image Placeholders

In your markdown, add images like:
```markdown
![Rectangle App Logo](rectangle-logo.png)
```

The script will:
- Convert to HTML `<img>` tags
- Set path to `../assets/blog/post-X/rectangle-logo.png`
- Create placeholder README in assets directory

Then add the actual image file to `assets/blog/post-X/rectangle-logo.png`

### Metadata

Edit metadata in `scripts/build-blog.py` in the `POST_METADATA` dictionary:

```python
POST_METADATA = {
    "post-4": {
        "title": "Your Post Title",
        "description": "Brief description",
        "date": "2024-12-20",
        "category": "Category Name",
        "tags": ["Tag1", "Tag2", "Tag3"]
    }
}
```

### What the Script Does

1. ✅ Reads `.blogdrafts/post-X.md`
2. ✅ Converts markdown to HTML sections
3. ✅ Generates complete HTML page with navigation
4. ✅ Creates image placeholder directories
5. ✅ Writes to `blog/post-X.html`

### Markdown Syntax Supported

- `## Heading` → `<h2>Heading</h2>`
- `**bold**` → `<strong>bold</strong>`
- `` `code` `` → `<code>code</code>`
- `[link](url)` → `<a href="url">link</a>`
- `- list item` → `<li>list item</li>`
- `![alt](image.png)` → `<img src="../assets/blog/post-X/image.png" alt="alt">`

### Tips

- Keep markdown files in `.blogdrafts/` (git-ignored)
- Images go in `assets/blog/post-X/` (committed to git)
- Use descriptive image filenames: `raycast-search.png` not `img1.png`
- Test locally before committing: `python3 -m http.server 8080`
