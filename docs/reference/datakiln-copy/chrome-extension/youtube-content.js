/**
 * YouTube Content Script for DataKiln Extension
 * 
 * Provides YouTube video page integration:
 * - Detects YouTube video pages
 * - Extracts video ID
 * - Adds transcript capture button
 * - Integrates with backend transcript API
 */

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        API_BASE: 'http://localhost:8000/api/v1',
        BUTTON_ID: 'datakiln-transcript-btn',
        CONTAINER_ID: 'datakiln-youtube-container'
    };

    // State
    let currentVideoId = null;
    let isProcessing = false;

    /**
     * Extract video ID from YouTube URL
     */
    function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    /**
     * Check if we're on a YouTube video page
     */
    function isVideoPage() {
        return window.location.pathname === '/watch' && getVideoId();
    }

    /**
     * Create the DataKiln action button
     */
    function createActionButton() {
        if (document.getElementById(CONFIG.BUTTON_ID)) {
            return; // Already exists
        }

        const button = document.createElement('button');
        button.id = CONFIG.BUTTON_ID;
        button.className = 'datakiln-btn';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>Capture Transcript</span>
        `;
        button.title = 'Capture transcript with DataKiln';

        button.addEventListener('click', handleTranscriptCapture);

        return button;
    }

    /**
     * Create container for DataKiln UI elements
     */
    function createContainer() {
        if (document.getElementById(CONFIG.CONTAINER_ID)) {
            return document.getElementById(CONFIG.CONTAINER_ID);
        }

        const container = document.createElement('div');
        container.id = CONFIG.CONTAINER_ID;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #${CONFIG.CONTAINER_ID} {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: 'Roboto', Arial, sans-serif;
            }
            
            .datakiln-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
            }
            
            .datakiln-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            
            .datakiln-btn:active {
                transform: translateY(0);
            }
            
            .datakiln-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .datakiln-btn.processing {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .datakiln-btn.success {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            }
            
            .datakiln-btn.error {
                background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
            }
            
            .datakiln-status {
                margin-top: 8px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 6px;
                font-size: 12px;
                max-width: 250px;
            }
        `;
        document.head.appendChild(style);

        return container;
    }

    /**
     * Show status message
     */
    function showStatus(message, type = 'info') {
        const container = document.getElementById(CONFIG.CONTAINER_ID);
        if (!container) return;

        // Remove existing status
        const existingStatus = container.querySelector('.datakiln-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const status = document.createElement('div');
        status.className = 'datakiln-status';
        status.textContent = message;
        container.appendChild(status);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (status.parentNode) {
                status.remove();
            }
        }, 5000);
    }

    /**
     * Handle transcript capture button click
     */
    async function handleTranscriptCapture() {
        if (isProcessing) return;

        const videoId = getVideoId();
        if (!videoId) {
            showStatus('Could not find video ID', 'error');
            return;
        }

        const button = document.getElementById(CONFIG.BUTTON_ID);

        try {
            isProcessing = true;
            button.disabled = true;
            button.classList.add('processing');
            button.querySelector('span').textContent = 'Capturing...';
            showStatus('Extracting transcript...');

            // Get video metadata
            const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent ||
                document.querySelector('h1.title')?.textContent ||
                'YouTube Video';

            // Call backend to extract transcript
            const response = await fetch(`${CONFIG.API_BASE}/extension/trigger-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workflow_id: 'youtube-analysis',
                    input_data: {
                        type: 'url',
                        content: window.location.href,
                        metadata: {
                            url: window.location.href,
                            title: videoTitle,
                            video_id: videoId,
                            timestamp: new Date().toISOString()
                        }
                    },
                    output_config: {
                        destination: 'obsidian',
                        notify_completion: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            button.classList.remove('processing');
            button.classList.add('success');
            button.querySelector('span').textContent = 'Captured!';
            showStatus(`Transcript captured! Execution: ${result.execution_id.slice(0, 8)}...`, 'success');

            // Send message to background script for notification
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    type: 'TRANSCRIPT_CAPTURED',
                    videoId: videoId,
                    executionId: result.execution_id
                });
            }

            // Reset button after 3 seconds
            setTimeout(() => {
                button.classList.remove('success');
                button.querySelector('span').textContent = 'Capture Transcript';
            }, 3000);

        } catch (error) {
            console.error('DataKiln transcript capture error:', error);

            button.classList.remove('processing');
            button.classList.add('error');
            button.querySelector('span').textContent = 'Error';
            showStatus(`Failed: ${error.message}`, 'error');

            setTimeout(() => {
                button.classList.remove('error');
                button.querySelector('span').textContent = 'Capture Transcript';
            }, 3000);
        } finally {
            isProcessing = false;
            button.disabled = false;
        }
    }

    /**
     * Initialize on video page
     */
    function initialize() {
        if (!isVideoPage()) {
            // Remove existing UI if not on video page
            const container = document.getElementById(CONFIG.CONTAINER_ID);
            if (container) {
                container.remove();
            }
            return;
        }

        const newVideoId = getVideoId();
        if (newVideoId === currentVideoId) {
            return; // Same video, no need to re-init
        }
        currentVideoId = newVideoId;

        // Create UI
        const container = createContainer();
        const button = createActionButton();

        if (button) {
            container.appendChild(button);
        }

        if (!container.parentNode) {
            document.body.appendChild(container);
        }

        console.log('DataKiln YouTube integration initialized for video:', currentVideoId);
    }

    /**
     * Watch for YouTube navigation (SPA)
     */
    function setupNavigationObserver() {
        // YouTube is a SPA, so we need to watch for navigation
        let lastUrl = location.href;

        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(initialize, 500); // Delay to let page render
            }
        }).observe(document.body, { subtree: true, childList: true });

        // Also listen for popstate
        window.addEventListener('popstate', () => {
            setTimeout(initialize, 500);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initialize();
            setupNavigationObserver();
        });
    } else {
        initialize();
        setupNavigationObserver();
    }

})();
