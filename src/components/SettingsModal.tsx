import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { X, Save } from 'lucide-react';

const SettingsModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings, updateSettings } = useStore();
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        document.addEventListener('open-settings', handleOpen);
        return () => document.removeEventListener('open-settings', handleOpen);
    }, []);

    useEffect(() => {
        if (isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    const handleSave = () => {
        updateSettings(localSettings);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
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
                        <label className="block text-sm font-medium text-slate-400 mb-1">Perplexity API Key</label>
                        <input
                            type="password"
                            placeholder="pplx-..."
                            value={localSettings.perplexityApiKey}
                            onChange={(e) => setLocalSettings({ ...localSettings, perplexityApiKey: e.target.value })}
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
