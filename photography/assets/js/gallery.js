document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const galleryGrid = document.querySelector('.gallery-grid');
    const lightbox = document.querySelector('.lightbox');
    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxClose = lightbox.querySelector('.close');
    const lightboxPrev = lightbox.querySelector('.prev');
    const lightboxNext = lightbox.querySelector('.next');
    const loadMoreBtn = document.getElementById('load-more');
    const loadingIndicator = document.getElementById('loading-indicator');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // State
    let currentImages = [];
    let currentIndex = 0;
    let currentFilter = 'all';
    let page = 1;
    const imagesPerPage = 20;
    let masonry = null;
    let loading = false;
    let hasMoreImages = true;

    // Fetch images from the server
    async function fetchImages(filter = 'all', page = 1) {
        try {
            const response = await fetch(`/data/albums.json`);
            const data = await response.json();
            
            // Flatten all images from albums if filter is 'all'
            let images = [];
            if (filter === 'all') {
                Object.values(data).forEach(album => {
                    images = images.concat(album.images.map(img => ({
                        ...img,
                        album: album.title
                    })));
                });
            } else {
                images = data[filter]?.images || [];
            }

            // Sort by date
            images.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Paginate
            const start = (page - 1) * imagesPerPage;
            const paginatedImages = images.slice(start, start + imagesPerPage);

            // Update hasMoreImages flag
            hasMoreImages = start + imagesPerPage < images.length;

            return { images: paginatedImages, hasMore: hasMoreImages };
        } catch (error) {
            console.error('Error fetching images:', error);
            return [];
        }
    }

    // Create gallery item
    function createGalleryItem(image) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // Create img element with load handler for masonry layout
        const img = document.createElement('img');
        img.src = image.thumbnail;
        img.alt = image.title;
        img.loading = 'lazy';
        img.setAttribute('data-full', image.full);
        
        // Let image maintain natural aspect ratio for true masonry
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'gallery-item-info';
        infoDiv.innerHTML = `
            <h3>${image.title}</h3>
            ${image.album ? `<p>${image.album}</p>` : ''}
        `;

        item.appendChild(img);
        item.appendChild(infoDiv);
        
        item.addEventListener('click', () => openLightbox(image));
        
        // Handle image load for proper masonry layout
        img.addEventListener('load', () => {
            item.classList.add('loaded');
        });
        
        return item;
    }

    // Render gallery
    async function renderGallery(filter = 'all', append = false) {
        if (loading) return;
        loading = true;

        // Show loading indicator when appending (infinite scroll)
        if (append && loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }

        const result = await fetchImages(filter, page);
        const images = result.images || result; // Support both old and new return format
        
        if (!append) {
            galleryGrid.innerHTML = '';
            currentImages = [];
        }

        const fragment = document.createDocumentFragment();
        images.forEach(image => {
            fragment.appendChild(createGalleryItem(image));
            currentImages.push(image);
        });

        galleryGrid.appendChild(fragment);
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        loading = false;
        
        // Initialize or update masonry layout
        if (!masonry && window.MasonryLayout) {
            masonry = new window.MasonryLayout(galleryGrid, {
                itemSelector: '.gallery-item',
                columnWidth: 300,
                gutter: 16
            });
        }
        
        // Layout the items with a delay to ensure images are added to DOM and start loading
        setTimeout(() => {
            if (masonry) {
                masonry.layout();
            }
        }, 200);
    }

    // Lightbox functionality
    function openLightbox(image) {
        currentIndex = currentImages.findIndex(img => img.id === image.id);
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateLightboxImage() {
        const image = currentImages[currentIndex];
        lightboxImg.src = image.full;
        lightboxImg.alt = image.title;
        
        // Update image info
        const imageInfo = lightbox.querySelector('.image-info');
        imageInfo.innerHTML = `
            <h3 class="image-title">${image.title}</h3>
            <p class="image-date">${new Date(image.date).toLocaleDateString()}</p>
        `;

        // Update navigation visibility
        lightboxPrev.style.display = currentIndex > 0 ? 'block' : 'none';
        lightboxNext.style.display = currentIndex < currentImages.length - 1 ? 'block' : 'none';
    }

    function nextImage() {
        if (currentIndex < currentImages.length - 1) {
            currentIndex++;
            updateLightboxImage();
        }
    }

    function prevImage() {
        if (currentIndex > 0) {
            currentIndex--;
            updateLightboxImage();
        }
    }

    // Event Listeners
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxNext.addEventListener('click', nextImage);
    lightboxPrev.addEventListener('click', prevImage);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowRight':
                nextImage();
                break;
            case 'ArrowLeft':
                prevImage();
                break;
        }
    });

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            applyFilter(filter);
        });
    });

    // Function to apply filter (used by both sidebar and mobile)
    function applyFilter(filter) {
        // Update active state for sidebar filters only
        filterBtns.forEach(b => b.classList.remove('active'));
        filterBtns.forEach(b => {
            if (b.dataset.filter === filter) {
                b.classList.add('active');
            }
        });

        // Reset pagination and update gallery
        page = 1;
        currentFilter = filter;
        hasMoreImages = true;
        renderGallery(filter);
    }

    // Listen for mobile filter changes
    document.addEventListener('filterChange', (e) => {
        const filter = e.detail.filter;
        applyFilter(filter);
    });

    // Infinite scroll functionality
    function setupInfiniteScroll() {
        const threshold = 1000; // Load more when 1000px from bottom
        
        function checkScroll() {
            if (loading || !hasMoreImages) return;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            if (scrollTop + windowHeight >= documentHeight - threshold) {
                page++;
                renderGallery(currentFilter, true);
            }
        }
        
        // Throttle scroll events for better performance
        let ticking = false;
        function throttledCheckScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    checkScroll();
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', throttledCheckScroll);
    }

    // Legacy load more button (hidden by default now)
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none'; // Hide the load more button
        loadMoreBtn.addEventListener('click', () => {
            page++;
            renderGallery(currentFilter, true);
        });
    }

    // Initialize gallery and infinite scroll
    renderGallery();
    setupInfiniteScroll();

    // Lazy loading for gallery images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}); 