import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { X, Save, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
    testPerplexityConnection,
    testGeminiConnection,
    testBraveConnection,
    testClaudeConnection,
    testOpenAIConnection,
    testPersonaConnection,
    testiAskConnection,
    type ConnectionTestResult
} from '../services/apiTestService';

const SettingsModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSettings } = useStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult | null>>({});
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        document.addEventListener('open-settings', handleOpen);
        return () => document.removeEventListener('open-settings', handleOpen);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
            setTestResults({});
        }
    }, [isOpen, settings]);

    const handleSave = () => {
        updateSettings(localSettings);
        setIsOpen(false);
    };

    const handleRunTest = async (provider: string, testFn: (settings: any) => Promise<ConnectionTestResult>) => {
        setTestingProvider(provider);
        // Clear previous result for this provider
        setTestResults(prev => ({ ...prev, [provider]: null }));

        const result = await testFn(localSettings);

        setTestResults(prev => ({ ...prev, [provider]: result }));
        setTestingProvider(null);
    };

    const renderTestResult = (provider: string) => {
        const result = testResults[provider];
        if (!result) return null;

        return (
            <div className={`mt-2 p-3 rounded-lg border text-sm animate-in fade-in slide-in-from-top-1 duration-200 ${result.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                <div className="flex items-start gap-2">
                    {result.success ? (
                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    ) : (
                        <XCircle size={16} className="shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        <p className="font-semibold mb-1 text-xs">
                            {result.success ? '✅ Connection Successful' : '❌ Connection Failed'}
                        </p>
                        {result.success && result.responseTime && (
                            <p className="text-[10px] opacity-80">• Response time: {result.responseTime}ms</p>
                        )}
                        {result.details && <p className="text-[10px] opacity-80">• {result.details}</p>}
                        {result.error && <p className="text-[10px] opacity-80">{result.error}</p>}
                    </div>
                </div>
            </div>
        );
    };

    const renderApiKeyField = (
        label: string,
        provider: string,
        value: string,
        onChange: (val: string) => void,
        testFn: (settings: any) => Promise<ConnectionTestResult>,
        placeholder?: string
    ) => {
        const isTesting = testingProvider === provider;

        return (
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-400">{label}</label>
                    <button
                        onClick={() => handleRunTest(provider, testFn)}
                        disabled={isTesting || !value && provider !== 'iask'}
                        className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded flex items-center gap-1 transition-colors border border-slate-700"
                    >
                        {isTesting ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                        <span>{isTesting ? 'Testing...' : 'Test'}</span>
                    </button>
                </div>
                <input
                    type="password"
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setTestResults(prev => ({ ...prev, [provider]: null }));
                    }}
                    className="input-field"
                />
                {renderTestResult(provider)}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* General Settings */}
                    <section>
                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 border-b border-indigo-500/10 pb-2">General</h3>
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Default Wordcount</label>
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
                    </section>

                    {/* Debater Tools */}
                    <section>
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 border-b border-emerald-500/10 pb-2">Research (Debater)</h3>
                        <div className="space-y-4">
                            {renderApiKeyField(
                                "Perplexity API Key",
                                "perplexity",
                                localSettings.perplexityApiKey,
                                (v) => setLocalSettings({ ...localSettings, perplexityApiKey: v }),
                                testPerplexityConnection,
                                "pplx-..."
                            )}
                            {renderApiKeyField(
                                "Brave API Key",
                                "brave",
                                localSettings.braveApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, braveApiKey: v }),
                                testBraveConnection,
                                "BSA..."
                            )}
                            {renderApiKeyField(
                                "Claude API Key",
                                "claude",
                                localSettings.claudeApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, claudeApiKey: v }),
                                testClaudeConnection,
                                "sk-ant-..."
                            )}
                        </div>
                    </section>

                    {/* Analyst Tools */}
                    <section>
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 border-b border-amber-500/10 pb-2">Intelligence (Analyst)</h3>
                        <div className="space-y-4">
                            {renderApiKeyField(
                                "Gemini API Key",
                                "gemini",
                                localSettings.geminiApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, geminiApiKey: v }),
                                testGeminiConnection,
                                "AIza..."
                            )}
                            {renderApiKeyField(
                                "ChatGPT (OpenAI) API Key",
                                "openai",
                                localSettings.chatgptApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, chatgptApiKey: v }),
                                testOpenAIConnection,
                                "sk-..."
                            )}
                            {renderApiKeyField(
                                "iAsk.ai API Key (Optional)",
                                "iask",
                                localSettings.iaskAiApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, iaskAiApiKey: v }),
                                testiAskConnection
                            )}
                        </div>
                    </section>

                    {/* Muse Tools */}
                    <section>
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-4 border-b border-purple-500/10 pb-2">Creative (Muse)</h3>
                        <div className="space-y-4">
                            {renderApiKeyField(
                                "Sudowrite API Key",
                                "sudowrite",
                                localSettings.sudowriteApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, sudowriteApiKey: v }),
                                (s) => testPersonaConnection(s, "sudowrite")
                            )}
                            {renderApiKeyField(
                                "Novelcrafter API Key",
                                "novelcrafter",
                                localSettings.novelcrafterApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, novelcrafterApiKey: v }),
                                (s) => testPersonaConnection(s, "novelcrafter")
                            )}
                            {renderApiKeyField(
                                "Character.ai Token",
                                "characterAi",
                                localSettings.characterAiApiKey || '',
                                (v) => setLocalSettings({ ...localSettings, characterAiApiKey: v }),
                                (s) => testPersonaConnection(s, "characterAi")
                            )}
                        </div>
                    </section>

                    {/* Automation */}
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-700/50 pb-2">Automation</h3>
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
                    </section>

                    {/* PromptVault */}
                    <section>
                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 border-b border-indigo-500/10 pb-2">PromptVault</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                                <input
                                    type="password"
                                    placeholder="pk_live_..."
                                    value={localSettings.promptVaultApiKey || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, promptVaultApiKey: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">API Base URL</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <select
                                        value={localSettings.promptVaultBaseUrl || 'https://imageprompt-v1-dev.web.app/api'}
                                        onChange={(e) => setLocalSettings({ ...localSettings, promptVaultBaseUrl: e.target.value })}
                                        className="input-field appearance-none cursor-pointer"
                                    >
                                        <option value="https://imageprompt-v1-dev.web.app/api">Live API (Default)</option>
                                        <option value="http://localhost:3000/api">Local API (Development)</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Custom URL..."
                                        value={localSettings.promptVaultBaseUrl || ''}
                                        onChange={(e) => setLocalSettings({ ...localSettings, promptVaultBaseUrl: e.target.value })}
                                        className="input-field text-xs bg-slate-800/50"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    Tip: Use Local API if running the vault backend locally on port 3000.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-10 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="btn-primary py-2.5 px-6 flex items-center gap-2 group"
                    >
                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                        <span>Save Settings</span>
                    </button>
                </div>
            </div >
        </div >
    );
};

export default SettingsModal;
