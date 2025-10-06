# Organization Logo Acquisition and Optimization Guide

## Overview
This guide provides detailed instructions for acquiring, optimizing, and implementing organization logos for the interactive timeline feature.

## Logo Requirements

### Technical Specifications
- **Format**: PNG with transparent background (preferred) or SVG
- **Size**: 200x200px minimum resolution
- **File Size**: Under 50KB per logo for optimal performance
- **Color Mode**: RGB for web display
- **Background**: Transparent preferred for better integration

### Organization-Specific Logos Needed

#### 1. University of Michigan "Block M" Logo
- **File Name**: `umich-logo.png`
- **Official Source**: https://brand.umich.edu/design-resources/logos/
- **Usage Guidelines**: Follow U-M Brand Guidelines
- **Colors**: Maize (#FFCB05) and Blue (#00274C)
- **Notes**: The Block M is the most recognizable symbol

#### 2. University of Michigan ITS Logo
- **File Name**: `umits-logo.png`
- **Official Source**: Contact UM ITS directly or use university logo variation
- **Alternative**: Use general UM logo with ITS text overlay
- **Colors**: Michigan Blue (#00274C) primary
- **Notes**: May need to create custom version combining UM branding with ITS identity

#### 3. Inter-Cooperative Council (ICC) Logo
- **File Name**: `icc-logo.png`
- **Official Source**: https://icc.coop/ or contact ICC directly
- **Colors**: Typically earth tones or cooperative movement colors
- **Notes**: Look for cooperative housing symbol or ICC-specific branding

#### 4. Nar Cannabis Logo
- **File Name**: `nar-logo.png`
- **Official Source**: Company website or request from employer
- **Colors**: Typically green-based color scheme for cannabis industry
- **Notes**: Ensure you have permission to use company logo

#### 5. Boy Scouts of America Eagle Scout Logo
- **File Name**: `boy-scouts-logo.png`
- **Official Source**: https://www.scouting.org/resources/insignia-guide/
- **Usage Guidelines**: Follow BSA Brand Guidelines for Eagle Scout insignia
- **Colors**: Navy Blue (#1f4e79) and Red (#c41e3a) with Gold accents
- **Recommended Options**:
  - Eagle Scout rank badge (preferred for achievement recognition)
  - BSA fleur-de-lis symbol (alternative)
  - Eagle Scout medal design
- **Notes**: Use Eagle Scout badge or BSA fleur-de-lis symbol; respect trademark guidelines
- **Legal**: BSA trademarks used for educational/portfolio purposes under fair use

## Logo Acquisition Process

### Step 1: Official Sources
1. **University Logos**: Download from official brand portals
2. **Company Logos**: Contact communications/marketing department
3. **Organization Logos**: Check official websites or contact directly

### Step 2: Alternative Sources (if official not available)
1. **Logo Repositories**:
   - Brandfetch.io
   - LogoEPS.com
   - Company press kits
2. **Social Media**: High-resolution profile pictures
3. **LinkedIn**: Company page logos

### Step 3: Logo Creation (if needed)
1. **Text-Based Logos**: Use organization initials with matching fonts
2. **Icon Fonts**: Font Awesome or similar for generic representations
3. **Custom Design**: Create simple, recognizable symbols

## Logo Optimization

### Image Optimization Tools
1. **TinyPNG**: https://tinypng.com/ - PNG compression
2. **SVGOMG**: https://jakearchibald.github.io/svgomg/ - SVG optimization
3. **Adobe Photoshop**: Professional editing and export
4. **GIMP**: Free alternative for editing

### Optimization Steps
1. **Resize**: Scale to exactly 200x200px
2. **Background**: Remove or ensure transparency
3. **Compress**: Reduce file size while maintaining quality
4. **Format**: Convert to PNG if not already
5. **Test**: Verify quality at different sizes

### Web Performance
- Use `loading="lazy"` for images below the fold
- Consider WebP format for better compression
- Implement image placeholders during load

## CSS Integration

### Background Gradients
The timeline uses organization-specific gradients:

```css
/* University of Michigan */
.organization-logo[data-org="umich"] {
    background: linear-gradient(135deg, #ffcb05 0%, #00274c 100%);
}

/* UM ITS */
.organization-logo[data-org="umits"] {
    background: linear-gradient(135deg, #00274c 0%, #4a90e2 100%);
}

/* ICC */
.organization-logo[data-org="icc"] {
    background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
}

/* Nar Cannabis */
.organization-logo[data-org="nar"] {
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
}

/* Boy Scouts of America */
.organization-logo[data-org="boy-scouts"] {
    background: linear-gradient(135deg, #1f4e79 0%, #c41e3a 100%);
}
```

### Fallback Strategy
If logos are unavailable, the timeline will display:
1. Organization initials in the gradient backgrounds
2. Generic industry icons
3. Colored placeholders with text

## Implementation Checklist

### Pre-Implementation
- [ ] Gather all required logos
- [ ] Verify usage rights and permissions
- [ ] Optimize images for web use
- [ ] Test on different screen sizes
- [ ] Ensure accessibility compliance

### File Structure
```
assets/
└── logos/
    ├── umich-logo.png
    ├── umits-logo.png
    ├── icc-logo.png
    ├── nar-logo.png
    ├── boy-scouts-logo.png
    └── LOGO_GUIDE.md
```

### Testing
- [ ] Logo hover animations work smoothly
- [ ] Images load quickly on all devices
- [ ] Fallbacks work if images fail to load
- [ ] Color contrast meets accessibility standards
- [ ] Mobile responsive display functions properly

## Accessibility Considerations

### Alt Text
Each logo image should have descriptive alt text:
```html
<img src="./assets/logos/umich-logo.png"
     alt="University of Michigan Block M Logo"
     class="logo-img">
```

### Color Contrast
- Ensure logos maintain readability on gradient backgrounds
- Test with various accessibility tools
- Provide text alternatives where needed

## Legal Considerations

### Trademark Usage
- University logos: Follow institutional brand guidelines
- Company logos: Obtain permission for portfolio use
- Fair use: Educational/portfolio context generally acceptable
- Attribution: Provide credit where required

### Best Practices
1. Always seek permission when possible
2. Use logos respectfully and in context
3. Don't modify official logos without permission
4. Consider generic alternatives for sensitive brands

## Troubleshooting

### Common Issues
1. **Large File Sizes**: Use image compression tools
2. **Poor Quality**: Source higher resolution originals
3. **Background Issues**: Ensure transparent backgrounds
4. **Loading Errors**: Implement proper fallbacks
5. **Permission Issues**: Use generic alternatives

### Performance Issues
- Monitor page load times after adding logos
- Use browser developer tools to check image optimization
- Consider lazy loading for non-critical images
- Implement image caching strategies

## Future Enhancements

### Advanced Features
1. **SVG Animations**: Logo entrance animations
2. **Interactive States**: Logo changes on hover/click
3. **Dynamic Loading**: Load logos based on data
4. **Lazy Loading**: Optimize initial page load
5. **WebP Support**: Modern image format adoption

This guide ensures proper logo implementation while maintaining legal compliance and optimal performance for the interactive timeline feature.