"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { estimateTranslation, startTranslation } from "@/actions/translations";
import { getWallet } from "@/actions/wallet";
import { 
  Upload, FileText, Coins, ArrowRight, Loader2, 
  CheckCircle, AlertCircle, Languages, Sparkles,
  Zap, ChevronRight, X, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import { TranslationTerminal } from "@/components/translate/TranslationTerminal";

interface EstimateResult {
  translatableLineCount: number;
  estimatedCreditCost: number;
  fileSize: number;
  fileName: string;
}

export default function NewTranslationPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("vi");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // Terminal states
  const [showTerminal, setShowTerminal] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<"idle" | "processing" | "done" | "failed">("idle");
  const [translationProgress, setTranslationProgress] = useState(0);
  const [jobResult, setJobResult] = useState<any>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      const { wallet } = await getWallet();
      if (wallet) setBalance(Number(wallet.balance));
    };
    fetchBalance();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setEstimating(true);

    // Read content for terminal "Fast Render"
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string || "");
    };
    reader.readAsText(uploadedFile);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const result = await estimateTranslation(formData);
      if (result.error) {
        toast.error(result.error);
        setFile(null);
      } else if (result.data) {
        setEstimate(result.data);
      }
    } catch (err) {
      toast.error("An error occurred during estimation");
      setFile(null);
    } finally {
      setEstimating(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-yaml': ['.yml', '.yaml'],
      'application/json': ['.json'],
      'text/plain': ['.lang', '.properties']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const handleStartTranslation = async () => {
    if (!file || !estimate) return;

    setLoading(true);
    setShowTerminal(true);
    setTranslationStatus("processing");
    setTranslationProgress(0.1);

    const startTime = Date.now();

    // Simulated progress increments
    const interval = setInterval(() => {
      setTranslationProgress(prev => {
        if (prev >= 0.9) return prev;
        return prev + 0.05;
      });
    }, 1500);

    try {
      const result = await startTranslation(file, "en", targetLanguage);
      
      clearInterval(interval);

      if (result.error) {
        setTranslationStatus("failed");
        if ((result as any).required) {
          const required = (result as any).required;
          toast.error(`${result.error}. Need ${required} credits but you have ${balance}.`, {
            action: {
              label: "Get Credits",
              onClick: () => router.push("/dashboard/wallet")
            }
          });
        } else {
          toast.error(result.error);
        }
        // Small delay to let user see error in terminal then go back
        setTimeout(() => {
          setShowTerminal(false);
          setLoading(false);
        }, 3000);
      } else {
        setTranslationProgress(1);
        setTranslationStatus("done");
        setJobResult({
          ...result,
          time: Date.now() - startTime
        });
        toast.success("Translation completed successfully!");
      }
    } catch (err) {
      clearInterval(interval);
      setTranslationStatus("failed");
      toast.error("Failed to start translation");
      setTimeout(() => setShowTerminal(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canTranslate = estimate && balance >= estimate.estimatedCreditCost;

  return (
    <div className="min-h-[calc(100vh-120px)] w-full flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Cinematic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[160px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] -z-10 animate-pulse" />
      
      <AnimatePresence mode="wait">
        {showTerminal ? (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -20 }}
            className="w-full max-w-6xl z-10"
          >
            <div className="space-y-4 text-center mb-10">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent"
              >
                NEXUS AI EXECUTION
              </motion.h1>
              <div className="flex justify-center items-center gap-3 text-zinc-500">
                <FileText className="w-4 h-4" />
                <span className="font-mono text-xs uppercase tracking-[0.3em]">{file?.name}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className={`text-xs font-black uppercase tracking-widest ${translationStatus === 'done' ? 'text-emerald-500' : 'text-sky-500 animate-pulse'}`}>
                  {translationStatus === 'done' ? 'Completed' : 'Processing...'}
                </span>
              </div>
            </div>
            
            <TranslationTerminal 
              fileName={file?.name || ""}
              fileContent={fileContent}
              status={translationStatus}
              progress={translationProgress}
              result={jobResult}
              error={translationStatus === "failed" ? "Translation execution failed." : undefined}
            />

            <AnimatePresence>
              {translationStatus === "done" && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex justify-center gap-6 mt-12"
                >
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => {
                        setShowTerminal(false);
                        setFile(null);
                        setEstimate(null);
                    }} 
                    className="text-zinc-500 hover:text-white font-bold uppercase tracking-widest text-xs"
                  >
                    Dịch tệp khác
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => router.push("/dashboard/translations")} 
                    className="bg-zinc-100 hover:bg-white text-black font-black px-8 rounded-2xl"
                  >
                    Quản lý bản dịch <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="w-full max-w-4xl space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 mb-2">
                  NEW TRANSLATION
                </h1>
                <p className="text-zinc-500 text-sm md:text-base font-medium max-w-lg mx-auto uppercase tracking-[0.2em]">
                  AI-Powered Minecraft Plugin Localization
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative"
              >
                <div className="absolute top-0 right-0 p-8">
                  <Sparkles className="w-6 h-6 text-sky-500/20 animate-pulse" />
                </div>

                <div className="space-y-10">
                  {/* Step 1: Upload */}
                  {!estimate && !estimating ? (
                    <div
                      {...getRootProps()}
                      className={`
                        group relative border-2 border-dashed rounded-[32px] p-16 text-center cursor-pointer transition-all duration-300
                        ${isDragActive ? 'border-sky-500/50 bg-sky-500/5 ring-4 ring-sky-500/10' : 'border-zinc-800 hover:border-zinc-700 hover:bg-white/[0.02]'}
                      `}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:scale-110 transition-transform duration-500 shadow-xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                          <Upload className={`w-8 h-8 ${isDragActive ? 'text-sky-400' : 'text-zinc-600'}`} />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-white">Drop your source file here</p>
                          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                            Supports <span className="text-zinc-300 font-mono">.yml, .yaml, .json, .lang, .properties</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : estimating ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6">
                      <div className="relative">
                          <Loader2 className="w-16 h-16 text-sky-500 animate-spin" />
                          <div className="absolute inset-0 blur-xl bg-sky-500/20 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xl font-bold text-white animate-pulse uppercase tracking-[0.2em] text-xs">Phân tích dữ liệu...</p>
                    </div>
                  ) : null}

                  {/* Step 2: Configuration */}
                  <AnimatePresence>
                    {estimate && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12"
                      >
                        {/* File Details Bar */}
                        <div className="flex items-center justify-between pb-8 border-b border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                              <FileText className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white leading-tight">{file?.name}</p>
                              <p className="text-zinc-500 text-sm">{formatBytes(file?.size || 0)} • {estimate.translatableLineCount} strings</p>
                            </div>
                          </div>
                          <button 
                             onClick={() => {setFile(null); setEstimate(null);}}
                             className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                          >
                             <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {/* Selection */}
                          <div className="space-y-6">
                            <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.2em]">Localization Logic</p>
                            <div className="space-y-4">
                               <div className="p-6 rounded-2xl bg-zinc-950/50 border border-zinc-900 flex justify-between items-center group hover:border-zinc-800 transition-colors">
                                  <div className="space-y-1">
                                     <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Source</span>
                                     <p className="text-zinc-500 text-xs font-medium">Auto-Detect</p>
                                  </div>
                                  <span className="text-white font-black text-xl italic tracking-tight uppercase">English</span>
                               </div>

                               <div className="flex justify-center -my-4 relative z-10">
                                  <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center border-4 border-[#09090b] shadow-[0_0_20px_rgba(2,132,199,0.4)]">
                                     <ArrowRight className="w-5 h-5 text-white" />
                                  </div>
                               </div>

                               <div className="p-6 rounded-2xl bg-zinc-950/50 border border-zinc-900 space-y-3 group hover:border-sky-500/30 transition-all duration-500">
                                  <div className="flex justify-between items-center">
                                     <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Target Language</span>
                                     <span className="px-2 py-0.5 rounded bg-sky-500/10 text-[9px] font-black text-sky-500 uppercase">AI Optimized</span>
                                  </div>
                                  <Select value={targetLanguage} onValueChange={(val) => setTargetLanguage(val || "vi")}>
                                    <SelectTrigger className="border-none bg-transparent h-auto p-0 font-black text-2xl text-white hover:text-sky-400 focus:ring-0 transition-colors italic tracking-tight uppercase flex items-center justify-between">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/5 text-white">
                                       <SelectItem value="vi">Tiếng Việt</SelectItem>
                                       <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                                       <SelectItem value="ko">Korean</SelectItem>
                                       <SelectItem value="ja">Japanese</SelectItem>
                                       <SelectItem value="de">German</SelectItem>
                                       <SelectItem value="fr">French</SelectItem>
                                    </SelectContent>
                                  </Select>
                               </div>
                            </div>
                          </div>

                          {/* Cost Blueprint */}
                          <div className="space-y-6">
                            <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.2em]">Execution Blueprint</p>
                            <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-900 space-y-4">
                               <div className="flex justify-between items-center text-sm font-medium">
                                  <span className="text-zinc-500">Cost Analysis</span>
                                  <div className="flex items-center gap-2">
                                     <Coins className="w-4 h-4 text-amber-500" />
                                     <span className="text-amber-500 font-mono font-black">{estimate.estimatedCreditCost}</span>
                                  </div>
                               </div>
                               <div className="h-px bg-white/5 w-full" />
                               <div className="flex justify-between items-center text-sm">
                                  <span className="text-zinc-500">Balance After</span>
                                  <span className={`font-mono font-bold ${balance >= estimate.estimatedCreditCost ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {(balance - estimate.estimatedCreditCost).toFixed(2)}
                                  </span>
                               </div>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="pt-4">
                          <Button
                            className={`w-full py-10 rounded-[28px] text-xl font-black transition-all gap-4
                               ${balance >= estimate.estimatedCreditCost ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_20px_50px_rgba(2,132,199,0.3)]' : 'bg-zinc-800 text-zinc-500'}
                            `}
                            onClick={handleStartTranslation}
                            disabled={loading || !canTranslate}
                          >
                            <Zap className="w-6 h-6 fill-current" />
                            BẮT ĐẦU VIỆT HÓA
                            <ChevronRight className="w-6 h-6" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}