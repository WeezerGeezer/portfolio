// Navbar Template System
// This script injects the navigation bar into all pages

const navbarHTML = `
    <!-- Top Bar Navigation for Desktop -->
    <nav id="top-nav">
        <div class="nav-container">
            <div class="logo"><a href="/index.html">Mitchell Carter</a></div>
            <ul class="nav-links">
                <li><a href="/projects.html" class="nav-link">Projects</a></li>
                <li><a href="/blog.html" class="nav-link">Blog</a></li>
                <li><a href="https://photos.mitchellcarter.dev" target="_blank" class="nav-link">Photos</a></li>
            </ul>
        </div>
    </nav>
    <nav id="hamburger-nav">
        <div class="logo"><a href="/index.html">Mitchell Carter</a></div>
        <div class="hamburger-menu">
            <div class="hamburger-icon" onClick="toggleMenu()">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="menu-links">
                <li><a href="/projects.html" onClick="toggleMenu()">Projects</a></li>
                <li><a href="/blog.html" onClick="toggleMenu()">Blog</a></li>
                <li><a href="https://photos.mitchellcarter.dev" target="_blank" onClick="toggleMenu()">Photos</a></li>
            </div>
        </div>
    </nav>
`;

// Function to inject navbar
function injectNavbar() {
    // Find the body element
    const body = document.body;

    // Create a temporary container
    const temp = document.createElement('div');
    temp.innerHTML = navbarHTML;

    // Insert navbar at the beginning of body
    while (temp.firstChild) {
        body.insertBefore(temp.firstChild, body.firstChild);
    }
}

// Inject navbar when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNavbar);
} else {
    injectNavbar();
}
