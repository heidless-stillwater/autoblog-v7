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
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-400">Perplexity API Key</label>
                            <button
                                onClick={handleTestConnection}
                                disabled={isTesting || !localSettings.perplexityApiKey}
                                className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded flex items-center gap-1 transition-colors"
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Testing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={12} />
                                        <span>Test Connection</span>
                                    </>
                                )}
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

                        {/* Test Result */}
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
                                                <p className="font-semibold mb-1">✅ Connection Successful</p>
                                                <div className="text-xs opacity-80 space-y-0.5">
                                                    <p>• Tokens used: ~{testResult.tokensUsed || 'N/A'} (minimal test)</p>
                                                    <p>• Response time: {testResult.responseTime}ms</p>
                                                    <p className="text-emerald-200/60 mt-1">Your API key is working correctly!</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-semibold mb-1">❌ Connection Failed</p>
                                                <p className="text-xs opacity-80">{testResult.error}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-slate-500 mt-2">
                            💡 Test uses minimal tokens (~10-20) to verify your API key
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            placeholder="AIza..."
                            value={localSettings.geminiApiKey || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                            className="input-field"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Used for topic generation. Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">Google AI Studio</a>.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Perplexity Model</label>
                        <select
                            value={localSettings.perplexityModel}
                            onChange={(e) => setLocalSettings({ ...localSettings, perplexityModel: e.target.value as any })}
                            className="input-field appearance-none cursor-pointer"
                            title={
                                localSettings.perplexityModel === 'sonar'
                                    ? 'Based on Llama 3.3, it is the default for most users. It is optimized for extreme speed and factual grounding'
                                    : localSettings.perplexityModel === 'sonar-reasoning'
                                        ? 'Adds a "Chain of Thought" process, making it better at following complex instructions while still being faster than most third-party models.'
                                        : 'Designed specifically for the "Research" mode to generate long-form, source-heavy reports.'
                            }
                        >
                            <option
                                value="sonar"
                                title="Based on Llama 3.3, it is the default for most users. It is optimized for extreme speed and factual grounding"
                            >
                                Sonar (Default)
                            </option>
                            <option
                                value="sonar-reasoning"
                                title='Adds a "Chain of Thought" process, making it better at following complex instructions while still being faster than most third-party models.'
                            >
                                Sonar Reasoning
                            </option>
                            <option
                                value="sonar-deep-research"
                                title='Designed specifically for the "Research" mode to generate long-form, source-heavy reports.'
                            >
                                Sonar Deep Research
                            </option>
                        </select>
                        <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-300">
                            {localSettings.perplexityModel === 'sonar' && (
                                <div>
                                    <p className="font-semibold text-indigo-300 mb-1">💡 Sonar (Default)</p>
                                    <p>Based on Llama 3.3, it is the default for most users. It is optimized for extreme speed and factual grounding.</p>
                                </div>
                            )}
                            {localSettings.perplexityModel === 'sonar-reasoning' && (
                                <div>
                                    <p className="font-semibold text-purple-300 mb-1">🧠 Sonar Reasoning</p>
                                    <p>Adds a "Chain of Thought" process, making it better at following complex instructions while still being faster than most third-party models.</p>
                                </div>
                            )}
                            {localSettings.perplexityModel === 'sonar-deep-research' && (
                                <div>
                                    <p className="font-semibold text-emerald-300 mb-1">📚 Sonar Deep Research</p>
                                    <p>Designed specifically for the "Research" mode to generate long-form, source-heavy reports.</p>
                                </div>
                            )}
                        </div>
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
                        <label className="block text-sm font-medium text-slate-400 mb-1">Queue Process Interval (minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={localSettings.queueProcessInterval || 1}
                            onChange={(e) => setLocalSettings({ ...localSettings, queueProcessInterval: parseInt(e.target.value) || 1 })}
                            className="input-field"
                        />
                        <p className="text-xs text-slate-500 mt-1">How often the background job checks for due snapshots.</p>
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
