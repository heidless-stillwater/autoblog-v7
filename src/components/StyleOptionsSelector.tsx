import React from 'react';
import { Layout, Palette, Sun, Camera, Check } from 'lucide-react';
import clsx from 'clsx';
import type { StyleOptions } from '../types';

interface StyleOptionsSelectorProps {
    options: StyleOptions;
    onUpdate: (options: StyleOptions) => void;
}

const OPTIONS = {
    // ... same as before
    composition: [
        { label: 'Rule of Thirds', value: 'rule of thirds composition' },
        { label: 'Wide Angle', value: 'wide angle shot' },
        { label: 'Macro/Close-up', value: 'extremely detailed macro close-up' },
        { label: 'Low Angle', value: 'powerful low angle perspective' },
        { label: 'Symmetrical', value: 'perfectly symmetrical framing' }
    ],
    medium: [
        { label: 'Professional Photography', value: 'award-winning professional photography' },
        { label: 'Digital Illustration', value: 'vibrant modern digital illustration' },
        { label: 'Hyperrealistic 3D', value: 'hyperrealistic 3D render, octane render' },
        { label: 'Minimalist Vector', value: 'clean minimalist vector art' },
        { label: 'Oil Painting', value: 'expressive classical oil painting' }
    ],
    lighting: [
        { label: 'Cinematic', value: 'cinematic lighting with volumetric fog' },
        { label: 'Golden Hour', value: 'warm golden hour sunlight' },
        { label: 'Soft Box', value: 'soft studio box lighting' },
        { label: 'Neon/Vibrance', value: 'neon glow, high contrast lighting' },
        { label: 'Dramatic Noir', value: 'dramatic high-contrast noir shadows' }
    ],
    mood: [
        { label: 'Epic & Heroic', value: 'epic heroic atmosphere' },
        { label: 'Dark & Moody', value: 'dark moody atmospheric feel' },
        { label: 'Clean & Minimal', value: 'clean professional minimalist mood' },
        { label: 'Warm & Nostalgic', value: 'warm nostalgic vintage feel' },
        { label: 'Vibrant & Bold', value: 'bold vibrant energetic colors' }
    ]
};

const StyleOptionsSelector: React.FC<StyleOptionsSelectorProps> = ({ options, onUpdate }) => {
    const toggleOption = (category: keyof StyleOptions, value: string) => {
        onUpdate({
            ...options,
            [category]: options[category] === value ? '' : value
        });
    };

    return (
        <div className="space-y-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Composition */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Layout size={12} className="text-indigo-400" />
                        Composition & Perspective
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {OPTIONS.composition.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleOption('composition', opt.value)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                    options.composition === opt.value
                                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                {options.composition === opt.value && <Check size={12} />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Medium */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Camera size={12} className="text-emerald-400" />
                        Medium & Technique
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {OPTIONS.medium.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleOption('medium', opt.value)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                    options.medium === opt.value
                                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                {options.medium === opt.value && <Check size={12} />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lighting */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Sun size={12} className="text-amber-400" />
                        Lighting Style
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {OPTIONS.lighting.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleOption('lighting', opt.value)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                    options.lighting === opt.value
                                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                {options.lighting === opt.value && <Check size={12} />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mood */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Palette size={12} className="text-purple-400" />
                        Vibe & Palette
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {OPTIONS.mood.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleOption('mood', opt.value)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                    options.mood === opt.value
                                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                {options.mood === opt.value && <Check size={12} />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StyleOptionsSelector;
