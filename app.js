// Configuration
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'flashbots';
const REPO_NAME = 'mev-research';
const FRP_PATH = 'FRPs';

// State
let frps = [];
let frpsByStatus = {
    active: [],
    completed: [],
    stagnant: []
};
let currentFrp = null;
let currentView = 'motivation'; // 'motivation' or 'frp'
let searchTerm = '';

// DOM Elements
const navList = document.getElementById('navList');
const article = document.getElementById('article');
const searchInput = document.getElementById('searchInput');
const loadingStatus = document.getElementById('loadingStatus');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
const sidebar = document.getElementById('sidebar');
const themeToggle = document.getElementById('themeToggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadFRPs();
});

// Theme Management
function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Event Listeners
function initializeEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    sidebarToggle?.addEventListener('click', toggleSidebar);
    mobileSidebarToggle?.addEventListener('click', toggleSidebar);
    themeToggle?.addEventListener('click', toggleTheme);
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !mobileSidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        // Escape to close sidebar on mobile
        if (e.key === 'Escape' && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// Determine FRP status from filename or content
function determineStatus(filename, content) {
    const lowerFilename = filename.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    // Check for status indicators in filename or content
    if (lowerFilename.includes('stagnant') || lowerContent.includes('status: stagnant') || lowerContent.includes('stagnant')) {
        return 'stagnant';
    }
    if (lowerFilename.includes('completed') || lowerContent.includes('status: completed') || lowerContent.includes('completed')) {
        return 'completed';
    }
    // Default to active if no status found
    return 'active';
}

// Load FRPs from GitHub
async function loadFRPs() {
    try {
        loadingStatus.textContent = 'Loading FRPs from GitHub...';
        
        // FRPs are organized in subdirectories by status
        const statusDirs = ['active', 'completed', 'stagnant'];
        
        // Fetch FRPs from each status directory
        const allFrps = [];
        
        for (const status of statusDirs) {
            try {
                const response = await fetch(
                    `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FRP_PATH}/${status}`,
                    {
                        headers: {
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (!response.ok) {
                    console.warn(`Failed to fetch ${status} FRPs: ${response.statusText}`);
                    continue;
                }

                const files = await response.json();
                
                // Filter for markdown files
                const markdownFiles = files.filter(file => 
                    file.name.endsWith('.md') && file.type === 'file'
                );

                // Load content for each FRP
                const statusFrps = await Promise.all(
                    markdownFiles.map(async (file) => {
                        try {
                            const contentResponse = await fetch(file.download_url);
                            
                            if (!contentResponse.ok) {
                                throw new Error(`Failed to fetch content: ${contentResponse.statusText}`);
                            }
                            
                            const content = await contentResponse.text();
                            
                            return {
                                id: `${status}-${file.name.replace('.md', '')}`,
                                name: file.name,
                                path: file.path,
                                url: file.html_url,
                                downloadUrl: file.download_url,
                                content: content,
                                title: extractTitle(content) || file.name.replace('.md', ''),
                                status: status,
                                number: extractNumber(file.name)
                            };
                        } catch (error) {
                            console.error(`Error loading ${file.name}:`, error);
                            return {
                                id: `${status}-${file.name.replace('.md', '')}`,
                                name: file.name,
                                path: file.path,
                                url: file.html_url,
                                content: `# Error loading ${file.name}\n\nFailed to load content: ${error.message}`,
                                title: file.name.replace('.md', ''),
                                status: status,
                                number: extractNumber(file.name)
                            };
                        }
                    })
                );

                allFrps.push(...statusFrps);
            } catch (error) {
                console.error(`Error fetching ${status} directory:`, error);
            }
        }

        if (allFrps.length === 0) {
            throw new Error('No FRP markdown files found in any status directory');
        }

        frps = allFrps;

        // Organize by status
        frpsByStatus = {
            active: frps.filter(f => f.status === 'active').sort((a, b) => a.number - b.number),
            completed: frps.filter(f => f.status === 'completed').sort((a, b) => a.number - b.number),
            stagnant: frps.filter(f => f.status === 'stagnant').sort((a, b) => a.number - b.number)
        };

        renderNavList();
        loadingStatus.textContent = `Loaded ${frps.length} FRP${frps.length !== 1 ? 's' : ''}`;
        
        // Motivation page is already shown by default in HTML
    } catch (error) {
        console.error('Error loading FRPs:', error);
        showError(error.message);
    }
}

// Extract number from filename (e.g., "FRP-001.md" -> 1)
function extractNumber(filename) {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 9999;
}


// Extract title from markdown content
function extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
}

// Render navigation list
function renderNavList() {
    let html = '';
    
    // Motivation link (always first)
    html += `
        <li class="nav-item ${currentView === 'motivation' ? 'active' : ''}" data-view="motivation">
            <a href="#" onclick="showMotivation(); return false;">
                Motivation
            </a>
        </li>
    `;
    
    // Categories with FRPs
    const categories = [
        { key: 'active', label: 'Active' },
        { key: 'completed', label: 'Completed' },
        { key: 'stagnant', label: 'Stagnant' }
    ];
    
    categories.forEach(category => {
        const categoryFrps = frpsByStatus[category.key];
        if (categoryFrps.length > 0) {
            html += `
                <li class="nav-category">
                    <span class="nav-category-label">${category.label}</span>
                </li>
            `;
            
            categoryFrps.forEach(frp => {
                const isActive = currentView === 'frp' && currentFrp && currentFrp.id === frp.id;
                html += `
                    <li class="nav-item nav-sub-item ${isActive ? 'active' : ''}" data-frp-id="${frp.id}">
                        <a href="#" onclick="loadFRPById('${frp.id}'); return false;">
                            ${frp.title}
                        </a>
                    </li>
                `;
            });
        }
    });
    
    if (html === '') {
        html = '<li class="nav-item"><span>No FRPs found</span></li>';
    }
    
    navList.innerHTML = html;
}

// Filter FRPs based on search term
function filterFRPs() {
    if (!searchTerm.trim()) {
        return frps;
    }

    const term = searchTerm.toLowerCase();
    return frps.filter(frp => 
        frp.title.toLowerCase().includes(term) ||
        frp.id.toLowerCase().includes(term) ||
        frp.content.toLowerCase().includes(term)
    );
}

// Show motivation page
function showMotivation() {
    currentView = 'motivation';
    currentFrp = null;
    searchTerm = '';
    searchInput.value = '';
    
    // Show welcome screen
    article.innerHTML = `
        <div class="welcome-screen">
            <h1>FRP for Busy Nerds</h1>
            <p class="intro-text">
                A comprehensive collection of Flashbots Research Proposals (FRPs), written and curated for clarity and accessibility.
            </p>
            
            <div class="motivation-section">
                <h2>Why This Exists</h2>
                <div class="motivation-content">
                    <p>
                        FRPs are important, but they are not easy to follow.
                    </p>
                    <p>
                        Today, most FRPs live in scattered places: specs, forum posts, PDFs, GitHub comments, and side discussions that assume deep prior context. The information is there, but it's fragmented, dense, and time-consuming to piece together. For someone trying to understand what an FRP is really proposing, why it exists, and whether it matters, the barrier is unnecessarily high.
                    </p>
                    <p>
                        This exists to curate, not rewrite.
                    </p>
                    <p>
                        I'm not proposing new ideas or altering existing ones. Instead, I'm collecting what already exists and organizing it into a clear, readable structure. Each piece pulls together the motivation, core mechanism, risks, and tradeoffs of an FRP from its original sources and presents them in one place, without forcing readers to chase links or decode specs on their own.
                    </p>
                    <p>
                        The goal is to make FRPs legible.
                    </p>
                    <p>
                        By reducing the cognitive overhead required to understand a proposal, this series aims to help more researchers, builders, and operators quickly evaluate what's being proposed and why. FRPs influence protocol design, incentives, and market structure. When they're hard to read, fewer people engage. When they're easier to navigate, better questions get asked and better decisions follow.
                    </p>
                    <p>
                        This is a curation effort for busy nerds: high-signal summaries, grounded in primary sources, designed to help you understand the landscape without losing days to fragmentation.
                    </p>
                </div>
            </div>

            <div class="author-section">
                <h2>About the Author</h2>
                <div class="author-content">
                    <p>
                        <strong>wisdom.</strong> 19. rust, protocol research, tooling, and MEV. digging into blockchain data.
                    </p>
                    <p style="margin-top: 1rem;">
                        <a href="https://x.com/oxwizzdom" target="_blank" rel="noopener noreferrer" style="color: var(--link-color); text-decoration: none; margin-right: 1rem;">x: oxwizzdom</a>
                        <a href="https://t.me/oxwizzdom" target="_blank" rel="noopener noreferrer" style="color: var(--link-color); text-decoration: none;">telegram: @oxwizzdom</a>
                    </p>
                </div>
            </div>
            <p class="loading-status" id="loadingStatus">Ready</p>
        </div>
    `;
    
    // Update loading status if it exists
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl && loadingStatus) {
        statusEl.textContent = loadingStatus.textContent;
    }
    
    renderNavList();
}

// Handle search input
function handleSearch(e) {
    searchTerm = e.target.value;
    renderNavList();
    
    // If searching, show filtered results in main content
    if (searchTerm.trim()) {
        const filtered = filterFRPs();
        if (filtered.length > 0) {
            renderSearchResults(filtered);
        } else {
            renderEmptyState();
        }
    } else if (currentFrp) {
        // If clearing search and we have a current FRP, show it again
        loadFRP(currentFrp);
    }
}

// Render search results
function renderSearchResults(filteredFrps) {
    article.innerHTML = `
        <div class="frp-content">
            <h1>Search Results</h1>
            <p>Found ${filteredFrps.length} FRP${filteredFrps.length !== 1 ? 's' : ''} matching "${searchTerm}"</p>
            <ul style="list-style: none; padding: 0; margin-top: 2rem;">
                ${filteredFrps.map(frp => `
                    <li style="margin-bottom: 1.5rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <h3 style="margin-bottom: 0.5rem;">
                            <a href="#" onclick="loadFRPById('${frp.id}'); return false;" style="color: var(--link-color); text-decoration: none;">
                                ${frp.title}
                            </a>
                        </h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">
                            ${getPreview(frp.content, 200)}
                        </p>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

// Get preview text from content
function getPreview(content, maxLength) {
    // Remove markdown headers and code blocks
    const text = content
        .replace(/^#+\s+/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .trim();
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

// Render empty state
function renderEmptyState() {
    article.innerHTML = `
        <div class="empty-state">
            <h2>No FRPs Found</h2>
            <p>No FRPs match your search term "${searchTerm}"</p>
            <button onclick="searchInput.value = ''; handleSearch({target: searchInput});" 
                    style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Clear Search
            </button>
        </div>
    `;
}

// Load FRP by ID
function loadFRPById(id) {
    const frp = frps.find(f => f.id === id);
    if (frp) {
        loadFRP(frp);
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }
}

// Load and display FRP
function loadFRP(frp) {
    currentFrp = frp;
    currentView = 'frp';
    searchTerm = ''; // Clear search when loading a specific FRP
    searchInput.value = '';
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.frpId === frp.id) {
            item.classList.add('active');
        }
    });

    // Render FRP content
    const htmlContent = convertMarkdownToHTML(frp.content);
    
    article.innerHTML = `
        <div class="frp-content">
            <div class="frp-header">
                <h1 class="frp-title">${frp.title}</h1>
                <div class="frp-meta">
                    <div class="frp-meta-item">
                        <strong>Status:</strong> <span class="status-badge status-${frp.status}">${frp.status.charAt(0).toUpperCase() + frp.status.slice(1)}</span>
                    </div>
                    <div class="frp-meta-item">
                        <a href="${frp.url}" target="_blank" rel="noopener noreferrer" style="color: var(--link-color);">
                            View on GitHub →
                        </a>
                    </div>
                </div>
            </div>
            <div class="frp-body">
                ${htmlContent}
            </div>
        </div>
    `;
    
    renderNavList();

    // Scroll to top
    article.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Convert Markdown to HTML (simplified version)
function convertMarkdownToHTML(markdown) {
    let html = markdown;
    
    // Headers
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^\+ (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return '<ul>' + match + '</ul>';
    });
    
    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    
    // Paragraphs (lines that aren't already HTML tags)
    html = html.split('\n').map(line => {
        line = line.trim();
        if (!line || line.startsWith('<')) {
            return line;
        }
        return `<p>${line}</p>`;
    }).join('\n');
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    
    return html;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    article.innerHTML = `
        <div class="error-message">
            <h2>Error Loading FRPs</h2>
            <p>${message}</p>
            <p style="margin-top: 1rem;">
                <button onclick="location.reload()" 
                        style="padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </p>
        </div>
    `;
    loadingStatus.textContent = 'Failed to load FRPs';
}

// Make functions available globally for onclick handlers
window.loadFRPById = loadFRPById;
window.showMotivation = showMotivation;

