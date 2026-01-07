import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { X, Save, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { testPerplexityConnection } from '../services/perplexityTest';
import type { ConnectionTestResult } from '../services/perplexityTest';

const SettingsModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSettings } = useStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        document.addEventListener('open-settings', handleOpen);
        return () => document.removeEventListener('open-settings', handleOpen);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
            setTestResult(null);
        }
    }, [isOpen, settings]);

    const handleSave = () => {
        updateSettings(localSettings);
        setIsOpen(false);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        // Use current local settings for test
        const result = await testPerplexityConnection(localSettings);
        setTestResult(result);
        setIsTesting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 border-b border-indigo-500/20 pb-1">General Settings</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Site Title</label>
                                <input
                                    type="text"
                                    value={localSettings.siteTitle}
                                    onChange={(e) => setLocalSettings({ ...localSettings, siteTitle: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tagline</label>
                                <input
                                    type="text"
                                    value={localSettings.tagline}
                                    onChange={(e) => setLocalSettings({ ...localSettings, tagline: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Theme</label>
                                <select
                                    value={localSettings.theme}
                                    // @ts-ignore
                                    onChange={(e) => setLocalSettings({ ...localSettings, theme: e.target.value })}
                                    className="input-field appearance-none cursor-pointer"
                                >
                                    <option value="system">System</option>
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Article Default Wordcount</label>
                                <input
                                    type="number"
                                    min="500"
                                    step="500"
                                    value={localSettings.articleDefaultWordCount || 4000}
                                    onChange={(e) => setLocalSettings({ ...localSettings, articleDefaultWordCount: parseInt(e.target.value) || 4000 })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 border-b border-emerald-500/20 pb-1">"Debater" Tools</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-400">Perplexity API Key</label>
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={isTesting || !localSettings.perplexityApiKey}
                                        className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded flex items-center gap-1 transition-colors"
                                    >
                                        {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                        <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    placeholder="pplx-..."
                                    value={localSettings.perplexityApiKey}
                                    onChange={(e) => {
                                        setLocalSettings({ ...localSettings, perplexityApiKey: e.target.value });
                                        setTestResult(null);
                                    }}
                                    className="input-field"
                                />
                                {testResult && (
                                    <div className={`mt-2 p-3 rounded-lg border text-sm ${testResult.success
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                                        }`}>
                                        <div className="flex items-start gap-2">
                                            {testResult.success ? (
                                                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle size={16} className="shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                {testResult.success ? (
                                                    <>
                                                        <p className="font-semibold mb-1 text-xs">✅ Connection Successful</p>
                                                        <div className="text-[10px] opacity-80 space-y-0.5">
                                                            <p>• Response time: {testResult.responseTime}ms</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-semibold mb-1 text-xs">❌ Connection Failed</p>
                                                        <p className="text-[10px] opacity-80">{testResult.error}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Brave API Key</label>
                                <input
                                    type="password"
                                    placeholder="BSA..."
                                    value={localSettings.braveApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, braveApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Claude API Key</label>
                                <input
                                    type="password"
                                    placeholder="sk-ant-..."
                                    value={localSettings.claudeApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, claudeApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3 border-b border-purple-500/20 pb-1">"Muse" Tools</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Sudowrite API Key</label>
                                <input
                                    type="password"
                                    value={localSettings.sudowriteApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, sudowriteApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Novelcrafter API Key</label>
                                <input
                                    type="password"
                                    value={localSettings.novelcrafterApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, novelcrafterApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Character.ai Token</label>
                                <input
                                    type="password"
                                    value={localSettings.characterAiApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, characterAiApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 border-b border-amber-500/20 pb-1">"Analyst" Tools</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Gemini API Key</label>
                                <input
                                    type="password"
                                    placeholder="AIza..."
                                    value={localSettings.geminiApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">ChatGPT (OpenAI) API Key</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={localSettings.chatgptApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, chatgptApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">iAsk.ai API Key (Optional)</label>
                                <input
                                    type="password"
                                    value={localSettings.iaskAiApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, iaskAiApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-700 pb-1">Automation</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Queue Process Interval (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={localSettings.queueProcessInterval || 1}
                                    onChange={(e) => setLocalSettings({ ...localSettings, queueProcessInterval: parseInt(e.target.value) || 1 })}
                                    className="input-field"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save size={18} />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
