// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe hero section for animations
document.addEventListener('DOMContentLoaded', () => {
    const heroSection = document.querySelector('.hero');
    
    if (heroSection) {
        heroSection.style.opacity = '0';
        heroSection.style.transform = 'translateY(30px)';
        heroSection.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            heroSection.style.opacity = '1';
            heroSection.style.transform = 'translateY(0)';
        }, 100);
    }
});

// Navbar background on scroll
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.style.background = 'rgba(251, 251, 253, 0.95)';
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(251, 251, 253, 0.8)';
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// Button click handlers
document.querySelectorAll('.btn-primary, .btn-secondary, .nav-button').forEach(button => {
    button.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple effect styles dynamically
const style = document.createElement('style');
style.textContent = `
    .btn-primary, .btn-secondary, .nav-button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Parallax effect for hero visual
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    
    if (heroVisual && scrolled < window.innerHeight) {
        const parallax = scrolled * 0.3;
        heroVisual.style.transform = `translateY(${parallax}px)`;
    }
});

// Smooth reveal animation for sections
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, {
    threshold: 0.2
});

document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});

// Search Modal Functionality
class SearchModal {
    constructor() {
        this.modal = document.getElementById('searchModal');
        this.closeBtn = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.searchBtn = document.getElementById('searchBtn');
        this.input = document.getElementById('searchName');
        this.resultContainer = document.getElementById('resultContainer');
        this.resultCard = document.getElementById('resultCard');
        this.resultLoading = document.getElementById('resultLoading');
        this.profileDetailContainer = document.getElementById('profileDetailContainer');
        this.profileDetailThumbnail = document.getElementById('profileDetailThumbnail');
        this.profileDetailTitle = document.getElementById('profileDetailTitle');
        this.profileDetailLink = document.getElementById('profileDetailLink');
        this.closeProfileDetailBtn = document.getElementById('closeProfileDetail');
        this.ageVerification = document.getElementById('ageVerification');
        this.openIMessageBtn = document.getElementById('openIMessageBtn');
        this.manualUrlContainer = document.getElementById('manualUrlContainer');
        this.linkedinUrlInput = document.getElementById('linkedinUrl');
        this.cancelUrlBtn = document.getElementById('cancelUrlBtn');
        this.searchUrlBtn = document.getElementById('searchUrlBtn');
        this.showManualUrlBtnPersistent = document.getElementById('showManualUrlBtnPersistent');
        this.getStartedButtons = document.querySelectorAll('.btn-primary, .nav-button');
        this.apiKey = '5385b932-c5cb-49e0-bf08-b41fa5906203';
        this.selectedProfile = null;
        
        this.init();
    }

    init() {
        // Open modal when Get Started is clicked
        this.getStartedButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });

        // Close modal handlers
        this.closeBtn?.addEventListener('click', () => this.close());
        this.cancelBtn?.addEventListener('click', () => this.close());
        
        // Close on overlay click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                this.close();
            }
        });

        // Real-time search as user types (debounced)
        this.searchTimeout = null;
        this.input?.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            
            // Clear previous timeout
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // If input is empty, hide results
            if (!value) {
                if (this.resultContainer) {
                    this.resultContainer.style.display = 'none';
                }
                this.validateInput();
                return;
            }

            // Show loading state immediately
            if (this.resultContainer) {
                this.resultContainer.style.display = 'block';
            }
            if (this.resultLoading) {
                this.resultLoading.style.display = 'flex';
            }
            if (this.resultCard) {
                this.resultCard.innerHTML = '';
                this.resultCard.appendChild(this.resultLoading);
            }
            
            // Hide manual URL input if visible
            this.hideManualUrlInput();

            // Debounce: wait 800ms after user stops typing
            this.searchTimeout = setTimeout(() => {
                if (value.length >= 2) { // Only search if at least 2 characters
                    this.handleSearch();
                }
            }, 800);
        });

        // Fix cursor issue: allow clicking anywhere in modal to focus input
        this.modal?.addEventListener('click', (e) => {
            // If clicking on modal container (not on content), focus input
            if (e.target === this.modal || e.target.classList.contains('modal-overlay')) {
                // Don't prevent default, just allow normal behavior
                return;
            }
        });

        // Ensure input can be focused after search
        this.input?.addEventListener('focus', () => {
            // Ensure cursor is visible
            this.input.style.cursor = 'text';
        });

        // Enter key to search immediately
        this.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                }
                const value = this.input?.value.trim();
                if (value && value.length >= 2) {
                    this.handleSearch();
                }
            }
        });

        // Search button handler
        this.searchBtn?.addEventListener('click', () => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.handleSearch();
        });

        // Profile detail handlers
        this.closeProfileDetailBtn = document.getElementById('closeProfileDetail');
        this.closeProfileDetailBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeProfileDetail();
        });

        // Age verification checkbox
        this.ageVerification?.addEventListener('change', (e) => {
            if (this.openIMessageBtn) {
                this.openIMessageBtn.disabled = !e.target.checked;
            }
        });

        // Open iMessage button
        this.openIMessageBtn?.addEventListener('click', () => {
            this.openIMessage();
        });

        // Manual URL handlers
        this.cancelUrlBtn?.addEventListener('click', () => {
            this.hideManualUrlInput();
        });

        this.searchUrlBtn?.addEventListener('click', () => {
            this.handleManualUrlSearch();
        });

        // Allow Enter key in URL input
        this.linkedinUrlInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.searchUrlBtn.disabled) {
                this.handleManualUrlSearch();
            }
        });

        // Validate URL input
        this.linkedinUrlInput?.addEventListener('input', () => {
            this.validateUrlInput();
        });

        // Persistent "Profile not found" button
        this.showManualUrlBtnPersistent?.addEventListener('click', () => {
            this.showManualUrlInput();
        });
    }

    showManualUrlInput() {
        if (this.manualUrlContainer) {
            this.manualUrlContainer.style.display = 'block';
            setTimeout(() => {
                this.manualUrlContainer.classList.add('active');
                if (this.linkedinUrlInput) {
                    this.linkedinUrlInput.focus();
                }
            }, 10);
        }
    }

    hideManualUrlInput() {
        if (this.manualUrlContainer) {
            this.manualUrlContainer.classList.remove('active');
            setTimeout(() => {
                this.manualUrlContainer.style.display = 'none';
                if (this.linkedinUrlInput) {
                    this.linkedinUrlInput.value = '';
                }
            }, 300);
        }
    }

    validateUrlInput() {
        const url = this.linkedinUrlInput?.value.trim() || '';
        const isValid = url.length > 0 && (url.includes('linkedin.com') || url.includes('linkedin.com/in/'));
        
        if (this.searchUrlBtn) {
            this.searchUrlBtn.disabled = !isValid;
        }
    }

    async handleManualUrlSearch() {
        const url = this.linkedinUrlInput?.value.trim();
        if (!url || !url.includes('linkedin.com')) {
            return;
        }

        // Hide manual URL input
        this.hideManualUrlInput();

        // Show loading state
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        if (this.resultLoading) {
            this.resultLoading.style.display = 'flex';
        }
        if (this.resultCard) {
            this.resultCard.innerHTML = '';
            this.resultCard.appendChild(this.resultLoading);
        }
        
        // Ensure manual URL input is hidden
        this.hideManualUrlInput();

        // Disable search button
        if (this.searchUrlBtn) {
            this.searchUrlBtn.disabled = true;
            this.searchUrlBtn.textContent = 'Searching...';
        }

        try {
            // Search for the LinkedIn URL directly
            const query = url;

            console.log('Searching for LinkedIn URL:', query);

            const options = {
                method: 'GET',
                url: 'https://api.hasdata.com/scrape/google/serp',
                params: {
                    q: query,
                    location: 'United States',
                    lr: [],
                    deviceType: 'desktop'
                },
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const response = await axios.request(options);
            const data = response.data;

            console.log('Full API Response:', data);

            // Check if this is a URL search response with organicResults
            if (data?.organicResults && Array.isArray(data.organicResults) && data.organicResults.length > 0) {
                // Display organic results in simple list format
                this.displayOrganicResults(data.organicResults);
            } else {
                // Process and display results (for regular name search)
                this.displayResult(data);
            }

        } catch (error) {
            console.error('Error searching LinkedIn URL:', error);
            let errorMessage = 'Failed to search. Please try again.';
            
            if (error.response) {
                errorMessage = `Error: ${error.response.status} - ${error.response.statusText}`;
            } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            this.showError(errorMessage);
        } finally {
            if (this.searchUrlBtn) {
                this.searchUrlBtn.disabled = false;
                this.searchUrlBtn.textContent = 'Search';
            }
        }
    }

    showProfileDetail(profile) {
        this.selectedProfile = profile;
        
        if (!this.profileDetailContainer) return;

        // Set profile data
        if (this.profileDetailTitle) {
            this.profileDetailTitle.textContent = profile.title || 'Profile';
        }

        if (this.profileDetailLink && profile.link) {
            this.profileDetailLink.href = profile.link;
        }

        // Set thumbnail
        if (this.profileDetailThumbnail) {
            if (profile.thumbnail) {
                this.profileDetailThumbnail.innerHTML = `
                    <img src="${this.escapeHtml(profile.thumbnail)}" 
                         alt="${this.escapeHtml(profile.title)}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="thumbnail-placeholder" style="display: none;">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                `;
            } else {
                this.profileDetailThumbnail.innerHTML = `
                    <div class="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                `;
            }
        }

        // Reset checkbox
        if (this.ageVerification) {
            this.ageVerification.checked = false;
        }
        if (this.openIMessageBtn) {
            this.openIMessageBtn.disabled = true;
        }

        // Show profile detail
        this.profileDetailContainer.style.display = 'block';
        setTimeout(() => {
            this.profileDetailContainer.classList.add('active');
        }, 10);
    }

    closeProfileDetail() {
        if (this.profileDetailContainer) {
            this.profileDetailContainer.classList.remove('active');
            setTimeout(() => {
                this.profileDetailContainer.style.display = 'none';
            }, 300);
        }
        this.selectedProfile = null;
    }

    openIMessage() {
        if (!this.ageVerification?.checked) {
            return;
        }

        if (!this.selectedProfile) {
            console.error('No profile selected');
            return;
        }

        const phoneNumber = '+16463458837';
        
        // Extract user name from profile
        // Try to get name from title (e.g., "John Doe - Software Engineer" -> "John Doe")
        let userName = this.selectedProfile.title || 'there';
        
        // Clean up the name - remove common suffixes like " - ", " | ", " at ", etc.
        if (userName.includes(' - ')) {
            userName = userName.split(' - ')[0].trim();
        } else if (userName.includes(' | ')) {
            userName = userName.split(' | ')[0].trim();
        } else if (userName.includes(' at ')) {
            userName = userName.split(' at ')[0].trim();
        }
        
        // If we still have a long title, try to extract just the first part (name)
        if (userName.length > 50) {
            userName = userName.split(',')[0].split('.')[0].trim();
        }
        
        // Fallback if name extraction fails
        if (!userName || userName.length === 0) {
            userName = 'there';
        }
        
        const message = `Hey, its ${userName} here, looking for great social connection`;
        
        // Create iMessage/SMS URL (works on iOS/macOS)
        // Format: sms:+1234567890&body=message
        const imessageUrl = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;
        
        // Try to open iMessage
        try {
            window.location.href = imessageUrl;
        } catch (e) {
            console.error('Error opening iMessage:', e);
            // Fallback: Show instructions
            alert(`Please send this message to ${phoneNumber}:\n\n${message}`);
        }
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Hide result container
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
            
            // Focus input after animation (with error handling for extensions)
            setTimeout(() => {
                try {
                    if (this.input) {
                        this.input.focus();
                        this.input.style.cursor = 'text';
                        this.input.disabled = false;
                        this.input.style.pointerEvents = 'auto';
                    }
                } catch (e) {
                    // Ignore focus errors from browser extensions
                    console.log('Focus handled');
                }
            }, 400);
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset input and results
            if (this.input) {
                this.input.value = '';
                this.validateInput();
            }
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
        }
    }

    validateInput() {
        const value = this.input?.value.trim() || '';
        const isValid = value.length >= 2; // At least 2 characters
        
        if (this.searchBtn) {
            this.searchBtn.disabled = !isValid;
        }
    }

    async handleSearch() {
        const name = this.input?.value.trim();
        if (!name || name.length < 2) {
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
            }
            return;
        }

        // Show loading state
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }
        if (this.resultLoading) {
            this.resultLoading.style.display = 'flex';
        }
        if (this.resultCard) {
            this.resultCard.innerHTML = '';
            this.resultCard.appendChild(this.resultLoading);
        }

        // Disable search button
        if (this.searchBtn) {
            this.searchBtn.disabled = true;
            this.searchBtn.textContent = 'Searching...';
        }

        try {
            // Build query: linkedin {query}
            const query = `linkedin ${name}`;

            console.log('Searching for:', query);

            const options = {
                method: 'GET',
                url: 'https://api.hasdata.com/scrape/google/serp',
                params: {
                    q: query,
                    location: 'United States',
                    lr: [],
                    deviceType: 'desktop'
                },
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            };
            
            console.log('API Request Options:', {
                url: options.url,
                params: options.params,
                headers: { ...options.headers, 'x-api-key': '***hidden***' }
            });

            const response = await axios.request(options);
            console.log('API Response:', response);
            console.log('Response Data:', response.data);
            console.log('Response Status:', response.status);
            
            // Check if we got data
            if (!response.data) {
                throw new Error('No data received from API');
            }
            
            // Show first result only
            this.displayResult(response.data);

        } catch (error) {
            console.error('Search error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    params: error.config?.params
                }
            });
            
            let errorMessage = 'Failed to search. Please try again.';
            
            if (error.response) {
                // Server responded with error
                errorMessage = error.response.data?.message 
                    || error.response.data?.error 
                    || `Server error: ${error.response.status} ${error.response.statusText}`;
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                // Error setting up request
                errorMessage = error.message || 'Failed to search. Please try again.';
            }
            
            this.showError(errorMessage);
        } finally {
            // Re-enable search button
            if (this.searchBtn) {
                this.searchBtn.disabled = false;
                this.searchBtn.textContent = 'Search';
            }
        }
    }

    displayResult(data) {
        if (!this.resultCard) return;

        // Hide loading
        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        console.log('Processing data:', data);
        console.log('Full API Response:', JSON.stringify(data, null, 2));

        // Extract inline images from the response
        let inlineImages = [];
        
        // Function to recursively search for inlineImages
        const extractInlineImages = (obj, path = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    extractInlineImages(item, `${path}[${index}]`);
                });
            } else {
                // Check if this object has inlineImages
                if (obj.inline_images && Array.isArray(obj.inline_images)) {
                    obj.inline_images.forEach((img, index) => {
                        if (img && (img.thumbnail || img.link)) {
                            inlineImages.push({
                                thumbnail: img.thumbnail || img.thumbnail_link || img.image || '',
                                link: img.link || img.url || '',
                                title: img.title || img.alt || obj.title || 'No title',
                                source: path
                            });
                        }
                    });
                }
                
                // Check if this object has inlineImages property (different structure)
                if (obj.inlineImages && Array.isArray(obj.inlineImages)) {
                    obj.inlineImages.forEach((img, index) => {
                        if (img && (img.thumbnail || img.link)) {
                            inlineImages.push({
                                thumbnail: img.thumbnail || img.thumbnail_link || img.image || '',
                                link: img.link || img.url || '',
                                title: img.title || img.alt || obj.title || 'No title',
                                source: path
                            });
                        }
                    });
                }
                
                // Recursively search nested objects
                Object.keys(obj).forEach(key => {
                    if (key !== 'inline_images' && key !== 'inlineImages') {
                        extractInlineImages(obj[key], path ? `${path}.${key}` : key);
                    }
                });
            }
        };

        extractInlineImages(data);
        console.log('Extracted inline images:', inlineImages);

        // Get unique inline images (deduplicate by thumbnail URL or title)
        const uniqueImages = [];
        const seen = new Set();
        
        inlineImages.forEach(img => {
            const identifier = img.thumbnail || img.title || img.link;
            if (identifier && !seen.has(identifier)) {
                seen.add(identifier);
                uniqueImages.push(img);
            }
        });

        console.log('Unique inline images:', uniqueImages);

        if (uniqueImages.length === 0) {
            console.log('No inline images found. Showing raw data structure.');
            
            // Try to show regular results as fallback
            let results = [];
            if (data?.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
                results = data.organic_results.slice(0, 3);
            } else if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
                results = data.results.slice(0, 3);
            }

            if (results.length > 0) {
                const previewsHTML = results.map((result, index) => {
                    const position = index + 1;
                    return `
                        <div class="preview-card-item" data-position="${position}">
                            <div class="preview-number">${position}</div>
                            <div class="preview-content">
                                <h3 class="preview-title">${this.escapeHtml(result.title || result.name || 'No title')}</h3>
                                <a href="${this.escapeHtml(result.link || result.url || '#')}" target="_blank" class="preview-link">
                                    ${this.escapeHtml(result.link || result.url || 'No link')}
                                </a>
                            </div>
                        </div>
                    `;
                }).join('');

                this.resultCard.innerHTML = `<div class="previews-container">${previewsHTML}</div>`;
            } else {
                // No results found - show manual URL input option
                const noResultsHTML = `
                    <div class="no-results-container">
                        <div class="no-results-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <p class="no-results-text">No profiles found for your search.</p>
                        <button class="btn-manual-url" id="showManualUrlBtn">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="manual-url-icon">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Add LinkedIn URL Manually
                        </button>
                    </div>
                `;
                this.resultCard.innerHTML = noResultsHTML;

                // Add click handler for manual URL button
                const showManualUrlBtn = document.getElementById('showManualUrlBtn');
                if (showManualUrlBtn) {
                    showManualUrlBtn.addEventListener('click', () => {
                        this.showManualUrlInput();
                    });
                }
            }
            return;
        }

        // Create dropdown preview with thumbnails
        this.createDropdownPreview(uniqueImages);
    }

    displayOrganicResults(organicResults) {
        if (!organicResults || !Array.isArray(organicResults) || organicResults.length === 0) {
            this.showError('No results found.');
            return;
        }

        // Hide loading state
        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        // Create simple list format
        const resultsHTML = organicResults.map((result, index) => {
            const position = result.position || (index + 1);
            const title = this.escapeHtml(result.title || 'No title');
            const link = this.escapeHtml(result.link || '#');
            // Store profile data for click handler - properly escape for HTML attribute
            const profileObj = {
                title: result.title || 'No title',
                link: result.link || '#',
                thumbnail: result.thumbnail || null
            };
            const profileData = JSON.stringify(profileObj).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            return `
                <div class="organic-result-item" data-position="${position}" data-profile="${profileData}">
                    <div class="organic-result-position">${position}</div>
                    <div class="organic-result-content">
                        <div class="organic-result-title">${title}</div>
                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="organic-result-link" onclick="event.stopPropagation();">${link}</a>
                    </div>
                </div>
            `;
        }).join('');

        const resultHTML = `
            <div class="organic-results-container">
                <div class="organic-results-list">
                    ${resultsHTML}
                </div>
            </div>
        `;

        if (this.resultCard) {
            this.resultCard.innerHTML = resultHTML;
        }

        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
        }

        // Add click handlers to organic result items
        const organicResultItems = this.resultCard.querySelectorAll('.organic-result-item');
        organicResultItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking directly on links - let them open in new tab
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                // Re-enable cursor on input after click
                if (this.input) {
                    this.input.style.cursor = 'text';
                    this.input.disabled = false;
                }
                
                const profileData = item.getAttribute('data-profile');
                if (profileData) {
                    try {
                        // Decode HTML entities before parsing JSON
                        const decodedData = profileData.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                        const profile = JSON.parse(decodedData);
                        console.log('Opening profile detail for organic result:', profile);
                        this.showProfileDetail(profile);
                    } catch (e) {
                        console.error('Error parsing profile data:', e, 'Raw data:', profileData);
                    }
                } else {
                    console.error('No profile data found on organic result item');
                }
            });
        });
    }

    createDropdownPreview(images) {
        // Limit to first 12 unique images for better display
        const displayImages = images.slice(0, 12);
        
        const previewsHTML = displayImages.map((img, index) => {
            // Add stagger animation delay
            const animationDelay = index * 0.05;
            // Escape JSON for HTML attribute (escape quotes and special chars)
            const profileData = JSON.stringify(img).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            return `
                <div class="dropdown-preview-item" data-index="${index}" 
                     style="animation-delay: ${animationDelay}s; opacity: 0; animation: fadeInUp 0.4s ease-out ${animationDelay}s forwards;"
                     data-profile="${profileData}">
                    <div class="preview-thumbnail">
                        ${img.thumbnail ? `
                            <img src="${this.escapeHtml(img.thumbnail)}" 
                                 alt="${this.escapeHtml(img.title)}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                 loading="lazy">
                            <div class="thumbnail-placeholder" style="display: none;">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        ` : `
                            <div class="thumbnail-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        `}
                    </div>
                    <div class="preview-info">
                        <h4 class="preview-item-title">${this.escapeHtml(img.title)}</h4>
                    </div>
                </div>
            `;
        }).join('');

        const resultHTML = `
            <div class="dropdown-preview-container">
                <div class="dropdown-preview-list">
                    ${previewsHTML}
                </div>
            </div>
        `;

        this.resultCard.innerHTML = resultHTML;

        // Add click handlers to preview items
        const previewItems = this.resultCard.querySelectorAll('.dropdown-preview-item');
        previewItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Re-enable cursor on input after click
                if (this.input) {
                    this.input.style.cursor = 'text';
                    this.input.disabled = false;
                }
                
                const profileData = item.getAttribute('data-profile');
                if (profileData) {
                    try {
                        const profile = JSON.parse(profileData);
                        this.showProfileDetail(profile);
                    } catch (e) {
                        console.error('Error parsing profile data:', e);
                    }
                }
            });
        });

        // Ensure input remains focusable after results are displayed
        if (this.input) {
            this.input.style.pointerEvents = 'auto';
            this.input.style.cursor = 'text';
        }
    }

    showError(message) {
        if (!this.resultCard) return;

        if (this.resultLoading) {
            this.resultLoading.style.display = 'none';
        }

        this.resultCard.innerHTML = `
            <div class="result-item">
                <p class="result-snippet" style="color: var(--text-tertiary); text-align: center; padding: var(--spacing-lg);">
                    ${this.escapeHtml(message)}
                </p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize modal when DOM is ready
let searchModalInstance = null;
document.addEventListener('DOMContentLoaded', () => {
    searchModalInstance = new SearchModal();
    window.searchModalInstance = searchModalInstance; // Make it accessible globally for onclick handlers
});

