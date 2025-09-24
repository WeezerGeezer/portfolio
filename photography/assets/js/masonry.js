/**
 * Simple Masonry Layout Implementation
 * Creates a Pinterest-style grid with varied image heights
 */

class MasonryLayout {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            itemSelector: '.gallery-item',
            columnWidth: 300,
            gutter: 16, // 1rem = 16px
            ...options
        };
        
        this.columns = [];
        this.columnCount = 0;
        this.resizeTimeout = null;
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Masonry: Container not found');
            return;
        }
        
        console.log('Masonry: Initializing with container:', this.container);
        this.calculateColumns();
        this.bindEvents();
    }

    calculateColumns() {
        const containerWidth = this.container.offsetWidth;
        const availableWidth = containerWidth - (parseInt(getComputedStyle(this.container).paddingLeft) * 2);
        
        // Calculate how many columns can fit
        this.columnCount = Math.floor(availableWidth / (this.options.columnWidth + this.options.gutter));
        this.columnCount = Math.max(1, this.columnCount); // At least 1 column
        
        // Calculate actual column width to fill available space
        const totalGutterWidth = (this.columnCount - 1) * this.options.gutter;
        const actualColumnWidth = (availableWidth - totalGutterWidth) / this.columnCount;
        
        this.actualColumnWidth = actualColumnWidth;
        
        // Initialize column height trackers
        this.columns = new Array(this.columnCount).fill(0);
    }

    layout() {
        if (!this.container) return;
        
        this.calculateColumns();
        
        const items = this.container.querySelectorAll(this.options.itemSelector);
        console.log(`Masonry: Laying out ${items.length} items in ${this.columnCount} columns`);
        
        // Mark container as masonry initialized
        this.container.classList.add('masonry-initialized');
        
        // Reset container and columns
        this.columns = new Array(this.columnCount).fill(0);
        
        items.forEach((item, index) => {
            this.positionItem(item, index);
        });
        
        // Set container height to tallest column
        const maxHeight = Math.max(...this.columns);
        this.container.style.height = `${maxHeight}px`;
        console.log(`Masonry: Container height set to ${maxHeight}px`);
    }

    positionItem(item, index) {
        // Find the shortest column
        const shortestColumnIndex = this.columns.indexOf(Math.min(...this.columns));
        
        // Calculate position
        const x = shortestColumnIndex * (this.actualColumnWidth + this.options.gutter);
        const y = this.columns[shortestColumnIndex];
        
        // Position the item
        item.style.position = 'absolute';
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.width = `${this.actualColumnWidth}px`;
        
        // Wait for images to load to get accurate height based on natural aspect ratio
        const img = item.querySelector('img');
        if (img) {
            if (img.complete && img.naturalWidth > 0) {
                // Image already loaded, calculate height from natural dimensions
                const aspectRatio = img.naturalHeight / img.naturalWidth;
                const calculatedHeight = this.actualColumnWidth * aspectRatio;
                
                // Set a reasonable min/max height to prevent extreme ratios
                const minHeight = 150;
                const maxHeight = 600;
                const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
                
                img.style.height = `${constrainedHeight}px`;
                img.style.objectFit = 'cover';
                
                this.updateColumnHeight(item, shortestColumnIndex);
            } else {
                // Wait for image to load to get natural dimensions
                const handleImageLoad = () => {
                    // Calculate height based on natural aspect ratio
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    const calculatedHeight = this.actualColumnWidth * aspectRatio;
                    
                    // Set a reasonable min/max height to prevent extreme ratios
                    const minHeight = 150;
                    const maxHeight = 600;
                    const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
                    
                    img.style.height = `${constrainedHeight}px`;
                    img.style.objectFit = 'cover';
                    
                    this.updateColumnHeight(item, shortestColumnIndex);
                };
                
                img.addEventListener('load', handleImageLoad, { once: true });
                
                // Fallback in case image fails to load
                img.addEventListener('error', () => {
                    img.style.height = '250px'; // Default height
                    this.updateColumnHeight(item, shortestColumnIndex);
                }, { once: true });
            }
        } else {
            this.updateColumnHeight(item, shortestColumnIndex);
        }
    }

    updateColumnHeight(item, columnIndex) {
        // Get the actual height of the item
        const itemHeight = item.offsetHeight;
        
        // Update column height
        this.columns[columnIndex] += itemHeight + this.options.gutter;
        
        // Update container height
        const maxHeight = Math.max(...this.columns);
        this.container.style.height = `${maxHeight}px`;
        
        // Show the item with fade-in effect
        item.classList.add('loaded');
    }

    addItems(newItems) {
        newItems.forEach((item, index) => {
            this.positionItem(item, this.container.children.length + index);
        });
    }

    bindEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.layout();
            }, 250);
        });
    }

    destroy() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        // Reset styles
        const items = this.container.querySelectorAll(this.options.itemSelector);
        items.forEach(item => {
            item.style.position = '';
            item.style.left = '';
            item.style.top = '';
            item.style.width = '';
        });
        this.container.style.height = '';
    }
}

// Export for use in other scripts
window.MasonryLayout = MasonryLayout;
