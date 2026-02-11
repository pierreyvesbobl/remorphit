import { useState, useEffect } from 'react';

const Options = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        chrome.storage.sync.get(['n8nWebhookUrl'], (items: { [key: string]: any }) => {
            if (items.n8nWebhookUrl) {
                setWebhookUrl(items.n8nWebhookUrl);
            }
        });
    }, []);

    const saveOptions = () => {
        chrome.storage.sync.set({ n8nWebhookUrl: webhookUrl }, () => {
            setStatus('Options sauvegardées.');
            setTimeout(() => setStatus(''), 2000);
        });
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Configuration ReMorphIt</h1>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL du Webhook n8n
                </label>
                <input
                    type="url"
                    className="w-full p-2 border rounded-md"
                    placeholder="https://votre-instance-n8n.com/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                    L'URL qui recevra les données (Méthode POST)
                </p>
            </div>

            <button
                onClick={saveOptions}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Sauvegarder
            </button>

            {status && <div className="mt-4 text-green-600">{status}</div>}
        </div>
    );
};

export default Options;
