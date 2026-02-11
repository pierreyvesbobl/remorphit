import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { signInWithGoogleViaExtension } from '../lib/googleAuth';
import { translations, type Language } from '../lib/i18n';
import '../index.css';

interface ArticleData {
    title: string;
    content: string;
    textContent: string;
    excerpt: string;
    siteName: string;
    url: string;
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
    const [sending, setSending] = useState(false);
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

    const [userPlan, setUserPlan] = useState<'free' | 'pro'>('free');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [lang, setLang] = useState<Language>('en');
    const [showShareMenu, setShowShareMenu] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['language'], (result) => {
            if (result.language) {
                setLang(result.language as Language);
            }
        });
    }, []);

    // Close upgrade modal if user is not logged in
    useEffect(() => {
        if (!user && showUpgradeModal) {
            setShowUpgradeModal(false);
        }
    }, [user, showUpgradeModal]);

    const toggleLanguage = (newLang: Language) => {
        setLang(newLang);
        chrome.storage.local.set({ language: newLang });
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current: any = translations[lang];
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
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Profile doesn't exist yet, should be created by trigger
                    // but we can try to create it here too as fallback
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        await supabase.from('profiles').insert({ id: user.id });
                    }
                } else {
                    throw error;
                }
            }
            if (data) {
                setUserPlan(data.plan);
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
            setHistory(data || []);
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

            // Set first template as default if none selected
            if (fetchedTemplates.length > 0 && !selectedTemplate) {
                setSelectedTemplate(fetchedTemplates[0]);
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
            console.error('Extraction error caught:', err);
            const errorMessage = (err as Error).message;

            if (errorMessage.includes("Receiving end does not exist") || errorMessage.includes("Could not establish connection")) {
                setError("Extension non active sur cette page. Veuillez recharger la page web.");
                setArticle(null);
            } else {
                setError(errorMessage || "Impossible d'extraire le contenu.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const sendToWebhook = async (templateId: string, prompt: string, templateName: string) => {
        if (!article || !user) return;

        // Check generation limit for free plan
        if (userPlan === 'free' && history.length >= 5) {
            setShowUpgradeModal(true);
            setSending(false);
            return;
        }

        setSending(true);
        setSuccessMessage(null);
        setError(null);

        try {
            // Get configured webhook URL
            const result = await chrome.storage.sync.get(['n8nWebhookUrl']);
            let webhookUrl = result.n8nWebhookUrl;

            // Fallback default if not set (User's specific URL)
            if (!webhookUrl) {
                webhookUrl = 'https://n8n.srv987244.hstgr.cloud/webhook/74fa2e22-66bf-4f7d-8f2c-18c4f8d550b0';
            }

            const payload = {
                ...article,
                template: {
                    id: templateId,
                    prompt: prompt
                },
                timestamp: new Date().toISOString()
            };

            // Send webhook via Background script to avoid CORS
            const response = await chrome.runtime.sendMessage({
                action: 'SEND_WEBHOOK',
                url: webhookUrl,
                payload: payload
            });

            if (response && response.success) {
                // n8n returns an array usually, we take the first item or the object itself
                let resultData = Array.isArray(response.data) ? response.data[0] : response.data;

                // If the data is wrapped in an 'output' property, unwrap it
                if (resultData && resultData.output) {
                    resultData = resultData.output;
                }

                if (resultData) {

                    if (resultData.error === true) {
                        setError(resultData.message || "Erreur lors de la génération.");
                        setSending(false);
                        return;
                    }

                    // Combine result data with history ID for display
                    const contentToDisplay = {
                        title: resultData.title || article.title,
                        content: resultData.content || '',
                    };

                    setSuccessMessage(resultData.message || "Contenu généré avec succès !");

                    // SAVE TO HISTORY
                    try {
                        const { data: histData, error: histError } = await supabase
                            .from('history')
                            .insert([{
                                user_id: user.id,
                                title: contentToDisplay.title,
                                content: contentToDisplay.content,
                                template_name: templateName,
                                url: article.url,
                                tokens_used: resultData.totalTokens || 0 // Keep as fallback if provided
                            }])
                            .select()
                            .single();

                        if (histError) throw histError;

                        // Combine history metadata with the actual content
                        if (histData) {
                            setGeneratedContent({
                                id: histData.id,
                                title: contentToDisplay.title,
                                content: contentToDisplay.content,
                                created_at: histData.created_at
                            });
                        } else {
                            // Fallback if no history data returned
                            setGeneratedContent(contentToDisplay);
                        }

                        fetchHistory(); // Refresh history
                    } catch (hErr) {
                        console.error('Error saving to history:', hErr);
                    }

                } else {
                    setError("Envoyé, mais aucune réponse reçue du serveur.");
                }
            } else {
                throw new Error(`Erreur webhook: ${response.error}`);
            }

        } catch (err) {
            console.error(err);
            setError(`Échec de l'envoi vers n8n: ${(err as Error).message}`);
        } finally {
            setSending(false);
        }
    };

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
                if (data.user) {
                    setSuccessMessage('Compte créé ! Vérifiez votre email pour confirmer.');
                }
            }
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
            setSuccessMessage('Template créé avec succès !');
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
            setSuccessMessage('Template mis à jour !');
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    const handleStripeCheckout = async () => {
        setIsProcessingPayment(true);
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
                body: {
                    priceId: 'price_1SrE6K0xqDBVjmEQbkrMkkHO', // Replace with actual Stripe Price ID
                    returnUrl: window.location.href
                }
            });

            if (data?.error) throw new Error(data.error);
            if (invokeError) throw invokeError;

            if (data?.url) {
                window.open(data.url, '_blank');
            } else {
                throw new Error("Aucune URL de paiement reçue.");
            }
        } catch (err: any) {
            console.error('Stripe error details:', err);
            const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setError(`Erreur Stripe : ${msg}`);
        } finally {
            setIsProcessingPayment(false);
            setShowUpgradeModal(false);
        }
    };
    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce template ?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== id));
            setSuccessMessage('Template supprimé.');
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
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <header className="px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between">
                    <button
                        onClick={() => setGeneratedContent(null)}
                        className="text-sm font-medium text-remix-600 hover:text-remix-800 flex items-center gap-1"
                    >
                        ← {t('general.back')}
                    </button>
                    <h1 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{generatedContent.title || t('tabs.history')}</h1>
                    {generatedContent.id ? (
                        <button
                            onClick={() => handleDeleteHistory(generatedContent.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                            title={t('templates.delete')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                    ) : (
                        <div className="w-8"></div>
                    )}
                </header>
                <main className="flex-1 p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg  border border-gray-200 overflow-hidden">
                        {/* We render the HTML content safely */}
                        <div
                            className="prose prose-sm max-w-none p-4 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                                __html: generatedContent.content
                                    // Convert plain text to HTML if needed
                                    .replace(/\n\n/g, '</p><p>')
                                    .replace(/^(.+)$/, '<p>$1</p>')
                                    .replace(/<p><\/p>/g, '')
                            }}
                        />
                    </div>
                    <div className="mt-4 flex gap-2 relative">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generatedContent.content);
                                setSuccessMessage(t('history.copied'));
                                setTimeout(() => setSuccessMessage(null), 2000);
                            }}
                            className="flex-1 bg-white text-remix-600 border border-remix-200 py-2.5 rounded-xl font-bold hover:bg-remix-50 transition  flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                            {t('general.copyHtml')}
                        </button>
                        <button
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="flex-1 bg-remix-600 text-white py-2.5 rounded-xl font-bold hover:bg-remix-700 transition  flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                            {t('general.share')}
                        </button>

                        {showShareMenu && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-200 border border-gray-100 p-2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2 py-1 border-b border-gray-50">{t('general.sendTo')}</div>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => {
                                            const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
                                            setShowShareMenu(false);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                    >
                                        <span className="text-base text-blue-600">LinkedIn</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                            setShowShareMenu(false);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                    >
                                        <span className="text-base text-gray-900">Twitter (X)</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                            window.open(`mailto:?subject=${encodeURIComponent(generatedContent.title || 'ReMorphIt Content')}&body=${encodeURIComponent(text)}`, '_blank');
                                            setShowShareMenu(false);
                                        }}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition"
                                    >
                                        <span className="text-base text-red-500">Email</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const text = generatedContent.content.replace(/<[^>]*>/g, '');
                                            if (navigator.share) {
                                                try {
                                                    await navigator.share({
                                                        title: generatedContent.title || 'ReMorphIt Content',
                                                        text: text,
                                                        url: window.location.href
                                                    });
                                                } catch (err) {
                                                    console.error('Error sharing:', err);
                                                }
                                            } else {
                                                navigator.clipboard.writeText(text);
                                                setSuccessMessage(t('history.copied'));
                                                setTimeout(() => setSuccessMessage(null), 2000);
                                            }
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
                    {successMessage && (
                        <div className="mt-2 text-center text-sm text-green-600 font-medium">
                            {successMessage}
                        </div>
                    )}
                </main>
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
                    className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'history' ? 'border-remix-600 text-remix-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {t('tabs.history')}
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
                                    <div className="absolute inset-0 bg-remix-500 rounded-full animate-radar opacity-20"></div>
                                    <div className="absolute inset-0 bg-remix-400 rounded-full animate-radar opacity-10 [animation-delay:1s]"></div>

                                    {/* Main scanner circle */}
                                    <div className="relative bg-white h-24 w-24 rounded-full border border-gray-200 border-4 border-white flex items-center justify-center text-4xl overflow-hidden z-10 transition-transform hover:scale-105 duration-300">
                                        <img src="/scan.webp" alt="" className={`w-24 h-24 ${loading ? "animate-bounce" : ""}`} />
                                        {/* Horizontal scan line */}
                                        {loading && <div className="absolute left-0 right-0 h-1 bg-remix-400/40 animate-scan z-20"></div>}
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

                                {/* Modal d'upgrade */}
                                {showUpgradeModal && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                        <div className="absolute inset-0 bg-remix-900/60 backdrop-blur-sm" onClick={() => !isProcessingPayment && setShowUpgradeModal(false)}></div>
                                        <div className="relative bg-white w-full max-w-sm rounded-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                                            {isProcessingPayment ? (
                                                <div className="p-12 text-center flex flex-col items-center justify-center space-y-6">
                                                    <div className="relative">
                                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-remix-100 border-t-remix-600"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-xl">💳</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900">{t('upgrade.processing')}</h3>
                                                        <p className="text-gray-500 text-sm mt-1">{t('upgrade.stripeLink')}</p>
                                                    </div>
                                                    <div className="w-full bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                                                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-remix-600 animate-pulse w-2/3 transition-all duration-1000"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="bg-remix-600 p-6 text-white text-center">
                                                        <span className="text-4xl mb-4 block">🏆</span>
                                                        <h3 className="text-xl font-bold mb-2">{t('upgrade.modalTitle')}</h3>
                                                        <p className="text-remix-100 text-sm">{t('upgrade.modalDesc')}</p>
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        <ul className="space-y-3">
                                                            <li className="flex items-center gap-3 text-sm text-gray-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                                                                {t('upgrade.unlimited')}
                                                            </li>
                                                            <li className="flex items-center gap-3 text-sm text-gray-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                                                                {t('upgrade.premiumTemplates')}
                                                            </li>
                                                            <li className="flex items-center gap-3 text-sm text-gray-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                                                                {t('upgrade.support')}
                                                            </li>
                                                            <li className="flex items-center gap-3 text-sm text-gray-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                                                                {t('upgrade.customTemplates')}
                                                            </li>
                                                        </ul>
                                                        <button
                                                            onClick={handleStripeCheckout}
                                                            className="w-full bg-remix-600 text-white py-3 rounded-xl font-bold hover:bg-remix-700 transition  mt-2 flex items-center justify-center gap-2"
                                                        >
                                                            <span>💳</span> {t('upgrade.activate')}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowUpgradeModal(false)}
                                                            className="w-full text-gray-400 text-xs font-semibold hover:text-gray-600 transition"
                                                        >
                                                            {t('upgrade.later')}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Barre d'utilisation */}
                                {userPlan === 'free' && (
                                    <div className="mb-4 bg-white p-3 rounded-xl border border-gray-100 ">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('templates.freeUsage')}</span>
                                                <button
                                                    onClick={() => setShowUpgradeModal(true)}
                                                    className="text-[9px] bg-remix-50 text-remix-600 px-1.5 py-0.5 rounded font-bold hover:bg-remix-600 hover:text-white transition"
                                                >
                                                    {t('templates.upgrade')}
                                                </button>
                                            </div>
                                            <span className="text-[10px] font-bold text-remix-600">{history.length}/5</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${history.length >= 5 ? 'bg-red-500' : 'bg-remix-600'}`}
                                                style={{ width: `${Math.min((history.length / 5) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        {history.length >= 5 && (
                                            <p className="text-[10px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                {t('templates.limitReached')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="bg-white p-4 rounded-lg  border border-gray-100 mb-6 relative overflow-hidden group">
                                    {userPlan === 'pro' && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-remix-600 text-[8px] font-bold text-white px-3 py-1 rotate-45 translate-x-4 -translate-y-1  uppercase tracking-tighter">PRO</div>
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
                                                disabled={sending || !selectedTemplate}
                                                className="flex-1 bg-remix-600 text-white py-3 rounded-xl font-bold text-lg  hover:bg-remix-700 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                            >
                                                {sending ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                        {t('templates.transforming')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <img src="/WhiteIcon512.png" alt="" style={{width: '20px', height: '20px'}} /> {t('templates.transform')}
                                                    </>
                                                )}
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
                                                                if (userPlan === 'free') {
                                                                    setShowUpgradeModal(true);
                                                                } else {
                                                                    setIsCreatingTemplate(true);
                                                                }
                                                                setShowTemplateSelector(false);
                                                            }}
                                                            className="text-[10px] font-bold text-remix-600 hover:text-remix-800 flex items-center gap-1"
                                                        >
                                                            {userPlan === 'free' && <span>🔒</span>}
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
                                                                                if (userPlan === 'free') {
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
                                                                                    if (userPlan === 'free') {
                                                                                        setShowUpgradeModal(true);
                                                                                    } else {
                                                                                        setEditingTemplate(templateitem);
                                                                                        setNewTemplateName(templateitem.name);
                                                                                        setNewTemplateDesc(templateitem.description || '');
                                                                                        setNewTemplatePrompt(templateitem.prompt);
                                                                                    }
                                                                                    setShowTemplateSelector(false);
                                                                                }}
                                                                                className="p-1 text-gray-300 hover:text-remix-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                title={userPlan === 'free' ? t('templates.proOnly') : t('templates.modify')}
                                                                            >
                                                                                {userPlan === 'free' ? (
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                                                ) : (
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (userPlan === 'free') {
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
                            history.map(item => (
                                <div key={item.id} className="bg-white rounded-xl  border border-gray-100 overflow-hidden relative group">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="px-2 py-0.5 bg-remix-50 text-remix-600 rounded text-[10px] font-bold uppercase tracking-tight">
                                                {item.template_name}
                                            </span>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-1">{item.title}</h4>
                                        <div className="text-xs text-gray-600 line-clamp-3 mb-3 bg-gray-50 p-2 rounded">
                                            {item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                                        </div>
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
                                    </div>
                                    <button
                                        onClick={() => handleDeleteHistory(item.id)}
                                        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition z-10 bg-white/80"
                                        title={t('templates.delete')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            ))
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
                                    <div className={`flex items-center justify-between p-4 rounded-xl border ${userPlan === 'pro' ? 'bg-remix-50 border-remix-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl ${userPlan === 'pro' ? 'bg-remix-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {userPlan === 'pro' ? '✨' : '🌱'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 capitalize">{userPlan === 'pro' ? t('account.proPlan') : t('account.freePlan')}</div>
                                                <div className="text-xs text-gray-500">
                                                    {userPlan === 'pro' ? t('account.unlimited') : t('account.generationsUsed').replace('{count}', history.length.toString())}
                                                </div>
                                            </div>
                                        </div>
                                        {userPlan !== 'pro' ? (
                                            <button
                                                onClick={() => setShowUpgradeModal(true)}
                                                className="bg-remix-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-remix-700 transition "
                                            >
                                                {t('account.upgrade')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    const { data } = await supabase.functions.invoke('stripe-portal', {
                                                        body: { returnUrl: window.location.href }
                                                    });
                                                    if (data?.url) window.open(data.url, '_blank');
                                                }}
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
                                        <span className="text-sm font-semibold text-gray-700">{t('account.language')}</span>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                onClick={() => toggleLanguage('en')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${lang === 'en' ? 'bg-white  text-remix-600' : 'text-gray-500'}`}
                                            >
                                                EN
                                            </button>
                                            <button
                                                onClick={() => toggleLanguage('fr')}
                                                className={`px-3 py-1 text-xs font-bold rounded-md transition ${lang === 'fr' ? 'bg-white  text-remix-600' : 'text-gray-500'}`}
                                            >
                                                FR
                                            </button>
                                        </div>
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
                            <a href="mailto:hello@automato.tech" className="text-xs font-bold text-remix-600 hover:text-remix-800 flex items-center gap-1">
                                {t('account.contactSupport')} <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </a>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SidePanel;
