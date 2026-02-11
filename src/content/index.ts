import { Readability } from '@mozilla/readability';

console.log('ReMixIt Content Script Loaded');

// Selector helpers
const getText = (selector: string, root: Document | Element = document) => {
    const el = root.querySelector(selector);
    return el ? (el.textContent || '').trim() : '';
};

const getMeta = (prop: string) => {
    const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
    return el ? el.getAttribute('content') : undefined;
};

// Platform specific parsers
const extractors = {
    // 1. YouTube
    youtube: () => {
        if (!window.location.hostname.includes('youtube.com') && !window.location.hostname.includes('youtu.be')) return null;

        // Expand description if possible (it's often hidden behind "more")
        const moreButton = document.querySelector('#expand');
        if (moreButton) (moreButton as HTMLElement).click();

        return {
            title: getText('h1.ytd-watch-metadata yt-formatted-string') || getText('.ytd-watch-metadata h1') || getText('#title h1') || getText('h1') || getMeta('og:title') || document.title,
            content: getText('#description-inline-expander') || getText('#description-inner') || getText('#description') || getMeta('og:description') || '',
            textContent: getText('#description-inline-expander') || getText('#description-inner') || getText('#description') || '',
            excerpt: getMeta('og:description') || '',
            siteName: 'YouTube',
            url: window.location.href,
            hasVideo: true,
            video: {
                url: window.location.href,
                thumbnail: getMeta('og:image'),
                type: 'youtube'
            }
        };
    },

    // 2. X / Twitter
    twitter: () => {
        if (!window.location.hostname.includes('twitter.com') && !window.location.hostname.includes('x.com')) return null;

        // Try to find the first tweet (usually the main one in single view)
        const tweet = document.querySelector('article[data-testid="tweet"]');
        if (!tweet) return null;

        const text = getText('[data-testid="tweetText"]', tweet);
        const user = getText('[data-testid="User-Name"]', tweet);
        const time = tweet.querySelector('time')?.getAttribute('datetime');
        const hasVideo = !!tweet.querySelector('video');

        // Extract video thumbnail if video exists
        let videoThumbnail: string | undefined = undefined;
        if (hasVideo) {
            // Try to get video poster/thumbnail
            const videoElement = tweet.querySelector('video') as HTMLVideoElement;
            if (videoElement?.poster) {
                videoThumbnail = videoElement.poster;
            }
            // Fallback: try to get thumbnail from meta tags or video container
            if (!videoThumbnail) {
                const videoImg = tweet.querySelector('img[alt*="video"]') || tweet.querySelector('div[data-testid="videoPlayer"] img');
                if (videoImg) {
                    videoThumbnail = (videoImg as HTMLImageElement).src;
                }
            }
        }

        // Extract images (exclude video thumbnails)
        const images: string[] = [];
        const imageElements = tweet.querySelectorAll('img[src*="twimg.com/media"]');
        imageElements.forEach(img => {
            const src = (img as HTMLImageElement).src;
            if (src && !src.includes('profile_images') && !src.includes('emoji') && src !== videoThumbnail) {
                images.push(src);
            }
        });

        return {
            title: `${user} on X (${time || 'Unknown Date'}): "${text.substring(0, 50)}..."`,
            content: text,
            textContent: text,
            excerpt: text,
            siteName: 'X (Twitter)',
            url: window.location.href,
            hasVideo: hasVideo,
            images: images.length > 0 ? images : undefined,
            video: hasVideo ? {
                url: window.location.href, // It's hard to get the direct video MP4 from X without api, sending post URL is standard
                thumbnail: videoThumbnail || getMeta('og:image'),
                type: 'twitter'
            } : undefined
        };
    },

    // 3. LinkedIn
    linkedin: () => {
        if (!window.location.hostname.includes('linkedin.com')) return null;

        // Find all post containers
        const posts = Array.from(document.querySelectorAll('.feed-shared-update-v2, .feed-update, [data-urn^="urn:li:activity:"]'));
        if (posts.length === 0) return null;

        // Find the post closest to the center of the viewport
        let bestPost: Element | null = null;
        let minDistance = Infinity;
        const centerY = window.innerHeight / 2;

        posts.forEach(post => {
            const rect = post.getBoundingClientRect();
            const postCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(centerY - postCenterY);

            // The post must be at least partially visible
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                if (distance < minDistance) {
                    minDistance = distance;
                    bestPost = post;
                }
            }
        });

        const feedUpdate = (bestPost || posts[0]) as HTMLElement;

        if (feedUpdate) {
            // Unfold "see more" if present
            const seeMore = feedUpdate.querySelector('.feed-shared-inline-show-more-text__see-more-less-toggle');
            if (seeMore) (seeMore as HTMLElement).click();

            const text = getText('.feed-shared-update-v2__description', feedUpdate) ||
                getText('.feed-shared-text', feedUpdate) ||
                getText('.feed-shared-inline-show-more-text', feedUpdate);

            const author = getText('.feed-shared-actor__name', feedUpdate) ||
                getText('.update-components-actor__name', feedUpdate);

            // Try to get a unique identifier for this post
            const postUrn = feedUpdate.getAttribute('data-urn') ||
                feedUpdate.getAttribute('data-id') ||
                text.substring(0, 50);

            // Try to get the post URL
            let postUrl = window.location.href;

            // Extract activity ID from URN (format: urn:li:activity:1234567890)
            if (postUrn && postUrn.includes('urn:li:activity:')) {
                const activityId = postUrn.replace('urn:li:activity:', '');
                postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
            }

            // Fallback: try to find a link to the post in the post header (timestamp link)
            if (postUrl === window.location.href || postUrl.includes('/feed/')) {
                const postLink = feedUpdate.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
                if (postLink) {
                    const href = postLink.getAttribute('href');
                    if (href) {
                        postUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
                    }
                }
            }

            // Detect video
            const videoElement = feedUpdate.querySelector('video') as HTMLVideoElement;
            const hasVideo = !!videoElement;

            // Extract video thumbnail
            let videoThumbnail: string | undefined = undefined;

            if (hasVideo) {
                // Get thumbnail from video poster
                if (videoElement.poster) {
                    videoThumbnail = videoElement.poster;
                }

                // Get thumbnail from video poster or nearby image
                if (!videoThumbnail) {
                    const posterImg = feedUpdate.querySelector('.video-js-poster img, .feed-shared-linkedin-video img, .update-components-linkedin-video img');
                    if (posterImg) {
                        videoThumbnail = (posterImg as HTMLImageElement).src;
                    }
                }

                // Fallback thumbnail: first large image in the post
                if (!videoThumbnail) {
                    const fallbackImg = feedUpdate.querySelector('img[src*="media.licdn.com"]');
                    if (fallbackImg) {
                        videoThumbnail = (fallbackImg as HTMLImageElement).src;
                    }
                }
            }

            // Extract images (exclude video thumbnail)
            const images: string[] = [];
            const imageElements = feedUpdate.querySelectorAll('img.ivm-view-attr__img--centered, img[data-delayed-url], .update-components-image img');
            imageElements.forEach(img => {
                const src = (img as HTMLImageElement).src || (img as HTMLElement).getAttribute('data-delayed-url');
                if (src && !src.includes('profile-displayphoto') && !src.includes('logo') && !src.includes('emoji') && src !== videoThumbnail) {
                    images.push(src);
                }
            });

            return {
                title: author ? `Post de ${author} sur LinkedIn` : 'Post LinkedIn',
                content: text,
                textContent: text,
                excerpt: text.substring(0, 100),
                siteName: 'LinkedIn',
                url: postUrl,
                postId: postUrn, // Attach unique ID
                hasVideo: hasVideo,
                images: images.length > 0 ? images : undefined,
                video: hasVideo ? {
                    url: postUrl,
                    thumbnail: videoThumbnail,
                    type: 'linkedin'
                } : undefined,
            };
        }
        return null;
    },

    // 4. Facebook (Very basic support as FB is hostile to scraping)
    facebook: () => {
        if (!window.location.hostname.includes('facebook.com')) return null;

        const isReel = window.location.href.includes('/reel/');
        const isWatch = window.location.href.includes('/watch');
        const isVideo = window.location.href.includes('/videos/');

        // For Reels, Watch, and Videos pages
        if (isReel || isWatch || isVideo) {
            // Detect video element
            const videoElement = document.querySelector('video') as HTMLVideoElement;
            const hasVideo = !!videoElement;

            // Get video thumbnail
            let videoThumbnail: string | undefined = undefined;
            if (videoElement?.poster) {
                videoThumbnail = videoElement.poster;
            }
            if (!videoThumbnail) {
                // Try og:image
                videoThumbnail = getMeta('og:image') || undefined;
            }

            // Try to get text/description
            let text = getMeta('og:description') || '';

            // Try to find description in the page
            if (!text) {
                const descriptionEl = document.querySelector('[data-ad-preview="message"], div[dir="auto"]');
                if (descriptionEl) {
                    text = (descriptionEl as HTMLElement).innerText?.trim() || '';
                }
            }

            // Get title
            const title = getMeta('og:title') || (isReel ? 'Facebook Reel' : 'Facebook Video');

            return {
                title: title,
                content: text || '(Video)',
                textContent: text || '(Video)',
                excerpt: text ? text.substring(0, 100) : '(Video)',
                siteName: 'Facebook',
                url: window.location.href,
                hasVideo: hasVideo,
                video: {
                    url: window.location.href,
                    thumbnail: videoThumbnail,
                    type: isReel ? 'facebook-reel' : 'facebook-video'
                },
            };
        }

        // Find post: try data-ad-preview first (single post view), then role="article" (feed)
        let feedPost: HTMLElement | null = null;

        const adPreview = document.querySelector('div[data-ad-preview="message"]');
        if (adPreview) {
            // Use the closest parent article or a reasonable parent
            feedPost = (adPreview.closest('[role="article"]') || adPreview.parentElement?.parentElement?.parentElement) as HTMLElement;
        }

        // Feed: find the post the user is currently viewing
        if (!feedPost) {
            const articles = Array.from(document.querySelectorAll('[role="article"]'));

            // Only keep top-level articles (not comments nested inside other articles)
            const topLevelArticles = articles.filter(a => !a.parentElement?.closest('[role="article"]'));

            // DEBUG: highlight all top-level articles and log their positions
            const centerY = window.innerHeight / 2;
            console.log(`[ReMixIt] DEBUG: ${topLevelArticles.length} top-level articles, viewport center=${centerY}, innerHeight=${window.innerHeight}`);

            // Remove previous debug highlights
            document.querySelectorAll('.remixit-debug-highlight').forEach(el => {
                (el as HTMLElement).style.outline = '';
                el.classList.remove('remixit-debug-highlight');
            });

            let bestPost: Element | null = null;
            let minDistance = Infinity;

            topLevelArticles.forEach((post, i) => {
                const rect = post.getBoundingClientRect();
                const postCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(centerY - postCenterY);

                console.log(`[ReMixIt] DEBUG article[${i}]: top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)} height=${Math.round(rect.height)} center=${Math.round(postCenterY)} dist=${Math.round(distance)}`);

                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestPost = post;
                    }
                }
            });

            feedPost = (bestPost || topLevelArticles[0]) as HTMLElement;

            // DEBUG: highlight selected post with red border
            if (feedPost) {
                feedPost.style.outline = '3px solid red';
                feedPost.classList.add('remixit-debug-highlight');
                const r = feedPost.getBoundingClientRect();
                console.log(`[ReMixIt] DEBUG SELECTED: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} height=${Math.round(r.height)}`);
            }
        }

        if (!feedPost) return null;

        // Extract text: data-ad-preview or longest dir="auto" div
        let text = '';
        const adMsg = feedPost.querySelector('[data-ad-preview="message"]');
        if (adMsg) {
            text = (adMsg as HTMLElement).innerText?.trim() || '';
        }
        if (!text) {
            const dirAutoDivs = feedPost.querySelectorAll('div[dir="auto"]');
            let longest = '';
            dirAutoDivs.forEach(div => {
                const t = (div as HTMLElement).innerText?.trim() || '';
                if (t.length > longest.length) longest = t;
            });
            text = longest;
        }

        // Extract author
        let author = '';
        const strongEl = feedPost.querySelector('strong');
        if (strongEl) {
            author = (strongEl as HTMLElement).innerText?.trim() || '';
        }

        // Detect video
        const videoElement = feedPost.querySelector('video') as HTMLVideoElement;
        const hasVideo = !!videoElement;

        let videoThumbnail: string | undefined = undefined;
        if (hasVideo) {
            if (videoElement.poster) videoThumbnail = videoElement.poster;
            if (!videoThumbnail) videoThumbnail = getMeta('og:image') || undefined;
        }

        // Extract images from the post (scontent = Facebook CDN for media)
        const images: string[] = [];
        const allImgs = feedPost.querySelectorAll('img');
        allImgs.forEach(img => {
            const src = (img as HTMLImageElement).src;
            if (!src) return;
            // Keep only substantial images from Facebook CDN
            if (!src.includes('scontent') && !src.includes('fbcdn')) return;
            // Skip small UI images, profile pics, emojis
            const w = (img as HTMLImageElement).naturalWidth;
            const h = (img as HTMLImageElement).naturalHeight;
            if (w > 0 && w < 100) return;
            if (h > 0 && h < 100) return;
            if (src === videoThumbnail) return;
            images.push(src);
        });
        const uniqueImages = [...new Set(images)];

        // If video but no thumbnail, use first image
        if (hasVideo && !videoThumbnail && uniqueImages.length > 0) {
            videoThumbnail = uniqueImages[0];
        }

        if (!text && uniqueImages.length === 0 && !hasVideo) return null;

        return {
            title: author ? `Post de ${author} sur Facebook` : 'Facebook Post',
            content: text || '(Media)',
            textContent: text || '(Media)',
            excerpt: text ? text.substring(0, 100) : '(Media)',
            siteName: 'Facebook',
            url: window.location.href,
            hasVideo: hasVideo,
            images: uniqueImages.length > 0 ? uniqueImages : undefined,
            video: hasVideo ? {
                url: window.location.href,
                thumbnail: videoThumbnail,
                type: 'facebook'
            } : undefined,
        };
    }
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'EXTRACT_CONTENT') {
        try {
            let extractedData = null;

            // Try specific extractors first
            if (!extractedData) extractedData = extractors.youtube();
            if (!extractedData) extractedData = extractors.twitter();
            if (!extractedData) extractedData = extractors.linkedin();
            if (!extractedData) extractedData = extractors.facebook();

            // Fallback to Readability
            if (!extractedData) {
                const documentClone = document.cloneNode(true) as Document;
                const reader = new Readability(documentClone);
                const article = reader.parse();
                if (article) {
                    // ... (keep previous Readability logic for video fallback) ...
                    const videoData: { url?: string; thumbnail?: string; type?: string } = {};
                    const ogVideo = document.querySelector('meta[property="og:video"]');
                    const ogVideoSecure = document.querySelector('meta[property="og:video:secure_url"]');
                    const ogImage = document.querySelector('meta[property="og:image"]'); // Added ogImage for thumbnail fallback
                    if (ogVideo || ogVideoSecure) {
                        videoData.url = (ogVideoSecure || ogVideo)?.getAttribute('content') || undefined;
                        videoData.type = 'social/og';
                    }
                    // 3. Check for HTML5 Video tags (generic pages)
                    if (!videoData.url) {
                        const videoTag = document.querySelector('video');
                        if (videoTag) {
                            videoData.url = videoTag.src || videoTag.querySelector('source')?.src;
                            videoData.type = 'html5';
                        }
                    }
                    // Thumbnail fallback
                    if (ogImage) {
                        videoData.thumbnail = ogImage.getAttribute('content') || undefined;
                    }

                    extractedData = {
                        title: article.title,
                        content: article.content,
                        textContent: article.textContent,
                        excerpt: article.excerpt,
                        siteName: article.siteName,
                        url: window.location.href,
                        hasVideo: !!videoData.url,
                        video: videoData
                    };
                }
            }

            if (extractedData) {
                sendResponse({
                    success: true,
                    data: extractedData
                });
            } else {
                sendResponse({ success: false, error: 'Failed to parse content.' });
            }
        } catch (error) {
            console.error('Extraction error:', error);
            sendResponse({ success: false, error: (error as Error).message });
        }
    }
    // Return true to indicate we wish to send a response asynchronously (though here we are sync mostly)
    return true;
});

// Inject Floating Button
const createToggleButton = () => {
    // Check if already exists
    if (document.getElementById('remixit-toggle-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'remixit-toggle-btn';

    // Using the white chameleon icon
    const iconUrl = chrome.runtime.getURL('WhiteIcon512.png');
    btn.innerHTML = `
        <img src="${iconUrl}" alt="ReMixIt" style="width: 24px; height: 24px; object-fit: contain;" />
    `;

    btn.title = 'Ouvrir ReMixIt';

    // Apply basic inline styles just in case css fails to load or for specificity
    btn.style.position = 'fixed';
    btn.style.top = '50%';
    btn.style.right = '0';
    btn.style.transform = 'translateY(-50%)';
    btn.style.zIndex = '2147483647'; // Max z-index
    btn.style.backgroundColor = '#e64533';
    btn.style.color = 'white';
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.borderTopLeftRadius = '8px';
    btn.style.borderBottomLeftRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.15)';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.fontFamily = 'sans-serif';

    // Hover effects via JS since we are using inline styles for reliability
    btn.onmouseenter = () => {
        btn.style.width = '50px';
        btn.style.backgroundColor = '#b91c1c';
    };
    btn.onmouseleave = () => {
        btn.style.width = '40px';
        btn.style.backgroundColor = '#e64533';
    };

    btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
        // Don't hide the button - let it stay visible
    });

    document.body.appendChild(btn);
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggleButton);
} else {
    createToggleButton();
}

// Social feed scroll detection - trigger extraction of the central post
let scrollTimeout: any = null;
const isSocialFeed = window.location.hostname.includes('linkedin.com') ||
                     window.location.hostname.includes('facebook.com') ||
                     window.location.hostname.includes('twitter.com') ||
                     window.location.hostname.includes('x.com');

if (isSocialFeed) {
    window.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'SCROLL_DETECTED' }).catch(() => { });
        }, 500); // 500ms throttle
    }, { passive: true });
}
