import { Readability } from '@mozilla/readability';


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

        const currentUrl = window.location.href;
        const isShorts = currentUrl.includes('/shorts/');

        // Extract video ID from URL
        let videoId: string | null = null;
        try {
            const urlObj = new URL(currentUrl);
            if (isShorts) {
                const match = currentUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
                videoId = match ? match[1] : null;
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } catch (e) { /* ignore */ }

        // Build reliable thumbnail URL from video ID
        const thumbnailFromId = videoId
            ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            : undefined;

        if (isShorts) {
            // YouTube Shorts - target the active reel renderer
            const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');

            // Title: try DOM selectors on the active reel, then broader selectors,
            // then document.title (always updated by YouTube after SPA navigation)
            let title = '';
            if (activeReel) {
                title = getText('h2 yt-formatted-string', activeReel)
                    || getText('#title yt-formatted-string', activeReel)
                    || getText('h2', activeReel)
                    || getText('[id*="title"]', activeReel);
            }
            if (!title) {
                title = getText('ytd-reel-video-renderer[is-active] h2 yt-formatted-string')
                    || getText('ytd-reel-video-renderer[is-active] h2')
                    || getText('yt-formatted-string.ytd-reel-player-header-renderer');
            }
            if (!title) {
                // document.title is the most reliable after SPA nav: "Short title - YouTube"
                const docTitle = document.title.replace(/\s*-\s*YouTube$/, '').trim();
                if (docTitle && docTitle !== 'YouTube') title = docTitle;
            }
            if (!title) {
                title = getMeta('og:title') || '';
            }

            // Channel name
            let channel = '';
            if (activeReel) {
                channel = getText('#channel-name a', activeReel)
                    || getText('#channel-name yt-formatted-string', activeReel)
                    || getText('ytd-channel-name a', activeReel)
                    || getText('ytd-channel-name yt-formatted-string', activeReel)
                    || getText('.ytd-channel-name', activeReel);
            }
            if (!channel) {
                channel = getText('ytd-reel-video-renderer[is-active] #channel-name a')
                    || getText('ytd-reel-video-renderer[is-active] ytd-channel-name a')
                    || '';
            }

            // Description - Shorts often hide the description behind an overlay
            let description = '';
            if (activeReel) {
                description = getText('#description', activeReel)
                    || getText('.description', activeReel)
                    || getText('yt-attributed-string', activeReel);
            }
            if (!description) {
                description = getMeta('og:description') || title;
            }

            // thumbnailFromId is PRIMARY - og:image is stale after SPA navigation
            const thumbnail = thumbnailFromId || getMeta('og:image');

            const images: string[] = [];
            if (thumbnail) images.push(thumbnail);

            return {
                title: title || `YouTube Short${channel ? ` - ${channel}` : ''}`,
                content: `${channel ? `${channel}\n\n` : ''}${description}`,
                textContent: `${channel ? `${channel}\n\n` : ''}${description}`,
                excerpt: description.substring(0, 100),
                siteName: 'YouTube',
                url: currentUrl,
                postId: videoId || currentUrl,
                hasVideo: true,
                images: images.length > 0 ? images : undefined,
                video: {
                    url: currentUrl,
                    thumbnail: thumbnail,
                    type: 'youtube-short'
                }
            };
        }

        // Regular watch page
        // YouTube is a SPA - DOM selectors are more reliable than meta tags after navigation
        // Try multiple selectors in order of reliability

        // Title: prefer DOM selectors over meta tags (meta tags may be stale after SPA navigation)
        const title = getText('h1.ytd-watch-metadata yt-formatted-string')
            || getText('ytd-watch-metadata h1 yt-formatted-string')
            || getText('#above-the-fold #title yt-formatted-string')
            || getText('#title h1')
            || getText('h1')
            || getMeta('og:title')
            || document.title.replace(' - YouTube', '');

        // Description: expand it first if collapsed
        const moreButton = document.querySelector('#expand') || document.querySelector('tp-yt-paper-button#expand');
        if (moreButton) (moreButton as HTMLElement).click();

        const description = getText('#description-inline-expander yt-attributed-string')
            || getText('#description-inline-expander')
            || getText('#description-inner')
            || getText('ytd-text-inline-expander #plain-snippet-text')
            || getText('#description')
            || getMeta('og:description')
            || '';

        // Channel name
        const channel = getText('#owner #channel-name yt-formatted-string a')
            || getText('ytd-channel-name yt-formatted-string a')
            || getText('#upload-info ytd-channel-name a')
            || '';

        // Thumbnail: thumbnailFromId is always correct for the current video
        // og:image can be stale after SPA navigation
        const thumbnail = thumbnailFromId || getMeta('og:image');

        // Extract images from description (some videos link images)
        const images: string[] = [];
        if (thumbnail) images.push(thumbnail);

        return {
            title: title || 'YouTube Video',
            content: `${channel ? `${channel}\n\n` : ''}${description}`,
            textContent: `${channel ? `${channel}\n\n` : ''}${description}`,
            excerpt: description.substring(0, 100),
            siteName: 'YouTube',
            url: currentUrl,
            postId: videoId || currentUrl,
            hasVideo: true,
            images: images.length > 0 ? images : undefined,
            video: {
                url: currentUrl,
                thumbnail: thumbnail,
                type: isShorts ? 'youtube-short' : 'youtube'
            }
        };
    },

    // 2. X / Twitter
    twitter: () => {
        if (!window.location.hostname.includes('twitter.com') && !window.location.hostname.includes('x.com')) return null;

        const currentUrl = window.location.href;
        const isStatusPage = /\/(status|statuses)\/\d+/.test(currentUrl);
        const isMediaFullscreen = /\/status\/\d+\/(video|photo)\/\d+/.test(currentUrl);

        // Extract base status URL (without /video/1 or /photo/1 suffix)
        let baseStatusUrl = currentUrl;
        if (isMediaFullscreen) {
            baseStatusUrl = currentUrl.replace(/\/(video|photo)\/\d+$/, '');
        }

        // Find all tweets
        const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));

        // On a status/media page, we may also have a fullscreen video outside the tweet article
        let tweet: HTMLElement | null = null;

        if (isStatusPage && tweets.length > 0) {
            // On a single tweet page, take the first tweet (the main one, not replies)
            tweet = tweets[0] as HTMLElement;
        } else if (tweets.length > 0) {
            // Feed mode: find the tweet closest to the center of the viewport
            let bestTweet: Element | null = null;
            let minDistance = Infinity;
            const centerY = window.innerHeight / 2;

            tweets.forEach(t => {
                const rect = t.getBoundingClientRect();
                const tweetCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(centerY - tweetCenterY);

                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestTweet = t;
                    }
                }
            });

            tweet = (bestTweet || tweets[0]) as HTMLElement;
        }

        // On fullscreen media pages, the tweet article might not exist or might be hidden
        // Try to extract info from meta tags and the page-level video
        if (!tweet && isMediaFullscreen) {
            const videoElement = document.querySelector('video') as HTMLVideoElement;
            const hasVideo = !!videoElement;

            let videoThumbnail: string | undefined = undefined;
            if (hasVideo && videoElement) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth || 320;
                    canvas.height = videoElement.videoHeight || 180;
                    canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    if (dataUrl && dataUrl.length > 100) videoThumbnail = dataUrl;
                } catch (e) { /* CORS */ }
                if (!videoThumbnail && videoElement.poster) videoThumbnail = videoElement.poster;
                if (!videoThumbnail) videoThumbnail = getMeta('og:image') || undefined;
            }

            // Extract images from the page
            const images: string[] = [];
            if (!hasVideo) {
                const allImgs = document.querySelectorAll('img[src*="twimg.com/media"]');
                allImgs.forEach(img => {
                    const src = (img as HTMLImageElement).src;
                    if (src && !src.includes('profile_images') && !src.includes('emoji')) images.push(src);
                });
            }

            const title = getMeta('og:title') || document.title;
            const description = getMeta('og:description') || '';

            return {
                title: title,
                content: description,
                textContent: description,
                excerpt: description,
                siteName: 'X (Twitter)',
                url: baseStatusUrl,
                hasVideo: hasVideo,
                images: images.length > 0 ? images : undefined,
                video: hasVideo ? {
                    url: baseStatusUrl,
                    thumbnail: videoThumbnail,
                    type: 'twitter'
                } : undefined
            };
        }

        if (!tweet) return null;

        const text = getText('[data-testid="tweetText"]', tweet);
        const user = getText('[data-testid="User-Name"]', tweet);
        const time = tweet.querySelector('time')?.getAttribute('datetime');

        // Get tweet URL
        let tweetUrl = isStatusPage ? baseStatusUrl : window.location.href;
        if (!isStatusPage) {
            const timeLink = tweet.querySelector('a[href*="/status/"]');
            if (timeLink) {
                const href = timeLink.getAttribute('href');
                if (href) {
                    tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
                }
            }
        }

        // Detect video - check both inside the tweet and at page level (fullscreen overlay)
        let videoElement = tweet.querySelector('video') as HTMLVideoElement;
        if (!videoElement && isMediaFullscreen) {
            videoElement = document.querySelector('video') as HTMLVideoElement;
        }
        const hasVideo = !!videoElement;

        // Capture video thumbnail
        let videoThumbnail: string | undefined = undefined;
        if (hasVideo && videoElement) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth || 320;
                canvas.height = videoElement.videoHeight || 180;
                canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (dataUrl && dataUrl.length > 100) {
                    videoThumbnail = dataUrl;
                }
            } catch (e) { /* CORS */ }

            // Fallbacks
            if (!videoThumbnail && videoElement.poster) {
                videoThumbnail = videoElement.poster;
            }
            if (!videoThumbnail) {
                const videoImg = tweet.querySelector('div[data-testid="videoPlayer"] img') ||
                    document.querySelector('div[data-testid="videoPlayer"] img');
                if (videoImg) videoThumbnail = (videoImg as HTMLImageElement).src;
            }
            if (!videoThumbnail) {
                videoThumbnail = getMeta('og:image') || undefined;
            }
        }

        // Extract images - check both tweet and page level for fullscreen photo pages
        const images: string[] = [];
        const imgContainers = isMediaFullscreen ? [tweet, document.body] : [tweet];
        imgContainers.forEach(container => {
            container.querySelectorAll('img[src*="twimg.com/media"]').forEach(img => {
                const src = (img as HTMLImageElement).src;
                if (src && !src.includes('profile_images') && !src.includes('emoji') && src !== videoThumbnail && !images.includes(src)) {
                    images.push(src);
                }
            });
        });

        return {
            title: `${user} on X (${time || 'Unknown Date'}): "${text.substring(0, 50)}..."`,
            content: text,
            textContent: text,
            excerpt: text,
            siteName: 'X (Twitter)',
            url: tweetUrl,
            hasVideo: hasVideo,
            images: images.length > 0 ? images : undefined,
            video: hasVideo ? {
                url: tweetUrl,
                thumbnail: videoThumbnail,
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

        // Find posts by looking for div[dir="auto"] with substantial text
        // These are the actual text blocks in Facebook posts
        const textBlocks = Array.from(document.querySelectorAll('div[dir="auto"]'))
            .filter(d => {
                const t = (d as HTMLElement).innerText?.trim() || '';
                return t.length > 20;
            })
            .map(d => ({
                el: d as HTMLElement,
                rect: d.getBoundingClientRect(),
                text: (d as HTMLElement).innerText?.trim() || ''
            }))
            // Keep only visible ones
            .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight);

        if (textBlocks.length === 0) return null;

        // Group text blocks by proximity (same post = similar top position, within 100px)
        // Pick the group closest to viewport center
        const centerY = window.innerHeight / 2;
        let bestBlock = textBlocks[0];
        let minDistance = Infinity;

        textBlocks.forEach(block => {
            const distance = Math.abs(centerY - block.rect.top);
            if (distance < minDistance) {
                minDistance = distance;
                bestBlock = block;
            }
        });

        const text = bestBlock.text;
        const textEl = bestBlock.el;

        // Walk up from the text to find the full post container
        // Video/images are ~14 levels above text, so we go up until we find a
        // container that has video or images, or max 15 levels
        let feedPost: HTMLElement = textEl;
        for (let i = 0; i < 15; i++) {
            if (!feedPost.parentElement) break;
            feedPost = feedPost.parentElement;
            // Stop if we found a container with video or substantial images
            const hasMedia = feedPost.querySelector('video') ||
                feedPost.querySelectorAll('img[src*="scontent"]').length > 0;
            if (hasMedia && i >= 5) break;
        }

        // Extract author from the post container
        let author = '';
        const strongEl = feedPost.querySelector('strong');
        if (strongEl) {
            author = (strongEl as HTMLElement).innerText?.trim() || '';
        }

        // Detect video
        const videoElement = feedPost.querySelector('video') as HTMLVideoElement;
        const hasVideo = !!videoElement;

        // Capture video thumbnail by drawing the current frame to a canvas
        let videoThumbnail: string | undefined = undefined;
        if (hasVideo && videoElement) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth || 320;
                canvas.height = videoElement.videoHeight || 180;
                canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (dataUrl && dataUrl.length > 100) {
                    videoThumbnail = dataUrl;
                }
            } catch (e) {
                // Canvas capture can fail due to CORS
            }
            // Fallback to poster or og:image
            if (!videoThumbnail && videoElement.poster) {
                videoThumbnail = videoElement.poster;
            }
            if (!videoThumbnail) {
                videoThumbnail = getMeta('og:image') || undefined;
            }
        }

        // Extract images from the post container
        const images: string[] = [];
        const allImgs = feedPost.querySelectorAll('img');
        allImgs.forEach(img => {
            const src = (img as HTMLImageElement).src;
            if (!src) return;
            if (!src.includes('scontent') && !src.includes('fbcdn')) return;
            if (src.includes('rsrc.php') || src.includes('emoji') || src.includes('play_circle')) return;
            const w = (img as HTMLImageElement).naturalWidth;
            const h = (img as HTMLImageElement).naturalHeight;
            if (w > 0 && w < 100) return;
            if (h > 0 && h < 100) return;
            if (src === videoThumbnail) return;
            images.push(src);
        });
        const uniqueImages = [...new Set(images)];

        if (hasVideo && !videoThumbnail && uniqueImages.length > 0) {
            videoThumbnail = uniqueImages[0];
        }

        return {
            title: author ? `Post de ${author} sur Facebook` : 'Facebook Post',
            content: text,
            textContent: text,
            excerpt: text.substring(0, 100),
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
    },

    // 5. Instagram
    instagram: () => {
        if (!window.location.hostname.includes('instagram.com')) return null;

        const currentUrl = window.location.href;
        const isReel = currentUrl.includes('/reel/') || currentUrl.includes('/reels/');
        const isPostPage = /\/p\/[^/]+/.test(currentUrl);

        // Parse author from og:title — format: "Author on Instagram: \"caption...\""
        const parseAuthorFromOg = () => {
            const ogTitle = getMeta('og:title') || '';
            const match = ogTitle.match(/^(.+?)\s+on Instagram/);
            return match ? match[1].trim() : '';
        };

        // Reel page
        if (isReel) {
            const videoElement = document.querySelector('video') as HTMLVideoElement;
            const hasVideo = !!videoElement;

            let videoThumbnail: string | undefined = undefined;
            if (videoElement?.poster) videoThumbnail = videoElement.poster;
            if (!videoThumbnail) videoThumbnail = getMeta('og:image') || undefined;

            // Caption from meta tags (most reliable for reels)
            const ogTitle = getMeta('og:title') || '';
            const ogDesc = getMeta('og:description') || '';
            const author = parseAuthorFromOg();

            // Try to extract caption from og:title after "Author on Instagram: "
            let caption = '';
            const captionMatch = ogTitle.match(/on Instagram:\s*["""]?(.*)/);
            if (captionMatch) {
                caption = captionMatch[1].replace(/["""]$/, '').trim();
            }
            if (!caption) caption = ogDesc;
            if (!caption) {
                const docTitle = document.title.replace(/\s*[•|]\s*Instagram$/, '').trim();
                if (docTitle && docTitle !== 'Instagram') caption = docTitle;
            }

            const title = author
                ? `Reel de ${author} sur Instagram`
                : 'Instagram Reel';

            const images: string[] = [];
            if (videoThumbnail) images.push(videoThumbnail);

            return {
                title,
                content: caption || '(Reel)',
                textContent: caption || '(Reel)',
                excerpt: caption ? caption.substring(0, 100) : '(Reel)',
                siteName: 'Instagram',
                url: currentUrl,
                hasVideo: hasVideo,
                images: images.length > 0 ? images : undefined,
                video: hasVideo ? {
                    url: currentUrl,
                    thumbnail: videoThumbnail,
                    type: 'instagram-reel'
                } : undefined,
            };
        }

        // Post page or feed
        const articles = Array.from(document.querySelectorAll('article'));

        let targetArticle: HTMLElement | null = null;

        if (isPostPage && articles.length > 0) {
            // Single post page: first article
            targetArticle = articles[0] as HTMLElement;
        } else if (articles.length > 0) {
            // Feed: find article closest to viewport center
            let minDistance = Infinity;
            const centerY = window.innerHeight / 2;

            articles.forEach(a => {
                const rect = a.getBoundingClientRect();
                const aCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(centerY - aCenterY);
                if (rect.bottom > 0 && rect.top < window.innerHeight && distance < minDistance) {
                    minDistance = distance;
                    targetArticle = a as HTMLElement;
                }
            });

            if (!targetArticle) targetArticle = articles[0] as HTMLElement;
        }

        if (!targetArticle) {
            // No article found — try meta tags as fallback (e.g., stories, explore)
            const ogTitle = getMeta('og:title');
            const ogDesc = getMeta('og:description');
            const ogImage = getMeta('og:image');
            if (ogTitle || ogDesc) {
                return {
                    title: ogTitle || 'Instagram',
                    content: ogDesc || '',
                    textContent: ogDesc || '',
                    excerpt: (ogDesc || '').substring(0, 100),
                    siteName: 'Instagram',
                    url: currentUrl,
                    hasVideo: false,
                    images: ogImage ? [ogImage] : undefined,
                };
            }
            return null;
        }

        // Extract author — look for profile links in article header
        let author = '';
        const headerLinks = targetArticle.querySelectorAll('header a[href^="/"]');
        headerLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const linkText = (link.textContent || '').trim();
            // Profile links are like "/username/" — skip /p/, /reel/, /explore/ etc.
            if (linkText && href.match(/^\/[^/]+\/?$/) && !href.startsWith('/p/') && !href.startsWith('/reel/')) {
                if (!author) author = linkText;
            }
        });
        if (!author) author = parseAuthorFromOg();

        // Extract caption text — find spans/divs with substantial text inside article
        let caption = '';
        const textElements = targetArticle.querySelectorAll('span, div[dir="auto"]');
        textElements.forEach(el => {
            const t = (el.textContent || '').trim();
            // Skip short text (likes count, dates, button labels, etc.)
            if (t.length > caption.length && t.length > 20) {
                // Avoid selecting elements that are ancestors of other candidates
                const isNested = el.querySelector('span, div[dir="auto"]');
                if (!isNested || t.length > 100) {
                    caption = t;
                }
            }
        });
        if (!caption) {
            caption = getMeta('og:description') || getMeta('og:title') || '';
        }

        // Detect video
        const videoElement = targetArticle.querySelector('video') as HTMLVideoElement;
        const hasVideo = !!videoElement;

        let videoThumbnail: string | undefined = undefined;
        if (hasVideo && videoElement) {
            if (videoElement.poster) videoThumbnail = videoElement.poster;
            if (!videoThumbnail) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth || 320;
                    canvas.height = videoElement.videoHeight || 320;
                    canvas.getContext('2d')?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    if (dataUrl && dataUrl.length > 100) videoThumbnail = dataUrl;
                } catch (e) { /* CORS */ }
            }
            if (!videoThumbnail) videoThumbnail = getMeta('og:image') || undefined;
        }

        // Extract images
        const images: string[] = [];
        const allImgs = targetArticle.querySelectorAll('img');
        allImgs.forEach(img => {
            const src = (img as HTMLImageElement).src;
            if (!src) return;
            // Instagram CDN images
            if (!src.includes('cdninstagram.com') && !src.includes('fbcdn.net') && !src.includes('scontent')) return;
            // Skip profile pictures and small icons
            const w = (img as HTMLImageElement).naturalWidth;
            const h = (img as HTMLImageElement).naturalHeight;
            if (w > 0 && w < 100) return;
            if (h > 0 && h < 100) return;
            // Skip if it's the video thumbnail
            if (src === videoThumbnail) return;
            if (!images.includes(src)) images.push(src);
        });

        // If no images found in article, try og:image
        if (images.length === 0) {
            const ogImage = getMeta('og:image');
            if (ogImage) images.push(ogImage);
        }

        // Try to get post URL (for feed mode)
        let postUrl = currentUrl;
        if (!isPostPage) {
            const postLink = targetArticle.querySelector('a[href*="/p/"], a[href*="/reel/"]');
            if (postLink) {
                const href = postLink.getAttribute('href');
                if (href) {
                    postUrl = href.startsWith('http') ? href : `https://www.instagram.com${href}`;
                }
            }
        }

        const title = author
            ? `Post de ${author} sur Instagram`
            : 'Post Instagram';

        return {
            title,
            content: caption,
            textContent: caption,
            excerpt: caption.substring(0, 100),
            siteName: 'Instagram',
            url: postUrl,
            hasVideo: hasVideo,
            images: images.length > 0 ? images : undefined,
            video: hasVideo ? {
                url: postUrl,
                thumbnail: videoThumbnail,
                type: 'instagram'
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
            if (!extractedData) extractedData = extractors.instagram();

            // Fallback to Readability (news sites, blogs, articles, etc.)
            if (!extractedData) {
                const documentClone = document.cloneNode(true) as Document;
                const reader = new Readability(documentClone);
                const article = reader.parse();
                if (article) {
                    // Video detection
                    const videoData: { url?: string; thumbnail?: string; type?: string } = {};
                    const ogVideo = document.querySelector('meta[property="og:video"]');
                    const ogVideoSecure = document.querySelector('meta[property="og:video:secure_url"]');
                    if (ogVideo || ogVideoSecure) {
                        videoData.url = (ogVideoSecure || ogVideo)?.getAttribute('content') || undefined;
                        videoData.type = 'social/og';
                    }
                    if (!videoData.url) {
                        const videoTag = document.querySelector('video');
                        if (videoTag) {
                            videoData.url = videoTag.src || videoTag.querySelector('source')?.src;
                            videoData.type = 'html5';
                        }
                    }

                    // Image extraction
                    const images: string[] = [];

                    // 1. og:image is the main article image (most news sites set this)
                    const ogImage = getMeta('og:image');
                    if (ogImage) {
                        const fullUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, window.location.origin).href;
                        images.push(fullUrl);
                    }

                    // 2. twitter:image (some sites use this instead of or in addition to og:image)
                    const twitterImage = getMeta('twitter:image') || getMeta('twitter:image:src');
                    if (twitterImage && !images.includes(twitterImage)) {
                        const fullUrl = twitterImage.startsWith('http') ? twitterImage : new URL(twitterImage, window.location.origin).href;
                        if (!images.includes(fullUrl)) images.push(fullUrl);
                    }

                    // 3. Extract images from the article content (Readability returns HTML)
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = article.content || '';
                    tempDiv.querySelectorAll('img').forEach(img => {
                        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                        if (!src) return;
                        const fullUrl = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
                        // Skip tiny images (icons, trackers, ads)
                        const w = img.getAttribute('width');
                        const h = img.getAttribute('height');
                        if (w && parseInt(w) < 100) return;
                        if (h && parseInt(h) < 100) return;
                        // Skip common non-content patterns
                        if (fullUrl.includes('pixel') || fullUrl.includes('tracker') || fullUrl.includes('beacon')
                            || fullUrl.includes('ads') || fullUrl.includes('avatar') || fullUrl.includes('logo')
                            || fullUrl.includes('icon') || fullUrl.includes('emoji') || fullUrl.includes('badge')
                            || fullUrl.match(/1x1|spacer|blank|transparent/)) return;
                        if (!images.includes(fullUrl)) images.push(fullUrl);
                    });

                    // Video thumbnail from og:image
                    if (videoData.url && ogImage) {
                        videoData.thumbnail = ogImage;
                    }

                    // Site name: try multiple sources
                    const siteName = article.siteName
                        || getMeta('og:site_name')
                        || getMeta('application-name')
                        || (document.querySelector('meta[property="publisher"]') as HTMLMetaElement)?.content
                        || window.location.hostname.replace('www.', '') || '';

                    extractedData = {
                        title: article.title,
                        content: article.content,
                        textContent: article.textContent,
                        excerpt: article.excerpt,
                        siteName: siteName,
                        url: window.location.href,
                        hasVideo: !!videoData.url,
                        video: videoData.url ? videoData : undefined,
                        images: images.length > 0 ? images : undefined,
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
    if (document.getElementById('remorphit-toggle-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'remorphit-toggle-btn';

    // Using the white chameleon icon
    const iconUrl = chrome.runtime.getURL('WhiteIcon512.png');
    btn.innerHTML = `
        <img src="${iconUrl}" alt="ReMorphIt" style="width: 24px; height: 24px; object-fit: contain;" />
    `;

    btn.title = 'Ouvrir ReMorphIt';

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
                     window.location.hostname.includes('x.com') ||
                     window.location.hostname.includes('instagram.com');

if (isSocialFeed) {
    window.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'SCROLL_DETECTED' }).catch(() => { });
        }, 500); // 500ms throttle
    }, { passive: true });
}

// YouTube SPA navigation detection
// YouTube changes URLs via History API (pushState/replaceState) for watch pages and Shorts
// We poll the URL to detect changes reliably
if (window.location.hostname.includes('youtube.com')) {
    let lastYtUrl = window.location.href;
    let ytNavTimeout: any = null;

    const notifyYtNavigation = () => {
        if (ytNavTimeout) clearTimeout(ytNavTimeout);
        ytNavTimeout = setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'SCROLL_DETECTED' }).catch(() => { });
        }, 1500);
    };

    // Poll URL every 1s to catch Shorts scrolling and other SPA navigations
    setInterval(() => {
        const newUrl = window.location.href;
        if (newUrl !== lastYtUrl) {
            lastYtUrl = newUrl;
            notifyYtNavigation();
        }
    }, 1000);

    // Also listen for yt-navigate-finish (fires on watch page navigation)
    document.addEventListener('yt-navigate-finish', () => {
        const newUrl = window.location.href;
        if (newUrl !== lastYtUrl) {
            lastYtUrl = newUrl;
            notifyYtNavigation();
        }
    });
}
