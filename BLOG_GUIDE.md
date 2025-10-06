# Blog Post Creation Guide

This guide will help you create new blog posts from markdown content and maintain consistency across your blog.

## Quick Start Checklist

1. Create HTML file in `blog/` directory (e.g., `blog/post-4.html`)
2. Add post metadata to `data/blog-posts.json`
3. Add hero image to `assets/` directory
4. Convert markdown content to HTML sections
5. Test responsive layout on mobile and desktop

## File Structure

```
blog/
├── post-1.html
├── post-2.html
├── post-3.html
└── post-4.html (your new post)

data/
└── blog-posts.json

assets/
├── blog-hero-1.jpg
├── blog-hero-2.jpg
└── blog-hero-4.jpg (your new image)
```

## Step 1: Create Blog Post HTML File

Copy this template to create a new blog post:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Post Title - Mitchell Carter</title>
    <meta name="description" content="Brief description of your post for SEO">

    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../mediaqueries.css">
    <link rel="stylesheet" href="../assets/css/project-pages.css">
</head>
<body>
    <!-- Top Bar Navigation -->
    <nav id="top-nav">
        <div class="nav-container">
            <div class="logo"><a href="../index.html">Mitchell Carter</a></div>
            <ul class="nav-links">
                <li><a href="../index.html" class="nav-link">About</a></li>
                <li><a href="../projects.html" class="nav-link">Projects</a></li>
                <li><a href="../blog.html" class="nav-link">Blog</a></li>
                <li><a href="https://photos.mitchellcarter.dev" target="_blank" class="nav-link">Photos</a></li>
            </ul>
        </div>
    </nav>

    <nav id="hamburger-nav">
        <div class="logo"><a href="../index.html">Mitchell Carter</a></div>
        <div class="hamburger-menu">
            <div class="hamburger-icon" onClick="toggleMenu()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="menu-links">
                <li><a href="../index.html" onClick="toggleMenu()">About</a></li>
                <li><a href="../projects.html" onClick="toggleMenu()">Projects</a></li>
                <li><a href="../blog.html" onClick="toggleMenu()">Blog</a></li>
                <li><a href="https://photos.mitchellcarter.dev" target="_blank" onClick="toggleMenu()">Photos</a></li>
            </div>
        </div>
    </nav>

    <!-- Breadcrumb Navigation -->
    <section class="breadcrumb">
        <div class="breadcrumb-container">
            <a href="../index.html">Home</a>
            <span class="breadcrumb-separator">→</span>
            <a href="../blog.html">Blog</a>
            <span class="breadcrumb-separator">→</span>
            <span class="breadcrumb-current">Your Post Title</span>
        </div>
    </section>

    <!-- Blog Post Content -->
    <article class="project-section">
        <div class="project-content">
            <header style="margin-bottom: 2rem;">
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Month Day, Year</p>
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Your Post Title</h1>
                <p style="color: #888; font-size: 1.1rem;">Brief subtitle or description</p>
            </header>

            <!-- Content sections go here -->
            <section style="margin-bottom: 2rem;">
                <h2>Section Title</h2>
                <p>Your content here...</p>
            </section>

        </div>
    </article>

    <!-- Back to Blog -->
    <section class="project-cta">
        <div class="project-content">
            <h2>Read More</h2>
            <p>Explore more articles and project deep-dives</p>
            <div class="cta-buttons">
                <a href="../blog.html" class="btn btn-color-2">Back to Blog</a>
            </div>
        </div>
    </section>

    <footer>
        <p>Copyright &#169; 2024 Mitchell Carter. All Rights Reserved.</p>
    </footer>

    <script src="../script.js"></script>
</body>
</html>
```

## Step 2: Convert Markdown to HTML

### Headings
```html
<!-- Markdown: ## Section Title -->
<section style="margin-bottom: 2rem;">
    <h2>Section Title</h2>
    <p>Content goes here...</p>
</section>
```

### Paragraphs
```html
<!-- Markdown: Regular paragraph text -->
<p>Regular paragraph text that will be styled with Georgia serif font at 1.125rem with 1.8 line height.</p>
```

### Links
```html
<!-- Markdown: [link text](https://example.com) -->
<p>Check out <a href="https://example.com">this resource</a> for more information.</p>
```

Links are automatically styled with:
- Blue color (#007bff)
- Subtle underline that appears on hover
- Smooth transitions

### Lists
```html
<!-- Markdown: Unordered list -->
<ul style="margin-left: 2rem; margin-top: 1rem; line-height: 1.8;">
    <li><strong>Bold item:</strong> Description of the item</li>
    <li><strong>Another item:</strong> More details</li>
    <li>Simple list item without bold</li>
</ul>
```

### Bold Text
```html
<!-- Markdown: **bold text** -->
<strong>bold text</strong>
```

### Images (Simple)
```html
<!-- Markdown: ![alt text](image.jpg) -->
<img src="../assets/your-image.jpg" alt="Descriptive alt text">
```

Images automatically:
- Span full width of the text content
- Have rounded corners (8px)
- Include subtle shadow
- Maintain aspect ratio

### Images with Captions
```html
<!-- For images that need captions -->
<figure>
    <img src="../assets/your-image.jpg" alt="Descriptive alt text">
    <figcaption>Caption text explaining the image in detail</figcaption>
</figure>
```

### Code (Inline)
```html
<!-- Markdown: `code` -->
<p>Use the <code>console.log()</code> function to debug.</p>
```

### Code Blocks
```html
<!-- Markdown: ```language ... ``` -->
<pre><code>function example() {
    return "Hello World";
}
</code></pre>
```

## Step 3: Add to Blog Homepage

Edit `data/blog-posts.json` and add your new post:

```json
{
  "posts": [
    {
      "id": "post-4",
      "title": "Your Post Title",
      "date": "2024-12-20",
      "dateFormatted": "December 20, 2024",
      "category": "Your Category",
      "url": "blog/post-4.html",
      "tags": ["Tag1", "Tag2", "Tag3"]
    },
    // ... existing posts
  ]
}
```

Then add the card to `blog.html`:

```html
<a href="blog/post-4.html" class="blog-card" data-title="Your Post Title" data-date="2024-12-20">
    <div class="blog-card-header">
        <div class="blog-card-date">Dec 20, 2024</div>
        <div class="blog-card-category">Your Category</div>
    </div>
    <div class="blog-card-content">
        <h2 class="blog-card-title">Your Post Title</h2>
        <div class="blog-card-tags">
            <span class="blog-tag">Tag1</span>
            <span class="blog-tag">Tag2</span>
            <span class="blog-tag">Tag3</span>
        </div>
    </div>
</a>
```

## Typography & Styling Reference

### Current Typography Scales

**Headers:**
- `<h1>`: 2.75rem (44px) - Post title
- `<h2>`: 1.875rem (30px) - Section headers

**Body Text:**
- Paragraphs: 1.125rem (18px) with Georgia serif
- Line height: 1.8 for optimal readability
- Color: #333

**Links:**
- Color: #007bff (blue)
- Hover: #0056b3 (darker blue)
- Underline on hover

**Lists:**
- Font size: 1.125rem
- Line height: 1.8
- Margin left: 2rem

### Content Width

- Article container: Full width with 2rem side padding
- Content spans the full available width
- Responsive padding reduces on mobile (1.25rem at 768px, 1rem at 480px)

## Mobile Responsive Behavior

The blog posts automatically adjust for mobile:

**At 768px and below:**
- Font sizes reduce slightly
- Padding decreases to 1.25rem
- Headings scale down proportionally

**At 480px and below:**
- Further font size reduction
- Padding reduces to 1rem
- Breadcrumb becomes more compact

## Common Patterns

### Article with Multiple Sections
```html
<article class="project-section">
    <div class="project-content">
        <header style="margin-bottom: 2rem;">
            <!-- Header content -->
        </header>

        <section style="margin-bottom: 2rem;">
            <h2>Introduction</h2>
            <p>Opening paragraph...</p>
        </section>

        <section style="margin-bottom: 2rem;">
            <h2>Main Content</h2>
            <p>Main ideas...</p>
            <figure>
                <img src="../assets/diagram.jpg" alt="Diagram">
                <figcaption>Figure 1: Architecture diagram</figcaption>
            </figure>
        </section>

        <section style="margin-bottom: 2rem;">
            <h2>Conclusion</h2>
            <p>Wrapping up...</p>
        </section>
    </div>
</article>
```

### Article with Links and Lists
```html
<section style="margin-bottom: 2rem;">
    <h2>Key Features</h2>
    <p>The system includes several important features:</p>
    <ul style="margin-left: 2rem; margin-top: 1rem; line-height: 1.8;">
        <li><strong>Feature One:</strong> Description with <a href="https://example.com">relevant link</a></li>
        <li><strong>Feature Two:</strong> Another description</li>
        <li><strong>Feature Three:</strong> Final feature</li>
    </ul>
</section>
```

## Testing Checklist

Before publishing a new blog post:

- [ ] Test on desktop (full width display)
- [ ] Test on tablet (768px - 1200px)
- [ ] Test on mobile (< 768px)
- [ ] Verify all links work
- [ ] Check that images load properly
- [ ] Verify breadcrumb navigation works
- [ ] Confirm "Back to Blog" button links to blog.html
- [ ] Test hamburger menu on mobile
- [ ] Verify post appears on blog homepage
- [ ] Check that metadata is correct in blog-posts.json

## Tips for Best Results

1. **Image Optimization**: Use WebP format when possible for faster loading
2. **Alt Text**: Always provide descriptive alt text for accessibility
3. **Link Context**: Ensure link text is descriptive (avoid "click here")
4. **Section Length**: Keep sections focused - break up long content with headers
5. **Code Examples**: Use syntax highlighting by wrapping in `<pre><code>` tags
6. **Responsive Images**: All images automatically scale, but test on mobile
7. **Caption Placement**: Use `<figcaption>` for image descriptions, not `<p>` below image

## Need to Update Styles?

All blog post styling is in `/assets/css/project-pages.css` under the `/* BLOG POST ARTICLE STYLES */` section (starting around line 727).

Key selectors:
- `article.project-section` - Main article container
- `article.project-section .project-content` - Content wrapper
- `article.project-section p` - Paragraph styling
- `article.project-section a` - Link styling
- `article.project-section img` - Image styling
- `article.project-section figure` - Figure with caption
- `article.project-section code` - Inline code
- `article.project-section pre` - Code blocks
