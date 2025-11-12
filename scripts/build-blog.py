#!/usr/bin/env python3
"""
Blog Post Builder - Convert markdown drafts to HTML blog posts

This script:
1. Reads markdown files from .blogdrafts/
2. Converts them to HTML blog posts
3. Updates data/blog-posts.json
4. Updates index.html recent posts section
5. Adds image placeholders where specified

Usage:
    python3 scripts/build-blog.py post-1
    python3 scripts/build-blog.py all
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DRAFTS_DIR = PROJECT_ROOT / ".blogdrafts"
BLOG_DIR = PROJECT_ROOT / "blog"
DATA_DIR = PROJECT_ROOT / "data"
ASSETS_BLOG_DIR = PROJECT_ROOT / "assets" / "blog"

# Blog post metadata (update this for each post)
POST_METADATA = {
    "post-1": {
        "title": "Greasing the Gears",
        "description": "How I am using time-saving tools for development on MacOS",
        "date": "2024-12-15",
        "category": "Workflow",
        "tags": ["MacOS", "Productivity", "Development", "Tools"]
    },
    "post-2": {
        "title": "AI-Powered Local Development",
        "description": "Exploring Apple's MLX framework for running LLMs locally",
        "date": "2024-11-28",
        "category": "AI/ML",
        "tags": ["MLX", "AI", "Machine Learning", "Python"]
    },
    "post-3": {
        "title": "Hardware Meets Software",
        "description": "Creating custom Arduino devices with companion mobile apps",
        "date": "2024-11-10",
        "category": "Hardware",
        "tags": ["Arduino", "Mobile", "Hardware", "IoT"]
    }
}


def format_date(date_str):
    """Convert YYYY-MM-DD to 'Month DD, YYYY'"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.strftime("%B %d, %Y")


def format_date_short(date_str):
    """Convert YYYY-MM-DD to 'Mon DD, YYYY'"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.strftime("%b %d, %Y")


def markdown_to_html(md_content, post_id):
    """Convert markdown content to HTML sections"""
    lines = md_content.split('\n')
    html_sections = []
    current_section = []
    in_list = False

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Skip title and subtitle (first two lines)
        if i < 3:
            i += 1
            continue

        # Skip horizontal rules
        if line.strip() == '---':
            i += 1
            continue

        # Handle h2 headers (## Title)
        if line.startswith('## '):
            # Close previous section if exists
            if current_section:
                html_sections.append('\n'.join(current_section))
                current_section = []

            # Start new section
            title = line[3:].strip()
            current_section.append('            <section style="margin-bottom: 2rem;">')
            current_section.append(f'                <h2>{title}</h2>')
            i += 1
            continue

        # Handle unordered lists
        if line.strip().startswith('- '):
            if not in_list:
                current_section.append('                <ul style="margin-left: 2rem; margin-top: 1rem; line-height: 1.8;">')
                in_list = True

            # Extract list item content
            content = line.strip()[2:].strip()
            content = convert_inline_markdown(content)
            current_section.append(f'                    <li>{content}</li>')
            i += 1
            continue
        else:
            if in_list:
                current_section.append('                </ul>')
                in_list = False

        # Handle image placeholders: ![Alt](path)
        img_match = re.match(r'!\[([^\]]+)\]\(([^)]+)\)', line.strip())
        if img_match:
            alt_text = img_match.group(1)
            img_path = img_match.group(2)
            # Convert to proper path relative to blog post
            if not img_path.startswith('../'):
                img_path = f'../assets/blog/{post_id}/{img_path}'
            current_section.append(f'                <img src="{img_path}" alt="{alt_text}" style="margin: 1.5rem 0;">')
            i += 1
            continue

        # Handle regular paragraphs
        if line.strip() and not line.startswith('#'):
            content = convert_inline_markdown(line.strip())
            current_section.append(f'                <p>{content}</p>')

        i += 1

    # Close any open list
    if in_list:
        current_section.append('                </ul>')

    # Add final section
    if current_section:
        # Close section tag
        current_section.append('            </section>')
        html_sections.append('\n'.join(current_section))

    return '\n\n'.join(html_sections)


def convert_inline_markdown(text):
    """Convert inline markdown (bold, links, code, etc.)"""
    # Convert **bold** to <strong>
    text = re.sub(r'\*\*([^\*]+)\*\*', r'<strong>\1</strong>', text)

    # Convert `code` to <code>
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)

    # Convert [link](url) to <a href>
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)

    return text


def create_html_template(post_id, metadata, content_html):
    """Generate complete HTML file from template"""
    title = metadata['title']
    description = metadata['description']
    date_formatted = format_date(metadata['date'])

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Mitchell Carter</title>
    <meta name="description" content="{description}">

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
            <span class="breadcrumb-current">{title}</span>
        </div>
    </section>

    <!-- Blog Post Content -->
    <article class="project-section">
        <div class="project-content">
            <header style="margin-bottom: 2rem;">
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">{date_formatted}</p>
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">{title}</h1>
                <p style="color: #888; font-size: 1.1rem;">{description}</p>
            </header>

{content_html}
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
'''


def add_image_placeholders(post_id):
    """Create placeholder image files in assets/blog/post-X/"""
    post_assets_dir = ASSETS_BLOG_DIR / post_id
    post_assets_dir.mkdir(parents=True, exist_ok=True)

    # Create README for this post's assets
    readme_content = f"""# Assets for {POST_METADATA[post_id]['title']}

Add images for this blog post here.

## Suggested images:
- Tool screenshots
- Workflow diagrams
- App logos
- Before/after comparisons

## Naming convention:
Use descriptive names like:
- `rectangle-shortcuts.png`
- `raycast-search.png`
- `firefox-devtools.png`
"""

    readme_path = post_assets_dir / "README.md"
    readme_path.write_text(readme_content)
    print(f"  Created {readme_path}")


def build_post(post_id):
    """Build a single blog post"""
    print(f"\nBuilding {post_id}...")

    # Check if draft exists
    draft_path = DRAFTS_DIR / f"{post_id}.md"
    if not draft_path.exists():
        print(f"  Error: Draft not found at {draft_path}")
        return False

    # Check if metadata exists
    if post_id not in POST_METADATA:
        print(f"  Error: No metadata found for {post_id}")
        return False

    # Read markdown
    md_content = draft_path.read_text()
    metadata = POST_METADATA[post_id]

    # Convert to HTML
    content_html = markdown_to_html(md_content, post_id)

    # Generate full HTML
    full_html = create_html_template(post_id, metadata, content_html)

    # Write HTML file
    html_path = BLOG_DIR / f"{post_id}.html"
    html_path.write_text(full_html)
    print(f"  Created {html_path}")

    # Create image placeholder directory
    add_image_placeholders(post_id)

    print(f"  ✓ {post_id} built successfully!")
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/build-blog.py <post-id|all>")
        print("Example: python3 scripts/build-blog.py post-1")
        sys.exit(1)

    target = sys.argv[1]

    if target == "all":
        for post_id in POST_METADATA.keys():
            build_post(post_id)
    else:
        build_post(target)

    print("\n✓ Blog build complete!")
    print(f"\nNext steps:")
    print(f"1. Add images to assets/blog/{target}/ directory")
    print(f"2. Update image paths in .blogdrafts/{target}.md if needed")
    print(f"3. Run script again to rebuild with images")
    print(f"4. Test at http://localhost:8080/blog/{target}.html")


if __name__ == "__main__":
    main()
