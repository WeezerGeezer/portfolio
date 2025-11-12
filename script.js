function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    menu.classList.toggle("open")
    icon.classList.toggle("open")
}

// PROJECT FILTERING FUNCTIONALITY
document.addEventListener('DOMContentLoaded', function() {
    const projectCards = document.querySelectorAll('.project-card, .project-list-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('project-search');
    const projectCount = document.getElementById('project-count');
    const clearFiltersBtn = document.getElementById('clear-filters');

    let activeFilters = new Set(['all']);
    let searchTerm = '';

    // Initialize project filtering
    function initializeFiltering() {
        updateProjectCount();
        attachEventListeners();
    }

    // Attach event listeners
    function attachEventListeners() {
        // Filter button click handlers
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                handleFilterClick(this);
            });
        });

        // Search input handler
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchTerm = this.value.toLowerCase();
                filterProjects();
            });
        }

        // Clear filters button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearAllFilters);
        }
    }

    // Handle filter button clicks
    function handleFilterClick(button) {
        const filter = button.getAttribute('data-filter');

        // Handle "All Projects" button
        if (filter === 'all') {
            // Clear all other filters and activate "all"
            activeFilters.clear();
            activeFilters.add('all');
            updateFilterButtonStates();
        } else {
            // Remove "all" if it's active and add specific filter
            if (activeFilters.has('all')) {
                activeFilters.delete('all');
            }

            // Toggle the clicked filter
            if (activeFilters.has(filter)) {
                activeFilters.delete(filter);
            } else {
                activeFilters.add(filter);
            }

            // If no filters are active, revert to "all"
            if (activeFilters.size === 0) {
                activeFilters.add('all');
            }

            updateFilterButtonStates();
        }

        filterProjects();
    }

    // Update visual state of filter buttons
    function updateFilterButtonStates() {
        filterButtons.forEach(button => {
            const filter = button.getAttribute('data-filter');
            if (activeFilters.has(filter)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Show/hide clear filters button
        const hasActiveFilters = !activeFilters.has('all') || searchTerm !== '';
        if (clearFiltersBtn) {
            clearFiltersBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
        }
    }

    // Main filtering function
    function filterProjects() {
        let visibleCount = 0;

        projectCards.forEach(card => {
            const shouldShow = shouldShowProject(card);

            if (shouldShow) {
                card.classList.remove('filtered-out');
                visibleCount++;
            } else {
                card.classList.add('filtered-out');
            }
        });

        updateProjectCount(visibleCount);
    }

    // Determine if a project should be shown based on current filters
    function shouldShowProject(card) {
        const technologies = card.getAttribute('data-technologies');
        const categories = card.getAttribute('data-categories');
        const title = card.getAttribute('data-title');
        const description = card.getAttribute('data-description');

        // Check search term
        if (searchTerm !== '') {
            const searchableText = `${title} ${description} ${technologies} ${categories}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // If "all" is active (and it's the only filter), show all projects
        if (activeFilters.has('all') && activeFilters.size === 1) {
            return true;
        }

        // Check if project matches any active filters
        for (const filter of activeFilters) {
            if (filter === 'all') continue;

            if (technologies && technologies.includes(filter)) {
                return true;
            }
            if (categories && categories.includes(filter)) {
                return true;
            }
        }

        return false;
    }

    // Update project count display
    function updateProjectCount(visibleCount = null) {
        if (!projectCount) return;

        if (visibleCount === null) {
            visibleCount = projectCards.length;
        }

        const totalCount = projectCards.length;
        const countText = visibleCount === totalCount
            ? `Showing all ${totalCount} projects`
            : `Showing ${visibleCount} of ${totalCount} projects`;

        projectCount.textContent = countText;
    }

    // Clear all filters and search
    function clearAllFilters() {
        // Reset filters to "all"
        activeFilters.clear();
        activeFilters.add('all');

        // Clear search input
        if (searchInput) {
            searchInput.value = '';
        }
        searchTerm = '';

        // Update UI
        updateFilterButtonStates();
        filterProjects();
    }

    // Add smooth scroll to projects section when filters are used
    function scrollToProjects() {
        const projectsSection = document.getElementById('projects');
        if (projectsSection) {
            const offsetTop = projectsSection.offsetTop - 100; // Account for fixed nav
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    // Add URL parameter support for shareable filtered views
    function updateURL() {
        const params = new URLSearchParams();

        if (!activeFilters.has('all')) {
            params.set('filters', Array.from(activeFilters).join(','));
        }

        if (searchTerm !== '') {
            params.set('search', searchTerm);
        }

        const newURL = params.toString()
            ? `${window.location.pathname}?${params.toString()}${window.location.hash}`
            : `${window.location.pathname}${window.location.hash}`;

        window.history.replaceState({}, '', newURL);
    }

    // Load filters from URL parameters
    function loadFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);

        // Load filters
        const urlFilters = params.get('filters');
        if (urlFilters) {
            activeFilters.clear();
            urlFilters.split(',').forEach(filter => activeFilters.add(filter));
        }

        // Load search term
        const urlSearch = params.get('search');
        if (urlSearch && searchInput) {
            searchInput.value = urlSearch;
            searchTerm = urlSearch.toLowerCase();
        }

        updateFilterButtonStates();
        filterProjects();
    }

    // Initialize everything
    initializeFiltering();
    loadFiltersFromURL();
});

// ===== INTERACTIVE TIMELINE FUNCTIONALITY =====

// Global flag to prevent multiple event listener attachments
let timelineListenersAttached = false;

document.addEventListener('DOMContentLoaded', function() {
    const timelineModal = document.getElementById('timelineModal');
    const modalClose = document.getElementById('modalClose');
    const modalBody = document.getElementById('modalBody');
    const timelineProgress = document.getElementById('timelineProgress');

    // Initialize timeline
    function initializeTimeline() {
        attachTimelineEventListeners();
        animateProgressLine();
        handleResponsiveTimeline();
    }

    // Attach event listeners for timeline interactions using event delegation
    function attachTimelineEventListeners() {
        // Prevent multiple attachments
        if (timelineListenersAttached) return;
        timelineListenersAttached = true;

        // Use event delegation for timeline nodes (works for both desktop bento and mobile timelines)
        document.addEventListener('click', function(e) {
            const node = e.target.closest('.timeline-node');
            if (node) {
                const timelineId = node.getAttribute('data-timeline');
                console.log('Timeline node clicked:', timelineId);
                openTimelineModal(timelineId);
                setActiveNode(node);
            }
        });

        // Enhanced hover effects using event delegation
        document.addEventListener('mouseenter', function(e) {
            const node = e.target.closest('.timeline-node');
            if (node) {
                node.classList.add('hovered');
                animateNodeHover(node, true);
            }
        }, true);

        document.addEventListener('mouseleave', function(e) {
            const node = e.target.closest('.timeline-node');
            if (node) {
                node.classList.remove('hovered');
                animateNodeHover(node, false);
            }
        }, true);

        // Modal close handlers
        if (modalClose) {
            modalClose.addEventListener('click', closeTimelineModal);
        }

        if (timelineModal) {
            timelineModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeTimelineModal();
                }
            });
        }

        // Keyboard accessibility
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && timelineModal.style.display === 'block') {
                closeTimelineModal();
            }
        });

        // Responsive timeline handling
        window.addEventListener('resize', handleResponsiveTimeline);
    }

    // Animate progress line on scroll
    function animateProgressLine() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate progress line from start to end over time
                    animateProgress();
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '-100px'
        });

        const timelineContainer = document.querySelector('.timeline-container');
        if (timelineContainer) {
            observer.observe(timelineContainer);
        }
    }

    // Progress line animation
    function animateProgress() {
        if (!timelineProgress) return;

        const isMobile = window.innerWidth <= 600;

        if (isMobile) {
            // Horizontal animation for mobile (same as desktop)
            timelineProgress.setAttribute('x2', '100');

            // Animate to end of timeline
            setTimeout(() => {
                timelineProgress.setAttribute('x2', '700');
            }, 300);
        } else {
            // Horizontal animation for desktop
            timelineProgress.setAttribute('x2', '50');

            // Animate to end of timeline
            setTimeout(() => {
                timelineProgress.setAttribute('x2', '700'); // Match the end of timeline
            }, 300);
        }
    }

    // Enhanced node hover animation
    function animateNodeHover(node, isEntering) {
        const circle = node.querySelector('.node-circle');
        const logo = node.querySelector('.organization-logo');
        const title = node.querySelector('.node-title');
        const year = node.querySelector('.node-year');

        if (isEntering) {
            // Add additional hover effects
            if (circle) {
                circle.style.transform = 'scale(1.2)';
                circle.style.boxShadow = '0 4px 20px rgba(74, 144, 226, 0.4)';
            }

            // Stagger text animation
            if (year) {
                setTimeout(() => {
                    year.style.transform = 'translateY(-4px)';
                    year.style.color = '#4a90e2';
                }, 50);
            }

            if (title) {
                setTimeout(() => {
                    title.style.transform = 'translateY(-4px)';
                    title.style.color = '#2980b9';
                }, 100);
            }
        } else {
            // Reset animations
            if (circle) {
                circle.style.transform = '';
                circle.style.boxShadow = '';
            }
            if (year) {
                year.style.transform = '';
                year.style.color = '';
            }
            if (title) {
                title.style.transform = '';
                title.style.color = '';
            }
        }
    }

    // Set active timeline node
    function setActiveNode(activeNode) {
        // Remove active class from all nodes
        const allTimelineNodes = document.querySelectorAll('.timeline-node');
        allTimelineNodes.forEach(node => {
            node.classList.remove('active');
        });

        // Add active class to clicked node
        activeNode.classList.add('active');
    }

    // Open timeline modal with content
    function openTimelineModal(timelineId) {
        console.log('Opening modal for:', timelineId);
        console.log('timelineModal:', timelineModal);
        console.log('modalBody:', modalBody);

        if (!timelineModal || !modalBody) {
            console.log('Modal or body not found, returning');
            return;
        }

        // Find the corresponding timeline detail
        const timelineDetail = document.querySelector(`.timeline-detail[data-id="${timelineId}"]`);
        console.log('timelineDetail found:', timelineDetail);

        if (timelineDetail) {
            // Clone the content to avoid moving DOM elements
            const content = timelineDetail.cloneNode(true);
            content.style.display = 'block';

            // Clear previous content and add new content
            modalBody.innerHTML = '';
            modalBody.appendChild(content);

            // Show modal with animation
            timelineModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scroll

            // Focus management for accessibility
            setTimeout(() => {
                const closeButton = modalClose;
                if (closeButton) {
                    closeButton.focus();
                }
            }, 100);
        } else {
            console.log('Timeline detail not found, restoring scroll');
            // If detail not found, make sure scroll is not locked
            document.body.style.overflow = '';
        }
    }

    // Close timeline modal
    function closeTimelineModal() {
        if (!timelineModal) return;

        timelineModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll

        // Remove active states
        const allTimelineNodes = document.querySelectorAll('.timeline-node');
        allTimelineNodes.forEach(node => {
            node.classList.remove('active');
        });
    }

    // Handle responsive timeline layout changes
    function handleResponsiveTimeline() {
        const isMobile = window.innerWidth <= 600;
        const timelineLine = document.querySelector('.timeline-line');
        const timelineBase = document.querySelector('.timeline-base');
        const progressLine = document.querySelector('.timeline-progress');

        if (!timelineLine || !timelineBase || !progressLine) return;

        if (isMobile) {
            // Switch to horizontal mobile layout (same as desktop but responsive)
            timelineLine.setAttribute('viewBox', '0 0 800 100');

            // Update base line for horizontal mobile
            timelineBase.setAttribute('x1', '100');
            timelineBase.setAttribute('y1', '50');
            timelineBase.setAttribute('x2', '700');
            timelineBase.setAttribute('y2', '50');

            // Update progress line for horizontal mobile
            progressLine.setAttribute('x1', '100');
            progressLine.setAttribute('y1', '50');
            progressLine.setAttribute('x2', '100');
            progressLine.setAttribute('y2', '50');
        } else {
            // Switch to horizontal layout
            timelineLine.setAttribute('viewBox', '0 0 800 100');

            // Update base line for horizontal
            timelineBase.setAttribute('x1', '100');
            timelineBase.setAttribute('y1', '50');
            timelineBase.setAttribute('x2', '700');
            timelineBase.setAttribute('y2', '50');

            // Update progress line for horizontal
            progressLine.setAttribute('x1', '100');
            progressLine.setAttribute('y1', '50');
            progressLine.setAttribute('x2', '100');
            progressLine.setAttribute('y2', '50');
        }
    }

    // Keyboard navigation for accessibility
    function handleKeyboardNavigation(e) {
        if (timelineModal.style.display !== 'block') {
            // Timeline navigation when modal is closed
            const focusedNode = document.activeElement;
            if (focusedNode && focusedNode.classList.contains('timeline-node')) {
                let targetNode = null;

                switch(e.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        targetNode = focusedNode.previousElementSibling;
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                        targetNode = focusedNode.nextElementSibling;
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        focusedNode.click();
                        return;
                }

                if (targetNode && targetNode.classList.contains('timeline-node')) {
                    e.preventDefault();
                    targetNode.focus();
                }
            }
        }
    }

    // Make timeline nodes focusable
    function setupAccessibility() {
        const allTimelineNodes = document.querySelectorAll('.timeline-node');
        allTimelineNodes.forEach((node, index) => {
            node.setAttribute('tabindex', '0');
            node.setAttribute('role', 'button');

            const title = node.querySelector('.node-title');
            const year = node.querySelector('.node-year');

            if (title && year) {
                node.setAttribute('aria-label',
                    `View details for ${title.textContent} (${year.textContent})`
                );
            }
        });

        document.addEventListener('keydown', handleKeyboardNavigation);
    }

    // Smooth scroll to timeline when section link is clicked
    function setupScrollToTimeline() {
        const experienceLinks = document.querySelectorAll('a[href="#experience"]');

        experienceLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                const timelineContainer = document.querySelector('.timeline-container');
                if (timelineContainer) {
                    const offsetTop = timelineContainer.offsetTop - 100;

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Initialize all timeline functionality
    initializeTimeline();
    setupAccessibility();
    setupScrollToTimeline();
});

// ===== BENTO BOX FUNCTIONALITY =====

// Global variables for cross-scope access
let bentoActiveFilters = new Set(['all']);
let bentoSearchTerm = '';
let bentoProjectsGrid = null;
let compactProjectSearch = null;
let compactProjectCount = null;
let populateFeaturedProjects = null;
let updateBentoProjectCount = null;
let filterProjectsBySkill = null;

document.addEventListener('DOMContentLoaded', function() {
    bentoProjectsGrid = document.getElementById('bento-projects-grid');
    compactProjectSearch = document.getElementById('bento-project-search');
    const inlineProjectSearch = document.getElementById('bento-project-search-inline');
    const compactFilterButtons = document.querySelectorAll('.compact-filter-btn');
    compactProjectCount = document.getElementById('compact-project-count');
    const statNumbers = document.querySelectorAll('.stat-number');
    const filterToggleBtn = document.getElementById('filter-toggle');
    const projectsFilter = document.getElementById('projects-filter');

    // Initialize bento functionality
    function initializeBento() {
        populateFeaturedProjects();
        animateStatNumbers();
        attachBentoEventListeners();
        setupFilterToggle();
        cloneSkillsToInlineFilter();
    }

    // Animate stat numbers when in view
    function animateStatNumbers() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateNumber(entry.target);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '-50px'
        });

        statNumbers.forEach(stat => observer.observe(stat));
    }

    // Animate individual stat number
    function animateNumber(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }

            // Format large numbers
            if (target >= 1000) {
                element.textContent = (current / 1000).toFixed(1) + 'K';
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    // Populate featured projects in bento grid
    populateFeaturedProjects = function() {
        if (!bentoProjectsGrid) return;

        const projects = [
            {
                title: 'Time Crisis Search',
                tech: 'AI + Python',
                image: './assets/project-6.webp',
                link: './projects/time-crisis-search.html',
                technologies: 'Python,Whoosh,Google Cloud,OpenAI Whisper,Flask,JavaScript',
                categories: 'Web Development,AI/ML,Search Engine',
                featured: true
            },
            {
                title: 'Arduino Catchphrase',
                tech: 'Hardware + Swift',
                image: './assets/project-5.webp',
                link: './projects/arduino-catchphrase.html',
                technologies: 'Arduino,C++,Swift,iOS Development,Hardware',
                categories: 'Hardware,Mobile Development,Game Development',
                featured: true
            },
            {
                title: 'M-Event Mobile App',
                tech: 'React Native',
                image: './assets/project-1.webp',
                link: './projects/m-event-app.html',
                technologies: 'React Native,PostgreSQL,JavaScript,Node.js,Express,Mobile Development',
                categories: 'Mobile Development,Full Stack,Database Design',
                featured: true
            },
            {
                title: 'MLX Local Models Toolkit',
                tech: 'Python + MLX',
                image: './assets/project-2.png',
                link: './projects/mlx-local-models.html',
                technologies: 'Python,MLX,Gradio,Machine Learning,macOS',
                categories: 'AI/ML,Web Application,Performance Optimization',
                featured: true
            },
            {
                title: 'Photography Portfolio',
                tech: 'HTML + CSS',
                image: './assets/project-3.png',
                link: './projects/photography-portfolio.html',
                technologies: 'HTML,CSS,JavaScript',
                categories: 'Web Development,Frontend,Design',
                featured: false
            },
            {
                title: 'Clip Generator',
                tech: 'Python + AI',
                image: './assets/project-4.jpeg',
                link: './projects/clip-gen.html',
                technologies: 'Python,OpenAI,FFmpeg,Machine Learning',
                categories: 'AI/ML,Video Processing,Automation',
                featured: false
            },
            {
                title: 'White Border Tool',
                tech: 'Python',
                image: './assets/project-3.png',
                link: './projects/white-border-tool.html',
                technologies: 'Python,PIL,Image Processing',
                categories: 'Desktop Application,Image Processing',
                featured: false
            },
            {
                title: 'Resume Generator',
                tech: 'Python + LaTeX',
                image: './assets/project-4.jpeg',
                link: './projects/resume-generator.html',
                technologies: 'Python,LaTeX,Automation',
                categories: 'Automation,Document Processing',
                featured: false
            }
        ];

        // Create project cards
        const filteredProjects = filterBentoProjects(projects);
        renderBentoProjects(filteredProjects);
    }

    // Filter projects based on bento filters
    function filterBentoProjects(projects) {
        let filtered = projects.filter(project => {
            // Check search term
            if (bentoSearchTerm !== '') {
                const searchableText = `${project.title} ${project.tech} ${project.technologies} ${project.categories}`.toLowerCase();
                if (!searchableText.includes(bentoSearchTerm)) {
                    return false;
                }
            }

            // If "all" is active, only show featured projects
            if (bentoActiveFilters.has('all')) {
                return project.featured === true;
            }

            // Check if project matches any active filters
            for (const filter of bentoActiveFilters) {
                if (project.technologies.includes(filter) || project.categories.includes(filter)) {
                    return true;
                }
            }

            return false;
        });

        // Limit to 4 projects when "all" is active and no search term
        if (bentoActiveFilters.has('all') && bentoSearchTerm === '') {
            filtered = filtered.slice(0, 4);
        }

        return filtered;
    }

    // Render projects in bento grid
    function renderBentoProjects(projects) {
        if (!bentoProjectsGrid) return;

        bentoProjectsGrid.innerHTML = '';

        if (projects.length === 0) {
            bentoProjectsGrid.innerHTML = '<div class="no-projects">No projects match your filters</div>';
            return;
        }

        projects.forEach((project, index) => {
            const projectCard = document.createElement('div');
            projectCard.className = 'bento-project-card';
            projectCard.style.animationDelay = `${index * 0.1}s`;

            // Convert technologies string to comma-separated list
            const techList = project.technologies.split(',').join(', ');

            projectCard.innerHTML = `
                <div class="bento-project-content">
                    <h4 class="bento-project-title">${project.title}</h4>
                    <p class="bento-project-tech">${techList}</p>
                    <a href="${project.link}" class="bento-project-link">Learn More →</a>
                </div>
            `;

            // Add click handler
            projectCard.addEventListener('click', () => {
                window.location.href = project.link;
            });

            bentoProjectsGrid.appendChild(projectCard);
        });

        // Update count
        updateBentoProjectCount(projects.length);
    }

    // Update project count display
    updateBentoProjectCount = function(count) {
        if (!compactProjectCount) return;

        const totalCount = 8; // Total number of projects
        const countText = count === totalCount
            ? `${totalCount} projects`
            : `${count} of ${totalCount}`;

        compactProjectCount.textContent = countText;
    }

    // Setup filter toggle functionality
    function setupFilterToggle() {
        if (filterToggleBtn && projectsFilter) {
            filterToggleBtn.addEventListener('click', function() {
                this.classList.toggle('active');
                projectsFilter.classList.toggle('active');
            });
        }
    }

    // Clone skills from the old filter box to the new inline filter
    function cloneSkillsToInlineFilter() {
        const originalSkills = document.querySelector('#filtered-skills');
        const inlineSkillsFilter = document.querySelector('.inline-skills-filter');

        if (originalSkills && inlineSkillsFilter) {
            // Clone all skill tags
            const skillTags = originalSkills.querySelectorAll('.skill-tag');

            skillTags.forEach(skill => {
                const clonedSkill = skill.cloneNode(true);

                // Re-attach click event listener to cloned skill
                clonedSkill.addEventListener('click', function() {
                    const skillName = this.getAttribute('data-skill');

                    // Toggle selected state on both original and cloned
                    this.classList.toggle('selected');
                    skill.classList.toggle('selected');

                    // Apply skill-based project filtering
                    filterProjectsBySkill(skillName, this.classList.contains('selected'));
                });

                inlineSkillsFilter.appendChild(clonedSkill);
            });
        }
    }

    // Attach event listeners for bento interactions
    function attachBentoEventListeners() {
        // Compact filter buttons
        compactFilterButtons.forEach(button => {
            button.addEventListener('click', function() {
                handleBentoFilterClick(this);
            });
        });

        // Compact search
        if (compactProjectSearch) {
            compactProjectSearch.addEventListener('input', function() {
                bentoSearchTerm = this.value.toLowerCase();
                populateFeaturedProjects();
            });
        }

        // Inline search (new filter inside projects box)
        if (inlineProjectSearch) {
            inlineProjectSearch.addEventListener('input', function() {
                bentoSearchTerm = this.value.toLowerCase();
                populateFeaturedProjects();
            });
        }
    }

    // Handle bento filter clicks
    function handleBentoFilterClick(button) {
        const filter = button.getAttribute('data-filter');

        // Handle "All" button
        if (filter === 'all') {
            bentoActiveFilters.clear();
            bentoActiveFilters.add('all');
        } else {
            // Remove "all" if it's active
            if (bentoActiveFilters.has('all')) {
                bentoActiveFilters.delete('all');
            }

            // Toggle the clicked filter
            if (bentoActiveFilters.has(filter)) {
                bentoActiveFilters.delete(filter);
            } else {
                bentoActiveFilters.add(filter);
            }

            // If no filters are active, revert to "all"
            if (bentoActiveFilters.size === 0) {
                bentoActiveFilters.add('all');
            }
        }

        // Update button states
        compactFilterButtons.forEach(btn => {
            const btnFilter = btn.getAttribute('data-filter');
            if (bentoActiveFilters.has(btnFilter)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Re-populate projects
        populateFeaturedProjects();
    }

    // Initialize bento functionality
    initializeBento();
});

// ===== SKILLS FILTERING FUNCTIONALITY =====
document.addEventListener('DOMContentLoaded', function() {
    const skillsFilterItems = document.querySelectorAll('.filter-item');
    const skillTags = document.querySelectorAll('#filtered-skills .skill-tag');
    let activeSkillsFilter = 'all';

    // Initialize skills filtering
    function initializeSkillsFiltering() {
        attachSkillsFilterListeners();
        attachSkillClickListeners();
        filterSkills('all'); // Show all skills by default
    }

    // Attach event listeners for skills filter items
    function attachSkillsFilterListeners() {
        skillsFilterItems.forEach(item => {
            item.addEventListener('click', function() {
                const filter = this.getAttribute('data-skills-filter');
                handleSkillsFilterClick(this, filter);
            });
        });
    }

    // Handle skills filter item clicks
    function handleSkillsFilterClick(item, filter) {
        // Update active filter
        activeSkillsFilter = filter;

        // Update item states
        skillsFilterItems.forEach(filterItem => {
            const dot = filterItem.querySelector('.filter-dot');
            dot.classList.remove('active');
        });

        const activeDot = item.querySelector('.filter-dot');
        activeDot.classList.add('active');

        // Filter skills
        filterSkills(filter);
    }

    // Filter skills based on category
    function filterSkills(category) {
        skillTags.forEach(skill => {
            const skillCategory = skill.getAttribute('data-skill-category');

            if (category === 'all' || skillCategory === category) {
                skill.classList.remove('hidden');
                skill.style.display = 'inline-block';
            } else {
                skill.classList.add('hidden');
                skill.style.display = 'none';
            }
        });

        // Add animation delay for visible skills
        const visibleSkills = Array.from(skillTags).filter(skill => !skill.classList.contains('hidden'));
        visibleSkills.forEach((skill, index) => {
            skill.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Handle skill clicks for project filtering
    function attachSkillClickListeners() {
        skillTags.forEach(skill => {
            skill.addEventListener('click', function() {
                const skillName = this.getAttribute('data-skill');

                // Toggle selected state
                this.classList.toggle('selected');

                // Apply skill-based project filtering
                filterProjectsBySkill(skillName, this.classList.contains('selected'));
            });
        });
    }

    // Filter projects based on selected skills
    filterProjectsBySkill = function(skillName, isSelected) {
        console.log('filterProjectsBySkill called:', skillName, isSelected);

        // Update bento active filters
        if (isSelected) {
            bentoActiveFilters.delete('all');
            bentoActiveFilters.add(skillName);
        } else {
            bentoActiveFilters.delete(skillName);
            if (bentoActiveFilters.size === 0) {
                bentoActiveFilters.add('all');
            }
        }

        console.log('Active filters:', Array.from(bentoActiveFilters));

        // Re-populate featured projects with new filter
        if (typeof populateFeaturedProjects === 'function') {
            populateFeaturedProjects();
        } else {
            console.error('populateFeaturedProjects is not a function:', populateFeaturedProjects);
        }

        // Update project count
        if (typeof updateBentoProjectCount === 'function') {
            // Count the filtered projects
            const filteredCount = document.querySelectorAll('.bento-project-card').length;
            updateBentoProjectCount(filteredCount);
        }

        // Get all project cards (both in bento and on projects page)
        const projectCards = document.querySelectorAll('.project-card');

        // Update project filter buttons to show selected skill
        updateProjectFiltersForSkill(skillName, isSelected);

        // Filter projects in main projects section
        if (projectCards.length > 0) {
            filterMainProjects(skillName, isSelected);
        }
    }

    // Update main project filtering
    function filterMainProjects(skillName, isSelected) {
        if (typeof window.filterProjects === 'function') {
            // If skill is selected, add it to active filters
            if (isSelected) {
                if (typeof window.activeFilters !== 'undefined') {
                    window.activeFilters.delete('all');
                    window.activeFilters.add(skillName);
                }
            }
            // Trigger main project filtering
            window.filterProjects();
        }
    }

    // Update project filter buttons to reflect skill selection
    function updateProjectFiltersForSkill(skillName, isSelected) {
        const filterButtons = document.querySelectorAll('.filter-btn, .compact-filter-btn');

        filterButtons.forEach(button => {
            const buttonFilter = button.getAttribute('data-filter');
            if (buttonFilter === skillName) {
                if (isSelected) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
    }

    // Initialize
    initializeSkillsFiltering();
});