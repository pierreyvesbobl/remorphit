import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithGoogleViaExtension } from '../lib/googleAuth';
import { translations, GENERATION_LANGUAGES } from '../lib/i18n';
import DOMPurify from 'dompurify';
import { type PlanType, PLAN_LIMITS, TRIAL_DURATION_DAYS, isTrialExpired } from '../lib/plans';
import '../index.css';

interface ArticleData {
    title: string;
    content: string;
    textContent: string;
    excerpt: string;
    siteName: string;
    url: string;
    author?: string;
    postId?: string;
    hasVideo?: boolean;
    video?: {
        url?: string;
        thumbnail?: string;
        type?: string;
    };
    images?: string[];
}

interface Template {
    id: string;
    name: string;
    description: string;
    prompt: string;
    is_public: boolean;
    user_id: string | null;
    created_at: string;
}

interface HistoryItem {
    id: string;
    title: string;
    content: string;
    template_name: string;
    url: string;
    tokens_used?: number;
    created_at: string;
}
const SidePanel = () => {
    const [article, setArticle] = useState<ArticleData | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingCount, setSendingCount] = useState(0);
    const [articleFlyOut, setArticleFlyOut] = useState(false);
    const [remorphCooldown, setRemorphCooldown] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');
    const [newTemplatePrompt, setNewTemplatePrompt] = useState('');

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'account'>('templates');

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    const [userPlan, setUserPlan] = useState<PlanType>('trial');
    const [trialExpired, setTrialExpired] = useState(false);
    const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [generationLang, setGenerationLang] = useState('auto');
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Edit & Chat states
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [contentUpdated, setContentUpdated] = useState(false);
    const [newHistoryIds, setNewHistoryIds] = useState<Set<string>>(new Set());

    // Pricing states
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    useEffect(() => {
        chrome.storage.local.get(['generationLanguage'], (result) => {
            if (result.generationLanguage) {
                setGenerationLang(result.generationLanguage as string);
            }
        });
    }, []);

    // Close upgrade modal if user is not logged in
    useEffect(() => {
        if (!user && showUpgradeModal) {
            setShowUpgradeModal(false);
        }
    }, [user, showUpgradeModal]);

    const changeGenerationLang = (code: string) => {
        setGenerationLang(code);
        chrome.storage.local.set({ generationLanguage: code });
    };

    const userTemplatesCount = templates.filter(t => !t.is_public && t.user_id === user?.id).length;
    const canCreateTemplate = userTemplatesCount < PLAN_LIMITS[userPlan].customTemplates;

    const t = (path: string) => {
        const keys = path.split('.');
        let current: any = translations;
        for (const key of keys) {
            if (current && current[key]) {
                current = current[key];
            } else {
                return path;
            }
        }
        return current;
    };

    const fetchProfile = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    if (authUser) {
                        await supabase.from('profiles').insert({ id: authUser.id });
                    }
                } else {
                    throw error;
                }
            }
            if (data) {
                const plan = data.plan === 'free' ? 'trial' : (data.plan || 'trial');
                setUserPlan(plan);
                const createdAt = authUser?.created_at || null;
                setProfileCreatedAt(createdAt);
                if (plan === 'trial') {
                    setTrialExpired(isTrialExpired(createdAt));
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('history')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            // Preserve pending items while merging fresh DB data
            setHistory(prev => {
                const pendingItems = prev.filter(h => h.id.startsWith('pending-'));
                return [...pendingItems, ...(data || [])];
            });
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            // Fetch all templates (system/public ones have user_id = null and is_public = true)
            // or are owned by current user
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const fetchedTemplates = data || [];
            setTemplates(fetchedTemplates);

            // Restore last used template, or default to first
            if (fetchedTemplates.length > 0 && !selectedTemplate) {
                const lastId = localStorage.getItem('remorphit_last_template');
                const last = lastId ? fetchedTemplates.find(t => t.id === lastId) : null;
                setSelectedTemplate(last || fetchedTemplates[0]);
            }
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    const extractContent = useCallback(async (tabId?: number) => {
        // Reset states
        setError(null);
        setSuccessMessage(null);

        setLoading(true);
        setGeneratedContent(null);
        try {
            let targetId = tabId;
            if (!targetId) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                targetId = tab?.id;
            }

            if (!targetId) {
                throw new Error("No active tab found");
            }

            // Send message to content script
            const response = await chrome.tabs.sendMessage(targetId, { action: 'EXTRACT_CONTENT' });

            if (response && response.success) {
                // Generate a content-based ID for posts without postId (Facebook)
                const contentId = response.data.postId ||
                    `${response.data.siteName}-${response.data.textContent?.substring(0, 50) || ''}-${response.data.images?.length || 0}`;

                // Safety check: for social feeds, if the content hasn't changed, don't trigger re-render
                // Skip this check for Facebook to always get fresh content
                const isFacebook = response.data.siteName === 'Facebook';
                if (!isFacebook && contentId === lastPostIdRef.current) {
                    setLoading(false);
                    return;
                }

                // Update post ID memory
                lastPostIdRef.current = contentId;

                // Safety check for YouTube/Twitter URLs...
                // Normalize URLs by removing query parameters before comparing to avoid stale matching issues
                const normalizeUrl = (u: string) => u.split(/[?#]/)[0];
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (activeTab?.url && normalizeUrl(response.data.url) !== normalizeUrl(activeTab.url) && !activeTab.url.includes('linkedin.com/feed') && !activeTab.url.includes('x.com') && !activeTab.url.includes('twitter.com') && !activeTab.url.includes('facebook.com') && !activeTab.url.includes('youtube.com') && !activeTab.url.includes('instagram.com')) {
                    setTimeout(() => extractContent(targetId), 1000);
                    return;
                }

                setArticle(response.data);
            } else {
                // Silently ignore "Failed to parse content" as requested
                if (response?.error === "Failed to parse content.") {
                    setArticle(null);
                } else {
                    throw new Error(response?.error || "Failed to extract content");
                }
            }
        } catch (err) {
            const errorMessage = (err as Error).message;

            if (errorMessage.includes("Receiving end does not exist") || errorMessage.includes("Could not establish connection")) {
                // Content script not loaded — try to inject it and retry once
                try {
                    let targetId = tabId;
                    if (!targetId) {
                        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                        targetId = tab?.id;
                    }
                    if (targetId) {
                        await chrome.scripting.executeScript({
                            target: { tabId: targetId },
                            files: ['src/content/index.ts'],
                        });
                        // Wait briefly for the script to initialize
                        await new Promise(r => setTimeout(r, 300));
                        const retryResponse = await chrome.tabs.sendMessage(targetId, { action: 'EXTRACT_CONTENT' });
                        if (retryResponse && retryResponse.success) {
                            lastPostIdRef.current = retryResponse.data.postId || '';
                            setArticle(retryResponse.data);
                            setLoading(false);
                            return;
                        }
                    }
                } catch {
                    // Injection failed — show error
                }
                setError(t('messages.extensionNotActive'));
                setArticle(null);
            } else {
                setError(errorMessage || t('messages.failedExtract'));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const sendToWebhook = (templateId: string, prompt: string, templateName: string) => {
        if (!article || !user) return;

        // Check generation limit
        if (userPlan === 'trial' && trialExpired) {
            setShowUpgradeModal(true);
            return;
        }
        if (history.length >= PLAN_LIMITS[userPlan].transformations) {
            setShowUpgradeModal(true);
            return;
        }

        // Capture current article for background processing
        const currentArticle = { ...article };
        const currentUser = user;

        setSendingCount(c => c + 1);
        setSuccessMessage(null);
        setError(null);

        // Add pending item to history
        const pendingId = `pending-${Date.now()}`;
        const pendingItem: HistoryItem = {
            id: pendingId,
            title: currentArticle.title || 'Generating...',
            content: '',
            template_name: templateName,
            url: currentArticle.url,
            created_at: new Date().toISOString(),
        };
        setHistory(prev => [pendingItem, ...prev]);

        // Fly-out animation on article card + gray out button
        setArticleFlyOut(true);
        setRemorphCooldown(true);
        setTimeout(() => setArticleFlyOut(false), 900);
        setTimeout(() => setRemorphCooldown(false), 4000);

        // Run in background (fire-and-forget, no await)
        (async () => {
            try {
                const result = await chrome.storage.sync.get(['n8nWebhookUrl']);
                let webhookUrl = result.n8nWebhookUrl;
                if (!webhookUrl) {
                    webhookUrl = 'https://n8n.srv987244.hstgr.cloud/webhook/74fa2e22-66bf-4f7d-8f2c-18c4f8d550b0';
                }

                const payload = {
                    ...currentArticle,
                    template: { id: templateId, prompt },
                    language: generationLang,
                    timestamp: new Date().toISOString()
                };

                const response = await chrome.runtime.sendMessage({
                    action: 'SEND_WEBHOOK',
                    url: webhookUrl,
                    payload
                });

                if (response && response.success) {
                    let resultData = Array.isArray(response.data) ? response.data[0] : response.data;
                    if (resultData && resultData.output) resultData = resultData.output;

                    if (resultData) {
                        if (resultData.error === true) {
                            setError(resultData.message || t('messages.generationError'));
                            return;
                        }

                        const contentToDisplay = {
                            title: resultData.title || currentArticle.title,
                            content: resultData.content || '',
                        };

                        // Save to DB
                        try {
                            const { data: histData, error: histError } = await supabase
                                .from('history')
                                .insert([{
                                    user_id: currentUser.id,
                                    title: contentToDisplay.title,
                                    content: contentToDisplay.content,
                                    template_name: templateName,
                                    url: currentArticle.url,
                                    tokens_used: resultData.totalTokens || 0
                                }])
                                .select()
                                .single();

                            if (histError) throw histError;

                            if (histData) {
                                setGeneratedContent({
                                    id: histData.id,
                                    title: contentToDisplay.title,
                                    content: contentToDisplay.content,
                                    created_at: histData.created_at
                                });
                                // Mark as new for highlight animation
                                setNewHistoryIds(prev => new Set(prev).add(histData.id));
                                setTimeout(() => {
                                    setNewHistoryIds(prev => {
                                        const next = new Set(prev);
                                        next.delete(histData.id);
                                        return next;
                                    });
                                }, 3000);
                            } else {
                                setGeneratedContent(contentToDisplay);
                            }

                            fetchHistory();
                        } catch (hErr) {
                            console.error('Error saving to history:', hErr);
                        }
                    } else {
                        setError(t('messages.noResponse'));
                    }
                } else {
                    throw new Error(`Webhook error: ${response.error}`);
                }
            } catch (err) {
                console.error(err);
                setError(t('messages.sendFailed').replace('{error}', (err as Error).message));
            } finally {
                setHistory(prev => prev.filter(h => h.id !== pendingId));
                setSendingCount(c => c - 1);
            }
        })();
    };

    const handleSaveEdit = async () => {
        if (!generatedContent) return;
        const updated = { ...generatedContent, content: editedContent };
        setGeneratedContent(updated);
        setIsEditing(false);
        // Update in DB if we have an ID
        if (generatedContent.id) {
            try {
                await supabase.from('history').update({ content: editedContent }).eq('id', generatedContent.id);
                fetchHistory();
            } catch (err) {
                console.error('Error saving edit:', err);
            }
        }
    };

    const handleChatSend = async () => {
        if (!chatInput.trim() || !generatedContent || chatLoading) return;
        const instruction = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: instruction }]);
        setChatLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat-refine', {
                body: {
                    content: generatedContent.content,
                    messages: chatMessages,
                    instruction,
                },
            });

            if (error) throw error;
            if (data?.content) {
                const updated = { ...generatedContent, content: data.content };
                setGeneratedContent(updated);
                setContentUpdated(true);
                setTimeout(() => setContentUpdated(false), 1500);
                setChatMessages(prev => [...prev, { role: 'assistant', content: '✓' }]);
                // Update in DB
                if (generatedContent.id) {
                    await supabase.from('history').update({ content: data.content }).eq('id', generatedContent.id);
                    fetchHistory();
                }
            }
        } catch (err) {
            console.error('Chat refine error:', err);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: could not refine content.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Reset chat when switching content
    useEffect(() => {
        setChatMessages([]);
        setChatInput('');
        setIsEditing(false);
    }, [generatedContent?.id]);

    useEffect(() => {
        // Check authentication first
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Store user info
                setUser(session.user);
                // If authenticated, extract content
                extractContent();
                fetchTemplates();
                fetchHistory();
                fetchProfile();
            }

            setAuthLoading(false);
        };

        checkAuth();

        // Listen for auth state changes (e.g., login from auth page)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    setUser(session.user);
                    extractContent();
                    fetchTemplates();
                    fetchHistory();
                    fetchProfile();
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [extractContent]);

    // Refresh profile when extension becomes visible (e.g. after Stripe payment)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && user) {
                fetchProfile();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [user]);

    // Ultra-reliable tab change detection
    const lastUrlRef = useRef<string>('');
    const lastPostIdRef = useRef<string>('');

    useEffect(() => {
        let extractionTimer: any = null;

        const triggerExtraction = (tabId: number, url: string) => {
            if (url === lastUrlRef.current) return;

            lastUrlRef.current = url;
            lastPostIdRef.current = '';

            if (extractionTimer) clearTimeout(extractionTimer);

            // Delay for YouTube SPA (DOM needs time to update after URL change)
            const delay = url.includes('youtube.com') ? 2500 : 500;
            extractionTimer = setTimeout(() => {
                extractContent(tabId);
            }, delay);
        };

        // PRIMARY: listen for tab changes via chrome.storage.session
        // Background script writes to storage.session on every tab update/activate.
        // storage.onChanged is the most reliable cross-context IPC in Chrome extensions.
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'session' && changes.activeTabChange?.newValue) {
                const { tabId, url } = changes.activeTabChange.newValue as { tabId: number; url: string; ts: number };
                if (tabId && url) {
                    triggerExtraction(tabId, url);
                }
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        // Listen for SCROLL_DETECTED from content scripts (social feed scrolling)
        const handleMessage = (message: any) => {
            if (message.action === 'SCROLL_DETECTED') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        lastPostIdRef.current = '';
                        extractContent(tabs[0].id);
                    }
                });
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        // BACKUP: poll active tab URL every 1s (no window filter for max compatibility)
        const urlPollInterval = setInterval(async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true });
                const tab = tabs[0];
                if (tab?.id && tab?.url && tab.url !== lastUrlRef.current) {
                    triggerExtraction(tab.id, tab.url);
                }
            } catch (e) { /* ignore */ }
        }, 1000);

        // Initial extraction on mount
        (async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true });
                const tab = tabs[0];
                if (tab?.id && tab?.url) {
                    lastUrlRef.current = tab.url;
                    extractContent(tab.id);
                }
            } catch (e) {
                console.error('[SidePanel] Initial extraction failed:', e);
            }
        })();

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
            chrome.runtime.onMessage.removeListener(handleMessage);
            clearInterval(urlPollInterval);
            if (extractionTimer) clearTimeout(extractionTimer);
        };
    }, [extractContent]);
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) {
                    setUser(data.user);
                    extractContent();
                    fetchTemplates();
                    fetchHistory();
                }
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                // Supabase returns a user with empty identities if email already exists
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setError(t('auth.alreadyRegistered'));
                    setIsLogin(true);
                } else if (data.user) {
                    setSuccessMessage(t('auth.confirmEmail'));
                }
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError(t('auth.email'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            setSuccessMessage(t('auth.resetPasswordSent'));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError(null);

        try {
            await signInWithGoogleViaExtension();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                extractContent();
                fetchTemplates();
                fetchHistory();
                fetchProfile();
            }
        } catch (err) {
            console.error('Google Auth error:', err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('templates')
                .insert([
                    {
                        user_id: user.id,
                        name: newTemplateName,
                        description: newTemplateDesc || '', // Optional
                        prompt: newTemplatePrompt,
                    }
                ])
                .select();

            if (error) throw error;

            if (data) {
                // @ts-ignore
                const newTpl = data[0];
                setTemplates([newTpl, ...templates]);
                setSelectedTemplate(newTpl);
            }

            setIsCreatingTemplate(false);
            setNewTemplateName('');
            setNewTemplateDesc('');
            setNewTemplatePrompt('');
            setSuccessMessage(t('messages.templateCreated'));
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('templates')
                .update({
                    name: newTemplateName,
                    description: newTemplateDesc,
                    prompt: newTemplatePrompt,
                })
                .eq('id', editingTemplate.id);

            if (error) throw error;

            const updatedTemplates = templates.map(t =>
                t.id === editingTemplate.id
                    ? { ...t, name: newTemplateName, description: newTemplateDesc, prompt: newTemplatePrompt }
                    : t
            );
            setTemplates(updatedTemplates);

            if (selectedTemplate?.id === editingTemplate.id) {
                setSelectedTemplate({ ...selectedTemplate, name: newTemplateName, description: newTemplateDesc, prompt: newTemplatePrompt });
            }

            setEditingTemplate(null);
            setNewTemplateName('');
            setNewTemplateDesc('');
            setNewTemplatePrompt('');
            setSuccessMessage(t('messages.templateUpdated'));
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    const handleCheckout = async (plan: 'starter' | 'pro') => {
        const priceIds = {
            starter: {
                monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID,
                yearly: import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID,
            },
            pro: {
                monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID,
                yearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID,
            },
        };
        const priceId = priceIds[plan][billingPeriod];
        if (!priceId || !user) return;

        setCheckoutLoading(plan);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: { priceId, uid: user.id, email: user.email },
            });
            if (error) throw error;
            if (data?.url && data.url.startsWith('https://')) {
                chrome.tabs.create({ url: data.url });
                setShowUpgradeModal(false);
            }
        } catch (err) {
            console.error('Checkout error:', err);
            setError((err as Error).message);
        } finally {
            setCheckoutLoading(null);
        }
    };
    const openCustomerPortal = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session');
            if (error) throw error;
            if (data?.url && data.url.startsWith('https://')) chrome.tabs.create({ url: data.url });
        } catch (err) {
            console.error('Portal session error:', err);
            setShowUpgradeModal(true);
        }
    };
    const handleDeleteTemplate = async (id: string) => {
        if (!confirm(t('templates.confirmDelete'))) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== id));
            setSuccessMessage(t('messages.templateDeleted'));
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        if (!confirm(t('history.confirmDelete'))) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('history')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setHistory(history.filter(h => h.id !== id));
            setSuccessMessage(t('messages.templateUpdated')); // Reuse for simplicity or add specific msg
            setTimeout(() => setSuccessMessage(null), 3000);
            if (generatedContent?.id === id) {
                setGeneratedContent(null);
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-remix-600"></div>
            </div>
        );
    }

    // Auth form if not logged in
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                            <img src="/RedIcon512.png" alt="ReMorphIt" className="w-8 h-8" /> ReMorphIt
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {isLogin ? t('auth.sublogin') : t('auth.subsignup')}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remix-500 focus:border-transparent outline-none text-sm"
                                placeholder="vous@exemple.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-remix-500 focus:border-transparent outline-none text-sm"
                                placeholder="••••••••"
                            />
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="mt-1 text-xs text-remix-600 hover:text-remix-800 font-medium"
                                >
                                    {t('auth.forgotPassword')}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-2 rounded-lg text-xs border border-red-100">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-50 text-green-700 p-2 rounded-lg text-xs border border-green-100">
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-remix-600 text-white py-2.5 rounded-lg font-semibold hover:bg-remix-700 transition disabled:opacity-50 text-sm"
                        >
                            {loading ? t('auth.loading') : isLogin ? t('auth.login') : t('auth.signup')}
                        </button>
                    </form>

                    <div className="mt-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white text-gray-500">{t('auth.orContinueWith')}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleAuth}
                            disabled={loading}
                            className="mt-3 w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 text-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
                    </div>

                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-remix-600 hover:text-remix-800 font-medium"
                        >
                            {isLogin ? t('auth.noAccount') + ' ' + t('auth.signup') : t('auth.hasAccount') + ' ' + t('auth.login')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (generatedContent) {
        return (
            <div className="h-screen bg-gray-50 flex flex-col font-sans">
                <header className="px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between">
                    <button
                        onClick={() => { setGeneratedContent(null); setIsEditing(false); setChatMessages([]); }}
                        className="text-sm font-medium text-remix-600 hover:text-remix-800 flex items-center gap-1"
                    >
                        ← {t('general.back')}
                    </button>
                    <h1 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{generatedContent.title || t('tabs.history')}</h1>
                    <div className="flex items-center gap-1">
                        {!isEditing && (
                            <button
                                onClick={() => { setEditedContent(generatedContent.content); setIsEditing(true); }}
                                className="p-1.5 text-gray-400 hover:text-remix-600 transition"
                                title="Edit"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                        )}
                        {generatedContent.id && (
                            <button
                                onClick={() => handleDeleteHistory(generatedContent.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition"
                                title={t('templates.delete')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 pb-2">
                    {/* Content area */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {isEditing ? (
                            <div className="p-3">
                                <textarea
                                    value={editedContent}
                                    onChange={e => setEditedContent(e.target.value)}
                                    className="w-full min-h-[200px] text-sm text-gray-800 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-remix-400 resize-y"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 bg-remix-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-remix-700 transition"
                                    >
                                        {t('general.save')}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                                    >
                                        {t('general.cancel')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`generated-content text-sm text-gray-800 p-4 transition-all duration-700 ${contentUpdated ? 'content-flash' : ''}`}
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                        /<[a-z][\s\S]*>/i.test(generatedContent.content)
                                            ? generatedContent.content
                                            : generatedContent.content
                                                .replace(/\n\n/g, '</p><p>')
                                                .replace(/^(.+)/, '<p>$1</p>')
                                                .replace(/<p><\/p>/g, ''),
                                        { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'blockquote', 'span', 'div'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] }
                                    )
                                }}
                            />
                        )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                        <div className="mt-3 flex gap-2 relative">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedContent.content);
                                    setSuccessMessage(t('history.copied'));
                                    setTimeout(() => setSuccessMessage(null), 2000);
                                }}
                                className="flex-1 bg-white text-remix-600 border border-remix-200 py-2 rounded-xl text-xs font-bold hover:bg-remix-50 transition flex items-center justify-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                {t('general.copyHtml')}
                            </button>
                            <button
                                onClick={() => setShowShareMenu(!showShareMenu)}
                                className="flex-1 bg-remix-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-remix-700 transition flex items-center justify-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                                {t('general.share')}
                            </button>

                            {showShareMenu && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-100 p-2 z-20 shadow-lg">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2 py-1 border-b border-gray-50">{t('general.sendTo')}</div>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button
                                            onClick={() => {
                                                const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                                chrome.tabs.create({ url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}` });
                                                setShowShareMenu(false);
                                            }}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                        >
                                            <span className="text-base text-blue-600">LinkedIn</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                                chrome.tabs.create({ url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` });
                                                setShowShareMenu(false);
                                            }}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                        >
                                            <span className="text-base text-gray-900">Twitter (X)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                                chrome.tabs.create({ url: `mailto:?subject=${encodeURIComponent(generatedContent.title || 'ReMorphIt Content')}&body=${encodeURIComponent(text)}` });
                                                setShowShareMenu(false);
                                            }}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                        >
                                            <span className="text-base text-red-500">Email</span>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                                navigator.clipboard.writeText(text);
                                                setSuccessMessage(t('history.copied'));
                                                setTimeout(() => setSuccessMessage(null), 2000);
                                                setShowShareMenu(false);
                                            }}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                        >
                                            <span className="text-base text-remix-600">{t('general.shareOther')}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-2 text-center text-xs text-green-600 font-medium">
                            {successMessage}
                        </div>
                    )}

                    {/* Chat messages */}
                    {chatMessages.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                                        msg.role === 'user'
                                            ? 'bg-remix-600 text-white rounded-br-sm'
                                            : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-xl rounded-bl-sm text-xs">
                                        <span className="animate-pulse">...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </main>

                {/* Chat input - fixed at bottom */}
                {!isEditing && (
                    <div className="px-4 py-3 bg-white border-t border-gray-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                                placeholder="Refine: 'make it shorter', 'add emojis'..."
                                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-remix-400"
                                disabled={chatLoading}
                            />
                            <button
                                onClick={handleChatSend}
                                disabled={chatLoading || !chatInput.trim()}
                                className="bg-remix-600 text-white px-3 py-2 rounded-xl hover:bg-remix-700 transition disabled:opacity-40"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-end">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => extractContent()}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                        title={t('history.refresh')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                    </button>
                </div>
            </header>

            <div className="flex bg-white border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'templates' ? 'border-remix-600 text-remix-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('tabs.templates')}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition relative ${activeTab === 'history' ? 'border-remix-600 text-remix-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('tabs.history')}
                    {sendingCount > 0 && (
                        <span className="absolute top-1.5 ml-0.5 inline-block h-2 w-2 rounded-full bg-remix-500 animate-pulse" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('account')}
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'account' ? 'border-remix-600 text-remix-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('tabs.account')}
                </button>
            </div>

            <main className="flex-1 p-4 overflow-y-auto">
                {/* Content Area */}
                {activeTab === 'templates' && (
                    <>
                        {!article ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6 animate-in fade-in duration-700">
                                <div className="relative mb-12">
                                    {/* Pulse effect */}
                                    {loading && <div className="absolute inset-0 bg-remix-500 rounded-full animate-radar opacity-20"></div>}
                                    {loading && <div className="absolute inset-0 bg-remix-400 rounded-full animate-radar opacity-10 [animation-delay:1s]"></div>}

                                    {/* Chameleon eye */}
                                    <div className="relative h-24 w-24 rounded-full flex items-center justify-center overflow-hidden z-10 transition-transform hover:scale-105 duration-300">
                                        <svg viewBox="0 0 96 96" className="w-24 h-24">
                                            <circle cx="48" cy="48" r="46" fill="white" />
                                            <circle cx="48" cy="48" r="28" fill="#dc2626" opacity="0.15" />
                                            {/* Pupil group */}
                                            <g>
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="translate"
                                                    values="0,0; 12,-6; 8,10; -10,4; -6,-12; 14,2; -4,14; -12,-8; 6,-10; 0,0"
                                                    keyTimes="0;0.1;0.2;0.35;0.5;0.6;0.72;0.82;0.92;1"
                                                    dur="3.5s"
                                                    repeatCount="indefinite"
                                                    calcMode="spline"
                                                    keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
                                                />
                                                <circle cx="48" cy="48" r="14" fill="#dc2626" />
                                                <circle cx="48" cy="48" r="7" fill="#1a1a1a" />
                                                <circle cx="43" cy="43" r="3" fill="white" opacity="0.7" />
                                            </g>
                                            {/* Eyelid blink - top */}
                                            <ellipse cx="48" cy="-44" rx="50" ry="46" fill="#f3f4f6">
                                                <animate
                                                    attributeName="cy"
                                                    values="-44;-44;-44;48;-44;-44;-44;-44;-44;-44;48;48;-44;-44"
                                                    keyTimes="0;0.28;0.30;0.34;0.38;0.40;0.64;0.66;0.70;0.72;0.74;0.76;0.80;1"
                                                    dur="4.5s"
                                                    repeatCount="indefinite"
                                                />
                                            </ellipse>
                                            {/* Eyelid blink - bottom */}
                                            <ellipse cx="48" cy="140" rx="50" ry="46" fill="#f3f4f6">
                                                <animate
                                                    attributeName="cy"
                                                    values="140;140;140;48;140;140;140;140;140;140;48;48;140;140"
                                                    keyTimes="0;0.28;0.30;0.34;0.38;0.40;0.64;0.66;0.70;0.72;0.74;0.76;0.80;1"
                                                    dur="4.5s"
                                                    repeatCount="indefinite"
                                                />
                                            </ellipse>
                                        </svg>
                                    </div>
                                </div>

                                <h3 className="text-gray-900 font-bold text-lg mb-2">
                                    {loading ? t('scanner.scanning') : t('scanner.waiting')}
                                </h3>

                                <p className="text-gray-500 text-sm max-w-xs leading-relaxed mb-8">
                                    {loading
                                        ? t('scanner.analyzing')
                                        : t('scanner.navigate')}
                                </p>

                                {(!loading || error) && (
                                    <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                        <button
                                            onClick={() => extractContent()}
                                            className="bg-remix-600 text-white py-2.5 rounded-xl font-bold hover:bg-remix-700 transition  flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                                            {error ? t('scanner.retry') : t('scanner.scanPage')}
                                        </button>
                                        <button
                                            onClick={() => chrome.tabs.reload()}
                                            className="text-gray-400 text-xs font-semibold hover:text-remix-600 transition"
                                        >
                                            {error ? t('scanner.refreshPage') : t('scanner.manualDetection')}
                                        </button>
                                    </div>
                                )}

                                {error && !loading && (
                                    <div className="mt-8 p-3 bg-amber-50 rounded-xl text-[11px] text-amber-700 border border-amber-100 max-w-[240px] leading-relaxed ">
                                        <p className="font-bold flex items-center gap-1.5 mb-1">
                                            <span className="text-sm">💡</span> {t('scanner.note')}
                                        </p>
                                        {error}
                                    </div>
                                )}

                                {/* Supported platforms */}
                                <div className="mt-10 w-full max-w-[280px]">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-3 text-center">{t('scanner.supportedPlatforms')}</p>
                                    <div className="flex items-center justify-center gap-4 flex-wrap">
                                        {/* YouTube */}
                                        <div className="group relative">
                                            <svg className="w-6 h-6 text-gray-300 hover:text-[#FF0000] transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                        </div>
                                        {/* X (Twitter) */}
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-gray-300 hover:text-black transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                        </div>
                                        {/* Instagram */}
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-gray-300 hover:text-[#E4405F] transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                                        </div>
                                        {/* Facebook */}
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-gray-300 hover:text-[#1877F2] transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                        </div>
                                        {/* LinkedIn */}
                                        <div className="group relative">
                                            <svg className="w-5 h-5 text-gray-300 hover:text-[#0A66C2] transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                        </div>
                                        {/* News / Globe */}
                                        <div className="group relative flex items-center gap-1">
                                            <svg className="w-5 h-5 text-gray-300 hover:text-remix-500 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                            <span className="text-[10px] text-gray-300 font-medium">{t('scanner.andMore')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-500">
                                {successMessage && (
                                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-100 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        {successMessage}
                                    </div>
                                )}

                                {/* Modal d'upgrade moved outside tabs */}
                                {/* Barre d'utilisation */}
                                <div className="mb-4 bg-white p-3 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('templates.usage')}</span>
                                            {userPlan === 'trial' && (
                                                <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold">
                                                    {trialExpired ? t('account.trialExpiredLabel') : t('account.trialDaysLeft').replace('{days}', String(Math.max(0, TRIAL_DURATION_DAYS - Math.floor((Date.now() - new Date(profileCreatedAt || '').getTime()) / (24 * 60 * 60 * 1000)))))}
                                                </span>
                                            )}
                                            {userPlan !== 'pro' && (
                                                <button
                                                    onClick={() => setShowUpgradeModal(true)}
                                                    className="text-[9px] bg-remix-50 text-remix-600 px-1.5 py-0.5 rounded font-bold hover:bg-remix-600 hover:text-white transition"
                                                >
                                                    {t('templates.upgrade')}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-remix-600">{history.length}/{PLAN_LIMITS[userPlan].transformations}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${history.length >= PLAN_LIMITS[userPlan].transformations ? 'bg-red-500' : 'bg-remix-600'}`}
                                            style={{ width: `${Math.min((history.length / PLAN_LIMITS[userPlan].transformations) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    {(trialExpired || history.length >= PLAN_LIMITS[userPlan].transformations) && (
                                        <p className="text-[10px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            {trialExpired ? t('templates.trialExpired') : t('templates.limitReached')}
                                        </p>
                                    )}
                                </div>

                                <div className={`bg-white p-4 rounded-lg border border-gray-100 mb-6 relative overflow-hidden group transition-all ${articleFlyOut ? 'article-fly-out' : ''}`}>
                                    {userPlan !== 'trial' && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-remix-600 text-[8px] font-bold text-white px-3 py-1 rotate-45 translate-x-4 -translate-y-1  uppercase tracking-tighter">{userPlan === 'pro' ? t('templates.proBadge') : t('templates.starterBadge')}</div>
                                        </div>
                                    )}
                                    <h2 className="font-semibold text-gray-900 leading-tight mb-2">
                                        {article.title}
                                    </h2>
                                    {article.hasVideo && (
                                        <div className="mb-2 inline-flex items-center gap-1.5 bg-remix-50 text-remix-700 px-2 py-1 rounded-md text-xs font-medium border border-remix-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                                            {t('templates.videoDetected')}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 truncate max-w-[150px]">
                                            {article.siteName || new URL(article.url).hostname}
                                        </span>
                                        <span>•</span>
                                        <span>{article.textContent.split(/\s+/).length} {t('templates.words')}</span>
                                    </div>

                                    {/* Display media: video thumbnail or images */}
                                    {(article.video?.thumbnail || article.images) && (
                                        <div className="mb-3">
                                            {article.video?.thumbnail && (
                                                <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
                                                    <img
                                                        src={article.video.thumbnail}
                                                        alt="Video thumbnail"
                                                        className="w-full h-auto object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                        <div className="bg-white/90 rounded-full p-3 group-hover:scale-110 transition">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-remix-600">
                                                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {article.images && article.images.length > 0 && !article.video?.thumbnail && (
                                                <div className={`grid gap-2 ${article.images.length === 1 ? 'grid-cols-1' : article.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                                    {article.images.slice(0, 4).map((img: string, idx: number) => (
                                                        <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
                                                            <img
                                                                src={img}
                                                                alt={`Image ${idx + 1}`}
                                                                className="w-full h-full object-cover hover:scale-105 transition"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                            {idx === 3 && article.images && article.images.length > 4 && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                    <span className="text-white font-bold text-xl">+{article.images.length - 4}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {article.excerpt}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {!isCreatingTemplate && (
                                        <div className="flex gap-2 relative">
                                            <button
                                                onClick={() => selectedTemplate && sendToWebhook(selectedTemplate.id, selectedTemplate.prompt, selectedTemplate.name)}
                                                disabled={!selectedTemplate || remorphCooldown}
                                                className={`flex-1 py-3 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ${remorphCooldown ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-remix-600 text-white hover:bg-remix-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100'}`}
                                            >
                                                <img src="/WhiteIcon512.png" alt="" style={{width: '20px', height: '20px', opacity: remorphCooldown ? 0.4 : 1}} /> {remorphCooldown ? t('templates.transforming') : t('templates.transform')}
                                            </button>
                                            <button
                                                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                                className={`px-3 rounded-xl border transition ${showTemplateSelector ? 'bg-remix-50 border-remix-200 text-remix-600' : 'bg-white border-gray-200 text-gray-400 hover:border-remix-300 hover:text-remix-500'}`}
                                                title={t('templates.chooseTemplate')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                                            </button>

                                            {showTemplateSelector && (
                                                <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-xl border border-gray-200 border border-gray-100 p-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-gray-50">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('templates.chooseTemplate')}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (!canCreateTemplate) {
                                                                    setShowUpgradeModal(true);
                                                                } else {
                                                                    setIsCreatingTemplate(true);
                                                                }
                                                                setShowTemplateSelector(false);
                                                            }}
                                                            className="text-[10px] font-bold text-remix-600 hover:text-remix-800 flex items-center gap-1"
                                                        >
                                                            {!canCreateTemplate && <span>🔒</span>}
                                                            {t('templates.new')}
                                                        </button>
                                                    </div>
                                                    <div className="max-h-[300px] overflow-y-auto space-y-4 px-1 pb-2">
                                                        {/* Section System Templates */}
                                                        <div>
                                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{t('templates.systemTemplates')}</div>
                                                            {templates.filter(templateitem => templateitem.is_public).map(templateitem => (
                                                                <div key={templateitem.id} className={`w-full p-2 rounded-lg transition mb-1 flex items-center justify-between group ${selectedTemplate?.id === templateitem.id ? 'bg-remix-50 border border-remix-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedTemplate(templateitem);
                                                                            localStorage.setItem('remorphit_last_template', templateitem.id);
                                                                            setShowTemplateSelector(false);
                                                                        }}
                                                                        className="flex-1 text-left min-w-0"
                                                                    >
                                                                        <div className="font-semibold text-xs text-gray-900 truncate flex items-center gap-1.5">
                                                                            <span>🌍</span>
                                                                            {templateitem.name}
                                                                        </div>
                                                                        {templateitem.description && <div className="text-[10px] text-gray-500 truncate">{templateitem.description}</div>}
                                                                    </button>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!canCreateTemplate) {
                                                                                    setShowUpgradeModal(true);
                                                                                } else {
                                                                                    setIsCreatingTemplate(true);
                                                                                    setNewTemplateName(`${templateitem.name} (${t('templates.duplicate')})`);
                                                                                    setNewTemplateDesc(templateitem.description || '');
                                                                                    setNewTemplatePrompt(templateitem.prompt);
                                                                                }
                                                                                setShowTemplateSelector(false);
                                                                            }}
                                                                            className="p-1 text-gray-300 hover:text-remix-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            title={t('templates.duplicate')}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                                        </button>
                                                                        {selectedTemplate?.id === templateitem.id && (
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-remix-600 ml-1"><polyline points="20 6 9 17 4 12" /></svg>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Section User Templates */}
                                                        <div>
                                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{t('templates.userTemplates')}</div>
                                                            {templates.filter(templateitem => !templateitem.is_public && templateitem.user_id === user?.id).length === 0 ? (
                                                                <div className="text-[10px] text-gray-400 italic px-2 py-1">{t('templates.noUserTemplates')}</div>
                                                            ) : (
                                                                templates.filter(templateitem => !templateitem.is_public && templateitem.user_id === user?.id).map(templateitem => (
                                                                    <div key={templateitem.id} className={`w-full p-2 rounded-lg transition mb-1 flex items-center justify-between group ${selectedTemplate?.id === templateitem.id ? 'bg-remix-50 border border-remix-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedTemplate(templateitem);
                                                                                localStorage.setItem('remorphit_last_template', templateitem.id);
                                                                                setShowTemplateSelector(false);
                                                                            }}
                                                                            className="flex-1 text-left min-w-0"
                                                                        >
                                                                            <div className="font-semibold text-xs text-gray-900 truncate flex items-center gap-1.5">
                                                                                <span>👤</span>
                                                                                {templateitem.name}
                                                                            </div>
                                                                            {templateitem.description && <div className="text-[10px] text-gray-500 truncate">{templateitem.description}</div>}
                                                                        </button>

                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingTemplate(templateitem);
                                                                                    setNewTemplateName(templateitem.name);
                                                                                    setNewTemplateDesc(templateitem.description || '');
                                                                                    setNewTemplatePrompt(templateitem.prompt);
                                                                                    setShowTemplateSelector(false);
                                                                                }}
                                                                                className="p-1 text-gray-300 hover:text-remix-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                title={t('templates.modify')}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (!canCreateTemplate) {
                                                                                        setShowUpgradeModal(true);
                                                                                    } else {
                                                                                        setIsCreatingTemplate(true);
                                                                                        setNewTemplateName(`${templateitem.name} (${t('templates.duplicate')})`);
                                                                                        setNewTemplateDesc(templateitem.description || '');
                                                                                        setNewTemplatePrompt(templateitem.prompt);
                                                                                    }
                                                                                    setShowTemplateSelector(false);
                                                                                }}
                                                                                className="p-1 text-gray-300 hover:text-remix-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                title={t('templates.duplicate')}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteTemplate(templateitem.id);
                                                                                }}
                                                                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                title={t('templates.delete')}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                            </button>
                                                                            {selectedTemplate?.id === templateitem.id && (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-remix-600 ml-1"><polyline points="20 6 9 17 4 12" /></svg>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedTemplate && !isCreatingTemplate && !editingTemplate && !showTemplateSelector && (
                                        <div className="bg-remix-50/50 rounded-lg p-2 border border-remix-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="bg-white p-1.5 rounded-md  border border-remix-100">
                                                    <span className="text-sm">📝</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold text-remix-400 uppercase tracking-tight leading-none">{t('templates.activeTemplate')}</div>
                                                    <div className="text-xs font-semibold text-gray-700 truncate">{selectedTemplate.name}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowTemplateSelector(true)}
                                                className="text-[10px] font-bold text-remix-600 hover:underline"
                                            >
                                                {t('templates.modify')}
                                            </button>
                                        </div>
                                    )}

                                    {(isCreatingTemplate || editingTemplate) && (
                                        <form
                                            onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                                            className="bg-white p-4 rounded-xl border border-gray-100  space-y-4 animate-in slide-in-from-bottom-2 duration-200"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="text-sm font-bold text-gray-900">
                                                    {editingTemplate ? t('templates.editTemplate') : t('templates.createTemplate')}
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCreatingTemplate(false);
                                                        setEditingTemplate(null);
                                                        setNewTemplateName('');
                                                        setNewTemplateDesc('');
                                                        setNewTemplatePrompt('');
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-gray-600"
                                                >
                                                    {t('templates.cancel')}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('templates.templateName')}</label>
                                                    <input
                                                        type="text"
                                                        value={newTemplateName}
                                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                                        required
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-remix-500 focus:bg-white outline-none transition"
                                                        placeholder={t('templates.namePlaceholder')}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('templates.templateDesc')}</label>
                                                    <input
                                                        type="text"
                                                        value={newTemplateDesc}
                                                        onChange={(e) => setNewTemplateDesc(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-remix-500 focus:bg-white outline-none transition"
                                                        placeholder={t('templates.descPlaceholder')}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('templates.templatePrompt')}</label>
                                                    <textarea
                                                        value={newTemplatePrompt}
                                                        onChange={(e) => setNewTemplatePrompt(e.target.value)}
                                                        required
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-remix-500 focus:bg-white outline-none transition h-24 resize-none"
                                                        placeholder={t('templates.promptPlaceholder')}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-remix-600 text-white py-2.5 rounded-lg font-bold hover:bg-remix-700 transition "
                                            >
                                                {editingTemplate ? t('templates.update') : t('templates.create')}
                                            </button>
                                        </form>
                                    )}
                                </div>

                                {/* Supported platforms footer */}
                                <div className="pt-4 mt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-center gap-3">
                                        {/* YouTube */}
                                        <svg className="w-4 h-4 text-gray-200 hover:text-[#FF0000] transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                        {/* X */}
                                        <svg className="w-3.5 h-3.5 text-gray-200 hover:text-black transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                        {/* Instagram */}
                                        <svg className="w-3.5 h-3.5 text-gray-200 hover:text-[#E4405F] transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                                        {/* Facebook */}
                                        <svg className="w-3.5 h-3.5 text-gray-200 hover:text-[#1877F2] transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                        {/* LinkedIn */}
                                        <svg className="w-3.5 h-3.5 text-gray-200 hover:text-[#0A66C2] transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                        {/* Globe */}
                                        <svg className="w-3.5 h-3.5 text-gray-200 hover:text-remix-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                        <span className="text-[9px] text-gray-300 font-medium">{t('scanner.andMore')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!loading && activeTab === 'history' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('history.title')}
                            </h3>
                            <button
                                onClick={fetchHistory}
                                className="text-xs text-remix-600 hover:text-remix-800"
                                title={t('history.refresh')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="text-center py-10 text-gray-400">{t('auth.loading')}</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                                <p className="text-sm">{t('history.noHistory')}</p>
                            </div>
                        ) : (
                            history.map(item => {
                                const isPending = item.id.startsWith('pending-');
                                const isNew = newHistoryIds.has(item.id);
                                return (
                                <div key={item.id} className={`rounded-xl border overflow-hidden relative group transition-all duration-500 ${isPending ? 'bg-white border-remix-200 animate-pulse' : isNew ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white border-gray-100'}`}>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${isPending ? 'bg-remix-100 text-remix-500' : 'bg-remix-50 text-remix-600'}`}>
                                                {isPending ? t('templates.transforming') : item.template_name}
                                            </span>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                {isPending ? (
                                                    <svg className="animate-spin h-3 w-3 text-remix-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                ) : isNew ? (
                                                    <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full animate-bounce">NEW</span>
                                                ) : new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1">{item.title}</h4>
                                        {isPending ? (
                                            <div className="flex gap-1 mb-3">
                                                <div className="h-2 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                                                <div className="h-2 bg-gray-200 rounded-full w-1/4 animate-pulse"></div>
                                            </div>
                                        ) : (
                                        <div className="text-xs text-gray-600 line-clamp-3 mb-3 bg-gray-50 p-2 rounded">
                                            {item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                                        </div>
                                        )}
                                        {!isPending && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setGeneratedContent(item);
                                                }}
                                                className="text-xs font-medium text-remix-600 hover:text-remix-800"
                                            >
                                                {t('history.view')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(item.content);
                                                    setSuccessMessage(t('history.copied'));
                                                    setTimeout(() => setSuccessMessage(null), 2000);
                                                }}
                                                className="text-xs font-medium text-gray-500 hover:text-gray-700"
                                            >
                                                {t('account.copy')}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const text = item.content.replace(/<[^>]*>/g, '');
                                                    if (navigator.share) {
                                                        try {
                                                            await navigator.share({
                                                                title: item.title,
                                                                text: text,
                                                                url: item.url
                                                            });
                                                        } catch (err) {
                                                            console.error('Error sharing:', err);
                                                        }
                                                    } else {
                                                        navigator.clipboard.writeText(text);
                                                        setSuccessMessage(t('history.copied'));
                                                        setTimeout(() => setSuccessMessage(null), 2000);
                                                    }
                                                }}
                                                className="text-xs font-medium text-gray-500 hover:text-remix-600 flex items-center gap-1"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                                                {t('general.share')}
                                            </button>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-medium text-gray-500 hover:text-remix-600 flex items-center gap-1"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                {t('history.source')}
                                            </a>
                                        </div>
                                        )}
                                    </div>
                                    {!isPending && (
                                    <button
                                        onClick={() => handleDeleteHistory(item.id)}
                                        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition z-10 bg-white/80"
                                        title={t('templates.delete')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    </button>
                                    )}
                                </div>
                            );})
                        )}
                    </div>
                )}

                {!loading && activeTab === 'account' && user && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-2xl  border border-gray-100 overflow-hidden">
                            <div className="bg-remix-600 p-6 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl border border-white/30">
                                        {user.email?.[0].toUpperCase() || '👤'}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</h3>
                                        <p className="text-remix-100 text-sm">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('account.currentPlan')}</h4>
                                    <div className={`flex items-center justify-between p-4 rounded-xl border ${userPlan === 'pro' ? 'bg-remix-50 border-remix-200' : userPlan === 'starter' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl ${userPlan === 'pro' ? 'bg-remix-600 text-white' : userPlan === 'starter' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {userPlan === 'pro' ? '🚀' : userPlan === 'starter' ? '💡' : '🎁'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 capitalize">
                                                    {userPlan === 'pro' ? t('account.proPlan') : userPlan === 'starter' ? t('account.starterPlan') : t('account.trialPlan')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {t('account.generationsUsed').replace('{count}', history.length.toString()).replace('{limit}', PLAN_LIMITS[userPlan].transformations.toString())}
                                                </div>
                                            </div>
                                        </div>
                                        {userPlan === 'trial' ? (
                                            <button
                                                onClick={() => setShowUpgradeModal(true)}
                                                className="bg-remix-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-remix-700 transition"
                                            >
                                                {t('account.upgrade')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={openCustomerPortal}
                                                className="bg-white text-remix-600 border border-remix-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-remix-50 transition"
                                            >
                                                {t('account.manage')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('account.statsTitle')}</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('account.generations')}</div>
                                            <div className="text-lg font-bold text-gray-900">{history.length}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">{t('account.generationLanguage')}</span>
                                        <select
                                            value={generationLang}
                                            onChange={e => changeGenerationLang(e.target.value)}
                                            className="text-xs font-bold text-remix-600 bg-gray-100 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-remix-400 outline-none cursor-pointer"
                                        >
                                            {GENERATION_LANGUAGES.map(l => (
                                                <option key={l.code} value={l.code}>{l.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            await supabase.auth.signOut();
                                            setUser(null);
                                            setArticle(null);
                                            setGeneratedContent(null);
                                            setHistory([]);
                                            setTemplates([]);
                                            setShowUpgradeModal(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                        {t('account.logout')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-remix-50 rounded-2xl p-4 border border-remix-100">
                            <h4 className="text-[10px] font-bold text-remix-400 uppercase tracking-widest mb-2">{t('account.helpTitle')}</h4>
                            <p className="text-xs text-remix-700 leading-relaxed mb-3">
                                {t('account.helpDesc')}
                            </p>
                            <a href="mailto:contact@remorph.it" className="text-xs font-bold text-remix-600 hover:text-remix-800 flex items-center gap-1">
                                {t('account.contactSupport')} <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </a>
                        </div>
                    </div>
                )}
            </main>

                {/* Modal d'upgrade - pricing view */}
                {showUpgradeModal && (
                    <div className="fixed inset-0 z-[100] flex flex-col">
                        <div className="absolute inset-0 bg-remix-900/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}></div>
                        <div className="relative flex-1 flex flex-col bg-white w-full overflow-y-auto animate-in slide-in-from-bottom duration-300">
                            {/* Header */}
                            <div className="bg-remix-600 px-4 py-5 text-white text-center relative">
                                <button onClick={() => setShowUpgradeModal(false)} className="absolute top-3 right-3 text-white/70 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                                <h3 className="text-lg font-bold mb-1">{t('upgrade.modalTitle')}</h3>
                                <p className="text-remix-100 text-xs">
                                    {trialExpired ? t('upgrade.trialExpiredDesc') : t('upgrade.modalDesc')}
                                </p>
                                {/* Billing toggle */}
                                <div className="flex justify-center mt-4">
                                    <div className="bg-white/20 backdrop-blur-sm p-1 rounded-lg flex">
                                        <button
                                            onClick={() => setBillingPeriod('monthly')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${billingPeriod === 'monthly' ? 'bg-white text-remix-600' : 'text-white/80 hover:text-white'}`}
                                        >
                                            {t('upgrade.monthly')}
                                        </button>
                                        <button
                                            onClick={() => setBillingPeriod('yearly')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${billingPeriod === 'yearly' ? 'bg-white text-remix-600' : 'text-white/80 hover:text-white'}`}
                                        >
                                            {t('upgrade.yearly')}
                                            <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                {t('upgrade.savePercent').replace('{percent}', '27')}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Plan cards */}
                            <div className="p-4 space-y-4 flex-1">
                                {/* Starter Plan */}
                                <div className={`rounded-2xl border overflow-hidden ${userPlan === 'starter' ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-base font-bold text-gray-900">{t('upgrade.starterName')}</h4>
                                            {userPlan === 'starter' && (
                                                <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">{t('upgrade.currentPlan')}</span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="text-3xl font-black text-gray-900">
                                                {billingPeriod === 'monthly' ? t('upgrade.starterPrice').monthly : t('upgrade.starterPrice').yearly}
                                            </span>
                                            <span className="text-sm text-gray-400 font-medium">
                                                EUR{billingPeriod === 'monthly' ? t('upgrade.perMonth') : t('upgrade.perYear')}
                                            </span>
                                        </div>
                                        <ul className="space-y-2 mb-4">
                                            {['starterTransformations', 'starterTemplates', 'starterHistory', 'starterChat'].map(key => (
                                                <li key={key} className="flex items-center gap-2 text-xs text-gray-600">
                                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                    {t(`upgrade.features.${key}`)}
                                                </li>
                                            ))}
                                        </ul>
                                        {userPlan === 'starter' ? (
                                            <button
                                                onClick={openCustomerPortal}
                                                className="w-full py-2.5 rounded-xl text-sm font-bold border border-blue-300 text-blue-600 hover:bg-blue-50 transition"
                                            >
                                                {t('account.manage')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleCheckout('starter')}
                                                disabled={!!checkoutLoading}
                                                className="w-full py-2.5 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-50"
                                            >
                                                {checkoutLoading === 'starter' ? '...' : t('upgrade.subscribe')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Pro Plan */}
                                <div className={`rounded-2xl border overflow-hidden relative ${userPlan === 'pro' ? 'border-remix-300 bg-remix-50/50' : 'border-remix-200 bg-white ring-2 ring-remix-500'}`}>
                                    {userPlan !== 'pro' && (
                                        <div className="absolute top-0 right-4 bg-remix-600 text-white text-[10px] font-bold px-3 py-1 rounded-b-lg">
                                            {t('upgrade.popular')}
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-base font-bold text-gray-900">{t('upgrade.proName')}</h4>
                                            {userPlan === 'pro' && (
                                                <span className="text-[10px] font-bold bg-remix-600 text-white px-2 py-0.5 rounded-full">{t('upgrade.currentPlan')}</span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-3">
                                            <span className="text-3xl font-black text-gray-900">
                                                {billingPeriod === 'monthly' ? t('upgrade.proPrice').monthly : t('upgrade.proPrice').yearly}
                                            </span>
                                            <span className="text-sm text-gray-400 font-medium">
                                                EUR{billingPeriod === 'monthly' ? t('upgrade.perMonth') : t('upgrade.perYear')}
                                            </span>
                                        </div>
                                        <ul className="space-y-2 mb-4">
                                            {['proTransformations', 'proTemplates', 'proHistory', 'proChat', 'proPriority'].map(key => (
                                                <li key={key} className="flex items-center gap-2 text-xs text-gray-600">
                                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                    {t(`upgrade.features.${key}`)}
                                                </li>
                                            ))}
                                        </ul>
                                        {userPlan === 'pro' ? (
                                            <button
                                                onClick={openCustomerPortal}
                                                className="w-full py-2.5 rounded-xl text-sm font-bold border border-remix-300 text-remix-600 hover:bg-remix-50 transition"
                                            >
                                                {t('account.manage')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleCheckout('pro')}
                                                disabled={!!checkoutLoading}
                                                className="w-full py-2.5 rounded-xl text-sm font-bold bg-remix-600 text-white hover:bg-remix-700 transition disabled:opacity-50"
                                            >
                                                {checkoutLoading === 'pro' ? '...' : t('upgrade.subscribe')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Close button at bottom */}
                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="w-full text-gray-400 text-xs font-semibold hover:text-gray-600 transition py-2"
                                >
                                    {t('upgrade.later')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default SidePanel;
