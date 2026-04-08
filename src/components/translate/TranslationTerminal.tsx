"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Zap, Check, AlertCircle, Loader2, ChevronRight, Download, FileText, Clock, Box, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface TerminalLine {
  id: string;
  text: string;
  type: "info" | "success" | "error" | "command";
}

interface TranslationResult {
  jobId: string;
  output: string;
  downloadUrl: string;
  fileName: string;
  size: number;
  time: number;
  translatedCount?: number;
}

interface TranslationTerminalProps {
  fileName: string;
  fileContent: string;
  status: "idle" | "processing" | "done" | "failed";
  progress?: number;
  error?: string;
  result?: TranslationResult;
}

export function TranslationTerminal({ 
  fileName, 
  fileContent, 
  status,
  progress = 0,
  error,
  result
}: TranslationTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [displayText, setDisplayText] = useState<string>(fileContent);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLine = (text: string, type: TerminalLine["type"] = "info") => {
    setLines(prev => [
      ...prev, 
      { id: Math.random().toString(36).substr(2, 9), text, type }
    ]);
  };

  useEffect(() => {
    if (status === "processing" && lines.length === 0) {
      const sequence = async () => {
        addLine(`nex-ai translate --target file`, "command");
        await delay(500);
        addLine("Đang phân tích cấu trúc tệp...", "info");
        await delay(1000);
        addLine("Cloud Engine initialized", "success");
        await delay(800);
        addLine("Liên kết Gemini 2.0 Flash...", "info");
        await delay(1200);
        addLine("Đã xác định " + (fileContent.split('\n').length) + " dòng dữ liệu", "success");
      };
      sequence();
    }
  }, [status, fileContent]);

  useEffect(() => {
    if (status === "done" && result) {
      addLine("Build completed successfully", "success");
      // MORPH EFFECT: Switch content to translated version
      setTimeout(() => {
        setDisplayText(result.output);
      }, 500);
    } else if (status === "failed") {
      addLine(`Lỗi: ${error || "Critical failure during execution"}`, "error");
    }
  }, [status, error, result]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleDownload = async () => {
    if (result?.downloadUrl) {
      try {
        // Force the filename by fetching as blob and creating a local URL
        const response = await fetch(result.downloadUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const finalName = `${baseName}.vi${extension}`;
        
        link.setAttribute('download', finalName);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Failed to download file as blob:", err);
        // Fallback to direct link if fetch fails
        window.open(result.downloadUrl, '_blank');
      }
    } else {
      console.error("Download URL not found in result", result);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full h-[650px]">
      {/* Left Column: Terminal */}
      <div className="bg-[#050505] border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="bg-zinc-900/40 backdrop-blur-md px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
             </div>
             <div className="h-4 w-px bg-zinc-800" />
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Terminal Output</span>
          </div>
          {status === "done" && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black text-emerald-500 tracking-widest uppercase"
            >
              <Check className="w-2.5 h-2.5" />
              Ready
            </motion.div>
          )}
        </div>

        <div className="flex-1 p-8 font-mono text-[13px] overflow-y-auto custom-scrollbar" ref={scrollRef}>
          <div className="space-y-4">
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-3">
                  {line.type === "command" && <span className="text-zinc-600 font-bold">$</span>}
                  <span className={`
                    leading-relaxed
                    ${line.type === "command" ? "text-white font-bold" : ""}
                    ${line.type === "success" ? "text-emerald-400 font-bold" : ""}
                    ${line.type === "error" ? "text-red-400" : ""}
                    ${line.type === "info" ? "text-zinc-500" : ""}
                    ${!line.type ? "text-zinc-400" : ""}
                  `}>
                    {line.text}
                  </span>
                </div>
                {line.type === "command" && (
                  <div className="text-blue-400 font-black italic ml-8 text-[11px] px-2 py-0.5 rounded bg-blue-500/5 inline-block w-fit">
                    {fileName}
                  </div>
                )}
              </motion.div>
            ))}
            
            {status === "done" && result && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.8 }}
                className="space-y-8 pt-6"
              >
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent w-full" />
                
                <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-4 px-2 text-[11px]">
                  <span className="text-zinc-600 font-black uppercase tracking-widest">Artifact</span>
                  <span className="text-sky-400 font-black italic underline decoration-sky-900 underline-offset-4">
                    {fileName.substring(0, fileName.lastIndexOf('.'))}.vi{fileName.substring(fileName.lastIndexOf('.'))}
                  </span>
                  
                  <span className="text-zinc-600 font-black uppercase tracking-widest">Size</span>
                  <span className="text-zinc-400 font-bold">
                    {result.size ? (result.size / 1024).toFixed(2) : "0.00"} KB
                  </span>
                  
                  <span className="text-zinc-600 font-black uppercase tracking-widest">Execution</span>
                  <span className="text-zinc-400 font-bold">{result.time || 0}ms</span>
                </div>

                <div className="space-y-4">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-8 rounded-2xl flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98]"
                    onClick={handleDownload}
                  >
                    <Download className="w-6 h-6 animate-bounce" />
                    TẢI BẢN DỊCH NGAY
                  </Button>
                  <div className="text-center">
                    <button className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-white transition-colors">
                      Export as JSON Sequence
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {status === "processing" && (
              <motion.div 
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-2 h-5 bg-white shadow-[0_0_10px_white] inline-block align-middle ml-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Fast Render (Morphing) */}
      <div className="bg-[#050505] border border-zinc-800 rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="bg-zinc-900/40 backdrop-blur-md px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Zap className={`w-4 h-4 ${status === 'done' ? 'text-emerald-500 fill-current' : 'text-blue-500 fill-current'}`} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 italic">
               Fast Render <span className="text-zinc-600 font-normal ml-1">({status === 'done' ? 'Translated' : 'Source'})</span>
             </span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
            {status === "processing" && (
              <div className="flex items-center gap-2 text-blue-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />
                SYCHRONIZING...
              </div>
            )}
            {status === "done" && (
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="w-3 h-3" />
                VERIFIED
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="p-10 text-[12px] font-mono leading-relaxed relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayText}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.5 }}
                  className="whitespace-pre"
                >
                  {displayText.split('\n').map((line, i) => {
                    const isKeyVal = line.includes(':');
                    const parts = isKeyVal ? line.split(':') : [line];
                    
                    return (
                      <div key={i} className="flex hover:bg-white/[0.03] py-0.5 rounded px-2 -mx-2 group transition-colors">
                        <span className="inline-block w-8 text-zinc-800 select-none flex-shrink-0 font-bold mr-6 group-hover:text-zinc-600 transition-colors">
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        {isKeyVal ? (
                          <div className="flex flex-wrap gap-x-2">
                            <span className="text-zinc-100 font-bold">{parts[0]}</span>
                            <span className="text-zinc-800">:</span>
                            <span className={`${status === 'done' ? 'text-emerald-400' : 'text-sky-400'} italic font-medium`}>
                              {parts.slice(1).join(':').trim() || " "}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">{line}</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>

          {status === "processing" && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-950">
              <motion.div 
                className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
