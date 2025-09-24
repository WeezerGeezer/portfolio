/**
 * Mobile Menu Toggle Functionality
 * Handles hamburger menu open/close and filter synchronization
 */

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const body = document.body;

    // Only proceed if mobile menu elements exist
    if (!hamburgerMenu || !mobileMenuOverlay) return;

    // Toggle mobile menu
    function toggleMobileMenu() {
        const isActive = mobileMenuOverlay.classList.contains('active');
        
        if (isActive) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    // Open mobile menu
    function openMobileMenu() {
        hamburgerMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    // Close mobile menu
    function closeMobileMenu() {
        hamburgerMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        body.style.overflow = ''; // Restore scrolling
    }

    // Event listeners
    hamburgerMenu.addEventListener('click', toggleMobileMenu);

    // Close menu when clicking on overlay background
    mobileMenuOverlay.addEventListener('click', (e) => {
        if (e.target === mobileMenuOverlay) {
            closeMobileMenu();
        }
    });

    // Close menu when clicking on navigation links
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // Synchronize filter buttons between desktop sidebar and mobile menu
    function synchronizeFilters() {
        const sidebarFilters = document.querySelectorAll('.sidebar .filter-btn');
        const mobileFilters = document.querySelectorAll('.mobile-filter-buttons .filter-btn');

        // Function to update both sets of filters
        function updateFilters(activeFilter) {
            // Update sidebar filters
            sidebarFilters.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === activeFilter) {
                    btn.classList.add('active');
                }
            });

            // Update mobile filters
            mobileFilters.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === activeFilter) {
                    btn.classList.add('active');
                }
            });
        }

        // Add event listeners to mobile filter buttons
        mobileFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                updateFilters(filter);
                
                // Trigger the gallery filter change (this will be handled by existing gallery.js)
                const event = new CustomEvent('filterChange', { detail: { filter } });
                document.dispatchEvent(event);

                // Close mobile menu after filter selection
                closeMobileMenu();
            });
        });

        // Add event listeners to sidebar filter buttons to sync with mobile
        sidebarFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                updateFilters(filter);
            });
        });
    }

    // Initialize filter synchronization
    synchronizeFilters();

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenuOverlay.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    // Handle window resize - close menu if resizing to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenuOverlay.classList.contains('active')) {
            closeMobileMenu();
        }
    });
});
