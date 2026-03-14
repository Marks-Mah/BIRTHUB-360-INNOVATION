"use client";
import React, { useState, useRef } from 'react';
import { ArrowLeft, Zap, Save, Copy, ImagePlus, Loader2, Cpu, Scissors, Briefcase, Languages, Trash2, Download } from 'lucide-react';
import { marked } from 'marked';
import { dashboardLogger } from '../../lib/logger';
import { sanitize } from '../../lib/sanitize';
import { Tool, ModuleType } from '../../lib/sales-os/types';
import { generateText, generateImage } from '../../lib/sales-os/services/gemini';
import { saveHistory } from '../../lib/sales-os/services/storage';

interface ToolViewProps {
    tool: Tool;
    moduleName: string;
    onBack: () => void;
}

export const ToolView: React.FC<ToolViewProps> = ({ tool, moduleName, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState<string>('');
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
    };

    const execute = async () => {
        setLoading(true);
        setOutput('');

        try {
            // Collect Input Data
            let inputSummary = Object.entries(formData).map(([key, val]) => `${key}: ${val}`).join('\n');
            if (!inputSummary && !imageFile) inputSummary = "No specific input provided.";

            if (tool.isImage) {
                // Generate Image
                const prompt = `${tool.prompt}. Context: ${inputSummary}`;
                const base64Image = await generateImage(prompt);
                if (base64Image) {
                    setOutput(`![Generated Image](${base64Image})`);
                    saveHistory(tool.name, moduleName as ModuleType, 'Generated Image');
                } else {
                    setOutput("Failed to generate image.");
                }
            } else {
                // Generate Text
                let imageParts = undefined;
                if (tool.acceptsImage && imageFile) {
                    const part = await fileToGenerativePart(imageFile);
                    imageParts = [part];
                }

                const fullPrompt = `Task: ${tool.prompt}\n\nInput Data:\n${inputSummary}\n\nInstructions: Provide a professional, structured response.`;

                const text = await generateText(fullPrompt, "You are an elite Sales OS AI.", imageParts, tool.useSearch);
                setOutput(text);
                saveHistory(tool.name, moduleName as ModuleType, text);
            }
        } catch (e) {
            dashboardLogger.error({ error: e }, "Tool execution failed");
            setOutput("Error generating response. Please check API Key and limits.");
        } finally {
            setLoading(false);
        }
    };

    const refine = async (type: 'shorter' | 'formal' | 'english') => {
        if (!output) return;
        setLoading(true);
        let prompt = "";
        if (type === 'shorter') prompt = "Summarize the following text concisely:";
        if (type === 'formal') prompt = "Rewrite the following text to be more formal and executive:";
        if (type === 'english') prompt = "Translate the following text to Business English:";

        try {
            const text = await generateText(`${prompt}\n\n${output}`);
            setOutput(text);
        } catch(e) { dashboardLogger.error({ error: e }, "Tool execution failed"); }
        finally { setLoading(false); }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output);
        // Toast logic could go here
    };

    const clearInputs = () => {
        setFormData({});
        setImageFile(null);
        setOutput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadCSV = () => {
        if (!output) return;
        const csvContent = "data:text/csv;charset=utf-8," + output.replace(/\n/g, ",").replace(/#/g, "");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${tool.id}_output.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-pop-in">
            {/* Input Panel */}
            <div className="lg:col-span-5 flex flex-col gap-5 h-full">
                <div className="glass p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-full bg-white/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-white hover:text-brand-primary transition-all dark:text-white text-slate-900 shadow-md">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className={`flex items-center gap-2 bg-${tool.color}-500/10 px-3 py-1.5 rounded-full border border-${tool.color}-500/20`}>
                            <h3 className={`text-[10px] font-black uppercase text-${tool.color}-500 tracking-widest`}>{tool.name}</h3>
                        </div>
                        <button onClick={clearInputs} className="ml-auto w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-rose-500" title="Clear Inputs">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {tool.fields ? tool.fields.map(field => (
                             <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">{field.label}</label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        placeholder={field.placeholder}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-medium outline-none h-24 focus:border-brand-primary/50 dark:text-white text-slate-800 resize-none transition-all focus:-translate-y-0.5"
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-brand-primary/50 dark:text-white text-slate-800 appearance-none transition-all"
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder={field.placeholder}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-brand-primary/50 dark:text-white text-slate-800 transition-all focus:-translate-y-0.5"
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    />
                                )}
                            </div>
                        )) : (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-3">Context</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-medium outline-none h-32 resize-none"
                                    placeholder="Enter details..."
                                    value={formData['general'] || ''}
                                    onChange={(e) => handleInputChange('general', e.target.value)}
                                />
                            </div>
                        )}

                        {tool.acceptsImage && (
                            <div className="mt-2">
                                <label className={`flex items-center gap-2 cursor-pointer w-full justify-center px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 transition-all hover:border-${tool.color}-500/50`}>
                                    <ImagePlus className={`w-4 h-4 text-${tool.color}-400`} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        {imageFile ? imageFile.name : "Upload Image Analysis"}
                                    </span>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 shrink-0">
                        <button
                            onClick={execute}
                            disabled={loading}
                            className={`w-full py-3.5 bg-gradient-to-r from-${tool.color}-500 to-${tool.color}-600 rounded-xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 text-white shadow-lg shadow-${tool.color}-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{tool.isImage ? "GENERATING VISUAL..." : "ANALYZING DATA..."}</span>
                                </div>
                            ) : <><span>Run Protocol</span><Zap className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Output Panel */}
            <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
                <div className="glass flex-1 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative flex flex-col border border-white/10 bg-white/50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full bg-${tool.color}-500 animate-pulse shadow-[0_0_10px_currentColor]`}></div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Gemini 3 Output</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={downloadCSV} className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all active:scale-90" title="Download CSV">
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={copyToClipboard} className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-indigo-400 shadow-lg shadow-brand-primary/30 transition-all active:scale-90" title="Copy Output">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(tool.prompt)} className="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center hover:bg-slate-400 shadow-lg shadow-slate-500/30 transition-all active:scale-90" title="Copy Prompt">
                                <Zap className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 text-sm leading-relaxed dark:text-slate-200 text-slate-700 custom-scrollbar overflow-y-auto whitespace-pre-wrap font-medium p-1 relative">
                        {output ? (
                            <>
                                {/* Sanitiza markdown renderizado de output dinâmico de IA para bloquear scripts e handlers maliciosos. */}
                                <div className="prose dark:prose-invert max-w-none text-xs md:text-sm" dangerouslySetInnerHTML={{ __html: sanitize(marked.parse(output) as string) }} />
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <Cpu className="w-8 h-8" />
                                </div>
                                <p className="uppercase tracking-[0.3em] font-black text-[10px]">Awaiting Data...</p>
                            </div>
                        )}
                    </div>

                    {output && !tool.isImage && (
                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                            <button onClick={() => refine('shorter')} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors dark:text-white text-slate-600"><Scissors className="w-3 h-3" /> Shorten</button>
                            <button onClick={() => refine('formal')} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors dark:text-white text-slate-600"><Briefcase className="w-3 h-3" /> Formal</button>
                            <button onClick={() => refine('english')} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors dark:text-white text-slate-600"><Languages className="w-3 h-3" /> English</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
