# Blog Assets

This directory contains images and other assets for blog posts.

## Structure

```
assets/blog/
├── post-1/          # Assets for "Greasing the Gears"
├── post-2/          # Assets for "AI-Powered Local Development"
├── post-3/          # Assets for "Hardware Meets Software"
└── README.md
```

## Usage in Blog Posts

To reference images in your HTML blog posts:

```html
<img src="../assets/blog/post-1/image-name.png" alt="Description">
```

To reference images in your markdown drafts:

```markdown
![Description](../assets/blog/post-1/image-name.png)
```

## Image Guidelines

- Use WebP format when possible for better performance
- Include descriptive alt text for accessibility
- Optimize images before adding (compress, resize appropriately)
- Name files descriptively: `rectangle-window-layout.png` not `screenshot1.png`
