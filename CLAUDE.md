# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern personal portfolio website built with vanilla HTML, CSS, and JavaScript. The site showcases Mitchell Carter's software development skills, projects, and professional experience with enhanced interactivity and individual project pages.

## Project Structure

### Core Files
- `index.html` - Main HTML file containing all page sections (profile, about, projects, experience, contact)
- `style.css` - Primary stylesheet with desktop styles and modern interactive elements
- `mediaqueries.css` - Responsive design styles for mobile/tablet devices
- `script.js` - JavaScript for hamburger menu, project filtering, and interactive features

### Directories
- `assets/` - Contains all images, icons, and resume PDF
  - `assets/css/` - Additional stylesheets (blog-pages.css, project-pages.css)
  - `assets/js/` - JavaScript modules (blog.js for blog functionality)
  - `assets/logos/` - Organization logos for timeline (needs mortar-creek.png)
- `projects/` - Individual project pages with detailed information
- `blog/` - Individual blog post pages (post-1.html, post-2.html, post-3.html)
- `data/` - JSON files for blog posts metadata and content management

## Development

This is currently a static website with plans to add build tooling. Changes can be made directly to the HTML, CSS, and JavaScript files.

### Testing Changes
- Open `index.html` directly in a browser to view changes
- Test responsive design by resizing the browser window or using browser dev tools
- Verify hamburger menu functionality on mobile viewport sizes
- Test project filtering and interactive elements

### Key Components
- **Navigation System**:
  - Desktop: Fixed top navbar with Blog, Projects, and Photos links
  - Mobile: Hamburger menu implemented across all pages
  - All navbars include "Mitchell Carter" as clickable home link
- **Blog System**:
  - Blog homepage (`blog.html`) with post grid and sidebar navigation
  - Individual blog posts with enhanced typography for comfortable reading
  - JSON-based blog post metadata (`data/blog-posts.json`)
  - Category filtering and post listing via `assets/js/blog.js`
- **Bento Box Layout**:
  - Profile section with hero image and social links
  - About Me section with bio content
  - Recent Posts section showcasing latest blog entries
  - Featured Projects section with filtering
  - Career Journey timeline (horizontal on desktop, vertical on mobile)
- **Projects System**:
  - Main projects page with search and filter capabilities
  - Individual project pages with detailed case studies
  - Consistent navigation across all project pages

### Layout Architecture
- **Two-View System**: The site uses a two-view responsive layout (desktop and mobile) with a breakpoint at 1550px
  - **Desktop View** (>1550px): Bento box grid layout (12 columns, 7x100px + 1 auto row)
    - Grid areas: profile (3 rows), about me (3 rows), recent posts (4 rows), projects (4 rows), timeline (auto height)
    - Timeline constrained to 120-150px height to ensure footer visibility
  - **Mobile View** (<1550px): Stacked vertical layout with simplified timeline
  - **Spacing**:
    - Body has 70px top padding for fixed navbar
    - `#bento-showcase` has 4rem top padding for additional clearance
    - All bento boxes have 2rem padding (including timeline for consistent alignment)
- **Timeline Component**:
  - Desktop: Horizontal timeline with nodes displayed inline, organization logos appear on hover
  - Mobile: Vertical timeline with logos always visible on the left side
  - Timeline nodes are clickable and open a modal with detailed experience information
  - The `.timeline-box` requires `overflow: visible` to display hover logos above the container
  - Timeline box uses `min-height: 120px; max-height: 150px` to prevent footer overlap
- **Blog Typography**:
  - Body text uses Georgia serif font at 1.125rem with 1.8 line-height for comfortable reading
  - Headers use system font stack (-apple-system, Segoe UI, Roboto)
  - Content width constrained to 680px for optimal readability
  - Responsive font scaling for mobile devices
- **Project Filtering**:
  - Main page (`index.html`): Inline filter toggle within projects box (collapsible)
  - Projects page (`projects.html`): Full filter interface with search and category buttons
  - Both pages share filtering logic via `script.js`
  - Skills are categorized as front-end, back-end, or general

### File Management
- All assets should be placed in the `assets/` directory
- Project images should be organized by project in subdirectories
- Profile and project images should be optimized for web use (WebP preferred)
- Resume PDF should be updated in `assets/resume.pdf` when needed
- Blog post metadata managed through `data/blog-posts.json`
- Organization logos for timeline stored in `assets/logos/` (mortar-creek.png still needed)

### Important CSS Notes
- Fixed navbar is 70px tall with `position: fixed`
- Footer uses `margin-top: auto` with flex layout to stay at bottom
- Footer has 4vh height (min 40px) with 2rem top margin for separation from timeline
- Bio box (About Me) and Recent Posts box use `overflow: hidden` to prevent content leakage
- Timeline grid row is set to `auto` height instead of fixed 100px
- All bento boxes maintain consistent 2rem padding for alignment

## Deployment

The site is deployed on Cloudflare Pages and automatically rebuilds when changes are pushed to the main branch.