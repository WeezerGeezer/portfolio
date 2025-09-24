document.addEventListener('DOMContentLoaded', () => {
    // Only run on album page
    if (!document.querySelector('.album-container')) return;

    // Elements
    const albumTitle = document.getElementById('album-title');
    const albumDescription = document.getElementById('album-description');
    const albumName = document.getElementById('album-name');
    const albumGrid = document.querySelector('.album-grid');
    const shareButton = document.getElementById('share-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    let masonry = null;

    // Get album ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const albumId = urlParams.get('id');

    if (!albumId) {
        window.location.href = 'index.html';
        return;
    }

    // Load album data
    async function loadAlbumData() {
        try {
            showLoading(true);
            const response = await fetch('/data/albums.json');
            const data = await response.json();
            
            const album = data[albumId];
            if (!album) {
                throw new Error('Album not found');
            }

            return album;
        } catch (error) {
            console.error('Error loading album:', error);
            showError('Failed to load album');
        } finally {
            showLoading(false);
        }
    }

    // Render album content
    async function renderAlbum() {
        const album = await loadAlbumData();
        if (!album) return;

        // Update page title and meta description
        document.title = `${album.title} - Photography Portfolio`;
        document.querySelector('meta[name="description"]').content = album.description;

        // Update album header
        albumTitle.textContent = album.title;
        albumDescription.textContent = album.description;
        albumName.textContent = album.title;

        // Render images
        const fragment = document.createDocumentFragment();
        album.images.forEach(image => {
            const item = createAlbumItem(image);
            fragment.appendChild(item);
        });

        albumGrid.appendChild(fragment);

        // Initialize masonry layout
        if (!masonry && window.MasonryLayout) {
            masonry = new window.MasonryLayout(albumGrid, {
                itemSelector: '.gallery-item',
                columnWidth: 280,
                gutter: 12
            });
        }
        
        // Layout the items with a delay to ensure images are added to DOM and start loading
        setTimeout(() => {
            if (masonry) {
                masonry.layout();
            }
        }, 200);

        // Initialize lightbox for album images
        initializeLightbox(album.images);
    }

    // Create album item
    function createAlbumItem(image) {
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
            <p>${new Date(image.date).toLocaleDateString()}</p>
        `;

        item.appendChild(img);
        item.appendChild(infoDiv);
        
        // Handle image load for proper masonry layout
        img.addEventListener('load', () => {
            item.classList.add('loaded');
        });

        return item;
    }

    // Initialize lightbox for album images
    function initializeLightbox(images) {
        const lightbox = document.querySelector('.lightbox');
        const lightboxImg = lightbox.querySelector('.lightbox-img');
        const lightboxClose = lightbox.querySelector('.close');
        const lightboxPrev = lightbox.querySelector('.prev');
        const lightboxNext = lightbox.querySelector('.next');
        const imageInfo = lightbox.querySelector('.image-info');

        let currentIndex = 0;

        // Open lightbox
        document.querySelectorAll('.gallery-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                currentIndex = index;
                updateLightboxImage();
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        // Update lightbox image
        function updateLightboxImage() {
            const image = images[currentIndex];
            lightboxImg.src = image.full;
            lightboxImg.alt = image.title;
            
            imageInfo.innerHTML = `
                <h3 class="image-title">${image.title}</h3>
                <p class="image-date">${new Date(image.date).toLocaleDateString()}</p>
            `;

            // Update navigation visibility
            lightboxPrev.style.display = currentIndex > 0 ? 'block' : 'none';
            lightboxNext.style.display = currentIndex < images.length - 1 ? 'block' : 'none';
        }

        // Navigation
        lightboxClose.addEventListener('click', () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        });

        lightboxNext.addEventListener('click', () => {
            if (currentIndex < images.length - 1) {
                currentIndex++;
                updateLightboxImage();
            }
        });

        lightboxPrev.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateLightboxImage();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    lightbox.classList.remove('active');
                    document.body.style.overflow = '';
                    break;
                case 'ArrowRight':
                    if (currentIndex < images.length - 1) {
                        currentIndex++;
                        updateLightboxImage();
                    }
                    break;
                case 'ArrowLeft':
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateLightboxImage();
                    }
                    break;
            }
        });
    }

    // Share functionality
    if (shareButton && navigator.share) {
        shareButton.style.display = 'block';
        shareButton.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: document.title,
                    text: albumDescription.textContent,
                    url: window.location.href
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        });
    } else {
        shareButton.style.display = 'none';
    }

    // Loading state
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
        albumGrid.style.opacity = show ? '0.5' : '1';
    }

    // Error handling
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        albumGrid.innerHTML = '';
        albumGrid.appendChild(errorDiv);
    }

    // Initialize
    renderAlbum();

    // Lazy loading for album images
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