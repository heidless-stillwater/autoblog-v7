import { useState } from 'react';
import { useStore } from '../store';
import {
    X, Save, Sparkles, LayoutTemplate, Plus,
    Trash2, ChevronDown, CheckCircle
} from 'lucide-react';
import StyleOptionsSelector from './StyleOptionsSelector';
import type { StyleOptions, ArticleLayoutPreset, LayoutConfig } from '../types';
import clsx from 'clsx'; // Assuming clsx is available since it was used in ImagePromptManager

interface PromptConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Style Props (passed from parent to maintain state across opens)
    styleOptions: StyleOptions;
    onStyleUpdate: (options: StyleOptions) => void;
    customInstructions: string;
    onCustomInstructionsUpdate: (val: string) => void;
    modelGuidelines: string;
    onModelGuidelinesUpdate: (val: string) => void;
    currentPromptPresetId: string | null;
    onPromptPresetChange: (id: string | null) => void;

    // Layout Props
    layoutConfig: LayoutConfig;
    onLayoutConfigUpdate: (config: LayoutConfig) => void;
    activeLayoutPresetId: string | null;
    onLayoutPresetChange: (id: string | null) => void;
}

const PromptConfigModal = ({
    isOpen,
    onClose,
    styleOptions,
    onStyleUpdate,
    customInstructions,
    onCustomInstructionsUpdate,
    modelGuidelines,
    onModelGuidelinesUpdate,
    currentPromptPresetId,
    onPromptPresetChange,
    layoutConfig,
    onLayoutConfigUpdate,
    activeLayoutPresetId,
    onLayoutPresetChange
}: PromptConfigModalProps) => {
    const { settings, updateSettings } = useStore();
    const [activeTab, setActiveTab] = useState<'style' | 'layout'>('style');


    // Layout Preset State
    const [layoutPresetName, setLayoutPresetName] = useState('');

    // Style Preset State (local to this modal for creation)
    const [stylePresetName, setStylePresetName] = useState('');

    // --- STANDARD PRESETS (Duplicated/Moved from ImagePromptManager) ---
    // In a real refactor, these might live in a constants file.
    const STANDARD_STYLE_PRESETS = [
        { id: 'preset-standard-cinematic', name: '🎬 Epic Cinematic' },
        { id: 'preset-standard-minimalist', name: '✨ Modern Minimal' },
        { id: 'preset-standard-cyberpunk', name: '🎆 Neon Cyberpunk' },
        { id: 'preset-standard-vintage', name: '📜 Vintage Nostalgia' },
        { id: 'preset-standard-noir', name: '🕶️ Dramatic Noir' },
        { id: 'preset-standard-macro', name: '🔍 Macro Precision' }
    ];

    // --- LAYOUT LOGIC ---
    const allLayoutPresets = settings.layoutPresets || [];
    const activeLayoutPreset = allLayoutPresets.find(p => p.id === activeLayoutPresetId);

    // Detect if current settings match the active preset (clean vs dirty/custom)
    const isLayoutDirty = activeLayoutPreset
        ? (
            activeLayoutPreset.imageCount !== layoutConfig.imageCount ||
            activeLayoutPreset.includeHero !== layoutConfig.includeHero ||
            activeLayoutPreset.placementInstructions !== layoutConfig.instructions
        )
        : true; // If no active preset, it's effectively "Custom"

    const handleApplyLayoutPreset = (presetId: string) => {
        onLayoutPresetChange(presetId);
    };

    const handleSaveLayoutPreset = async () => {
        if (!layoutPresetName.trim()) return;
        const newPreset: ArticleLayoutPreset = {
            id: crypto.randomUUID(),
            name: layoutPresetName.trim(),
            imageCount: layoutConfig.imageCount,
            includeHero: layoutConfig.includeHero,
            placementInstructions: layoutConfig.instructions,
            createdAt: Date.now()
        };
        const updatedPresets = [...allLayoutPresets, newPreset];
        await updateSettings({
            layoutPresets: updatedPresets
        });
        onLayoutPresetChange(newPreset.id); // Notify parent to switch to this preset
        setLayoutPresetName('');
    };

    const handleUpdateActiveLayoutPreset = async () => {
        if (!activeLayoutPresetId) return;

        const updatedPresets = allLayoutPresets.map(p => {
            if (p.id === activeLayoutPresetId) {
                return {
                    ...p,
                    imageCount: layoutConfig.imageCount,
                    includeHero: layoutConfig.includeHero,
                    placementInstructions: layoutConfig.instructions
                };
            }
            return p;
        });

        await updateSettings({ layoutPresets: updatedPresets });
    };

    const handleDeleteLayoutPreset = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const updatedPresets = allLayoutPresets.filter(p => p.id !== id);
        // If we deleted the active one, notify parent to switch to null (Custom)
        if (activeLayoutPresetId === id) {
            onLayoutPresetChange(null);
        }
        await updateSettings({
            layoutPresets: updatedPresets
        });
    };

    // --- STYLE LOGIC HELPERS ---
    // (Actual preset application is handled by parent via props, but we trigger the changes here)
    const handleSaveStylePreset = async () => {
        if (!stylePresetName.trim()) return;
        const newPreset = {
            id: crypto.randomUUID(),
            name: stylePresetName.trim(),
            styleOptions,
            customInstructions,
            modelGuidelines,
            createdAt: Date.now()
        };
        const updatedPresets = [...(settings.promptPresets || []), newPreset];
        await updateSettings({ promptPresets: updatedPresets });
        onPromptPresetChange(newPreset.id);
        setStylePresetName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutTemplate className="text-indigo-400" />
                        Article Configuration
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 px-6">
                    <button
                        onClick={() => setActiveTab('style')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'style'
                                ? "border-indigo-500 text-white"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <Sparkles size={16} />
                        Visual Style
                    </button>
                    <button
                        onClick={() => setActiveTab('layout')}
                        className={clsx(
                            "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'layout'
                                ? "border-emerald-500 text-white"
                                : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <LayoutTemplate size={16} />
                        Article Layout
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* VISUAL STYLE TAB */}
                    {activeTab === 'style' && (
                        <div className="space-y-6">
                            {/* Visual Style Content (Adapted from ImagePromptManager) */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style Presets</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={stylePresetName}
                                            onChange={(e) => setStylePresetName(e.target.value)}
                                            placeholder="New Preset Name..."
                                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500/50 outline-none w-40"
                                        />
                                        <button
                                            onClick={handleSaveStylePreset}
                                            disabled={!stylePresetName.trim()}
                                            className="btn-secondary py-1 px-3 text-xs flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Save
                                        </button>
                                    </div>
                                </div>
                                <select
                                    value={currentPromptPresetId || ''}
                                    onChange={(e) => onPromptPresetChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                >
                                    <option value="">Custom / None</option>
                                    <optgroup label="Standard Styles">
                                        {STANDARD_STYLE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </optgroup>
                                    {(settings.promptPresets || []).length > 0 && (
                                        <optgroup label="My Presets">
                                            {settings.promptPresets!.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parameters</h3>
                                <StyleOptionsSelector options={styleOptions} onUpdate={onStyleUpdate} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Instructions</label>
                                <textarea
                                    value={customInstructions}
                                    onChange={(e) => onCustomInstructionsUpdate(e.target.value)}
                                    placeholder="Add specific details (e.g., 'Use a consistent blue color palette', 'No text in images')..."
                                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-800/50">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model Guidelines (Advanced)</label>
                                <textarea
                                    value={modelGuidelines}
                                    onChange={(e) => onModelGuidelinesUpdate(e.target.value)}
                                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {/* ARTICLE LAYOUT TAB */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                            {/* Layout Presets Selector */}
                            <div className="space-y-4 bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                                        <LayoutTemplate size={14} />
                                        Layout Preset
                                    </h3>
                                    <div className="flex gap-2 items-center">
                                        {isLayoutDirty && (
                                            <span className="text-[10px] text-amber-500 font-medium px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                                                Custom / Modified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1 group">
                                        <select
                                            value={activeLayoutPresetId || ''}
                                            onChange={(e) => handleApplyLayoutPreset(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none appearance-none"
                                        >
                                            <option value="" disabled>Select a Layout...</option>
                                            {allLayoutPresets.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                            <option value="custom">Custom Configuration</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                                    </div>

                                    {/* Delete Button for Non-Standard/Default presets */}
                                    {activeLayoutPresetId && activeLayoutPresetId !== 'preset-base-layout-0' && (
                                        <button
                                            onClick={() => handleDeleteLayoutPreset(activeLayoutPresetId!)}
                                            className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-700 rounded-lg transition-colors"
                                            title="Delete Preset"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Save As New / Update */}
                                {isLayoutDirty && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-3 border-t border-slate-800/50">
                                        {/* Update Existing Button */}
                                        {activeLayoutPresetId && (
                                            <button
                                                onClick={handleUpdateActiveLayoutPreset}
                                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
                                            >
                                                <Save size={14} />
                                                Update "{activeLayoutPreset?.name}"
                                            </button>
                                        )}

                                        {/* Save New Section */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={layoutPresetName}
                                                onChange={(e) => setLayoutPresetName(e.target.value)}
                                                placeholder="New Layout Name..."
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                            />
                                            <button
                                                onClick={handleSaveLayoutPreset}
                                                disabled={!layoutPresetName.trim()}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={14} />
                                                Save as New
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Configuration Fields */}
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Num Images
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={layoutConfig.imageCount}
                                            onChange={(e) => onLayoutConfigUpdate({
                                                ...layoutConfig,
                                                imageCount: parseInt(e.target.value) || 1
                                            })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-indigo-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div
                                                className={clsx(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    layoutConfig.includeHero
                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                        : "border-slate-600 bg-slate-900 group-hover:border-slate-500"
                                                )}
                                                onClick={() => onLayoutConfigUpdate({
                                                    ...layoutConfig,
                                                    includeHero: !layoutConfig.includeHero
                                                })}
                                            >
                                                {layoutConfig.includeHero && <CheckCircle size={14} />}
                                            </div>
                                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Generate Hero Image?</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Image Placement Instructions
                                    </label>
                                    <textarea
                                        value={layoutConfig.instructions}
                                        onChange={(e) => onLayoutConfigUpdate({
                                            ...layoutConfig,
                                            instructions: e.target.value
                                        })}
                                        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none font-mono leading-relaxed"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        These instructions guide the AI on how to select sections and space images.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptConfigModal;
