// Blog functionality - sidebar population and filtering

document.addEventListener('DOMContentLoaded', function() {
    // Populate sidebar from JSON
    populateSidebar();

    // Add category filtering
    setupCategoryFiltering();
});

async function populateSidebar() {
    try {
        const response = await fetch('/data/blog-posts.json');
        const data = await response.json();
        const sidebarList = document.getElementById('sidebar-posts-list');

        if (sidebarList) {
            sidebarList.innerHTML = data.posts.map(post => `
                <li>
                    <a href="${post.url}">
                        <div class="sidebar-post-date">${post.dateFormatted}</div>
                        <div class="sidebar-post-title">${post.title}</div>
                    </a>
                </li>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

function setupCategoryFiltering() {
    const categoryLinks = document.querySelectorAll('.sidebar-categories a');
    const blogCards = document.querySelectorAll('.blog-card');

    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            categoryLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            const category = this.getAttribute('data-category');

            // Filter blog cards
            blogCards.forEach(card => {
                const cardCategory = card.querySelector('.blog-card-category').textContent;

                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                    // Trigger reflow for animation
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    // Set "All Posts" as active by default
    const allPostsLink = document.querySelector('.sidebar-categories a[data-category="all"]');
    if (allPostsLink) {
        allPostsLink.classList.add('active');
    }
}
