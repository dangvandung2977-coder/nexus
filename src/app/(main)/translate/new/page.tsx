"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { estimateTranslation, startTranslation } from "@/actions/translations";
import { getWallet } from "@/actions/wallet";
import { Upload, FileText, Coins, ArrowRight, Loader2, CheckCircle, AlertCircle, Zap, Shield, Sparkles, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TranslationTerminal } from "@/components/translate/TranslationTerminal";
import { type EstimateResult } from "@/types";

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
    getWallet().then(({ wallet }) => {
      if (wallet) setBalance(Number(wallet.balance));
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setEstimating(true);

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
      toast.error("Lỗi khi phân tích tệp tin");
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

    const interval = setInterval(() => {
      setTranslationProgress(prev => {
        if (prev >= 0.9) return prev;
        return prev + 0.05;
      });
    }, 1500);

    const result = await startTranslation(file, "en", targetLanguage);

    clearInterval(interval);

    if (result.error) {
      setTranslationStatus("failed");
      if ((result as any).required) {
        const required = (result as any).required;
        toast.error(`${result.error}. Cần ${required} credits nhưng bạn chỉ có ${balance}.`, {
          action: {
            label: "Nạp thêm",
            onClick: () => router.push("/dashboard/wallet")
          }
        });
      } else {
        toast.error(result.error);
      }
      setTimeout(() => setShowTerminal(false), 4000);
    } else {
      setTranslationProgress(1);
      setTranslationStatus("done");
      setJobResult({
        ...result,
        time: Date.now() - startTime
      });
      toast.success("Việt hóa hoàn tất!");
    }

    setLoading(false);
  };
  const canTranslate = estimate && balance >= (estimate?.estimatedCreditCost || 0);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center py-20 px-4 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

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
                <span className="font-mono text-sm uppercase tracking-widest">{file?.name}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-sm font-bold text-sky-500 uppercase">Processing...</span>
              </div>
            </div>
            
            <TranslationTerminal 
              fileName={file?.name || ""}
              fileContent={fileContent}
              status={translationStatus}
              progress={translationProgress}
              result={jobResult}
              error={translationStatus === "failed" ? "Translation failed. Check logs for details." : undefined}
            />

            <AnimatePresence>
              {translationStatus === "done" && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-6 mt-12"
                >
                  <Button variant="ghost" size="lg" onClick={() => setShowTerminal(false)} className="text-zinc-500 hover:text-white font-bold">
                    Dịch tệp khác
                  </Button>
                  <Button size="lg" onClick={() => router.push("/dashboard/translations")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8">
                    Quản lý bản dịch <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-4xl z-10 flex flex-col items-center"
          >
            <div className="text-center space-y-4 mb-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4"
              >
                <Sparkles className="w-3 h-3" />
                Dịch thuật Minecraft AI v2.0
              </motion.div>
              <h1 className="text-6xl font-black tracking-tight text-zinc-900 dark:text-white italic underline decoration-blue-500/30 underline-offset-8">
                Việt Hóa Plugin
              </h1>
              <p className="text-zinc-600 dark:text-zinc-500 text-xl font-medium max-w-2xl mx-auto">
                Tải lên tệp ngôn ngữ của bạn và để hệ thống Nexus AI xử lý quá trình dịch tự động trong giây lát.
              </p>
            </div>

            <div className={`w-full ${estimate ? 'grid grid-cols-1 lg:grid-cols-12 gap-12 items-start' : 'flex flex-col items-center justify-center'} transition-all duration-700`}>
              <div className={`${estimate ? 'lg:col-span-7' : 'w-full max-w-2xl text-center'} space-y-8`}>
                <div
                  {...getRootProps()}
                  className={`
                    relative group border-2 border-dashed rounded-3xl p-1 w-full transition-all duration-500
                    ${isDragActive ? 'border-blue-500 scale-[1.02]' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}
                    ${file ? 'border-emerald-500' : ''}
                  `}
                >
                  <div className={`
                    w-full rounded-[20px] p-12 flex flex-col items-center justify-center gap-6 transition-all duration-500
                    ${isDragActive ? 'bg-blue-500/10' : 'bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/50 dark:border-none'}
                    ${file ? 'bg-emerald-500/5' : ''}
                  `}>
                    <input {...getInputProps()} />
                    
                    {estimating ? (
                      <div className="flex flex-col items-center gap-6 py-10">
                        <div className="relative">
                          <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                          <div className="absolute inset-0 blur-xl bg-blue-500/30 animate-pulse" />
                        </div>
                        <p className="text-zinc-400 font-black uppercase tracking-widest">Đang phân tích...</p>
                      </div>
                    ) : file ? (
                      <div className="flex flex-col items-center gap-6 py-4">
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-2xl text-zinc-900 dark:text-white mb-1">{file.name}</p>
                          <p className="text-sm text-zinc-500 font-mono tracking-tighter italic">
                            HASH ID: {Math.random().toString(36).substring(7).toUpperCase()}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-zinc-600 hover:text-red-400 font-bold uppercase tracking-tighter"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setEstimate(null);
                          }}
                        >
                          Hủy bỏ và chọn lại
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-8 py-10 group-hover:scale-105 transition-transform duration-500">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-3xl bg-zinc-800/50 flex items-center justify-center border border-zinc-700/30 shadow-inner">
                            <Upload className="w-10 h-10 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <Zap className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-black text-2xl text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Kéo thả file vào đây</p>
                          <p className="text-zinc-600 dark:text-zinc-500 text-lg mt-1">hoặc nhấn để chọn từ thiết bị</p>
                        </div>
                        <div className="flex gap-2">
                          {['YML', 'JSON', 'LANG'].map(ext => (
                            <span key={ext} className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">{ext}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`grid ${estimate ? 'grid-cols-3' : 'grid-cols-3 w-full'} gap-4`}>
                  {[
                    { icon: Shield, label: "Bảo mật", desc: "Data Encrypted" },
                    { icon: Globe, label: "Đa ngôn ngữ", desc: "8+ Languages" },
                    { icon: Sparkles, label: "AI Gemini", desc: "Gemini 2.0" }
                  ].map((feat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 flex flex-col items-center text-center gap-2">
                       <feat.icon className="w-5 h-5 text-zinc-500 dark:text-zinc-600" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-400">{feat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                {estimate ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                      <CardHeader className="bg-zinc-800/30 border-b border-zinc-800">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Chi tiết thanh toán
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-zinc-800/50">
                          <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                               <span className="text-zinc-500 font-bold uppercase text-xs">Ngôn ngữ nguồn</span>
                               <span className="text-white font-black italic">English (Auto)</span>
                             </div>
                             <div className="space-y-2">
                               <span className="text-zinc-500 font-bold uppercase text-xs">Ngôn ngữ đích</span>
                               <Select value={targetLanguage} onValueChange={(val) => setTargetLanguage(val || "vi")}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-800 h-10 font-bold rounded-xl text-blue-400">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                                  <SelectItem value="zh">Tiếng Trung</SelectItem>
                                  <SelectItem value="ko">Tiếng Hàn</SelectItem>
                                  <SelectItem value="ja">Tiếng Nhật</SelectItem>
                                  <SelectItem value="de">Tiếng Đức</SelectItem>
                                  <SelectItem value="fr">Tiếng Pháp</SelectItem>
                                  <SelectItem value="es">Tiếng Tây Ban Nha</SelectItem>
                                  <SelectItem value="ru">Tiếng Nga</SelectItem>
                                </SelectContent>
                              </Select>
                             </div>
                          </div>

                          <div className="p-6 bg-blue-500/5">
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                  <Coins className="w-5 h-5 text-amber-500" />
                                </div>
                                <span className="font-bold text-zinc-300">Tổng chi phí</span>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-amber-500 tracking-tighter">-{estimate.estimatedCreditCost} <span className="text-xs uppercase">CREDITS</span></p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{estimate.translatableLineCount} Dòng cần dịch</p>
                              </div>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-zinc-950/50 flex justify-between items-center">
                               <span className="text-zinc-500 text-xs font-bold uppercase">Số dư còn lại</span>
                               <span className={`font-black tracking-widest ${balance >= estimate.estimatedCreditCost ? 'text-emerald-500' : 'text-red-500'}`}>
                                 {(balance - estimate.estimatedCreditCost).toFixed(2)}
                               </span>
                            </div>
                          </div>
                        </div>

                        {balance < estimate.estimatedCreditCost && (
                          <div className="p-6 bg-red-500/10 rounded-b-3xl">
                             <div className="flex items-center gap-2 text-red-500 mb-2">
                               <AlertCircle className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Nạp thêm điểm</span>
                             </div>
                             <p className="text-xs text-red-300">Bạn đang thiếu { (estimate.estimatedCreditCost - balance).toFixed(2) } credits.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Button
                      className={`w-full h-16 text-xl font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all duration-300 rounded-3xl
                        ${canTranslate ? 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 text-white' : 'bg-zinc-800 text-zinc-600'}
                      `}
                      onClick={handleStartTranslation}
                      disabled={loading || !canTranslate}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          INITIALIZING...
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6 mr-3 fill-current text-blue-100" />
                          Xác nhận & Việt Hóa
                        </>
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center p-12 bg-zinc-900/10 border border-zinc-800/10 border-dashed rounded-[40px] text-center gap-6">
                    <div className="w-20 h-20 rounded-full border border-zinc-800/50 flex items-center justify-center animate-bounce duration-[2000ms]">
                      <FileText className="w-8 h-8 text-zinc-800" />
                    </div>
                    <div>
                      <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">HƯỚNG DẪN</p>
                      <p className="text-zinc-700 text-sm font-medium">Bắt đầu bằng cách kéo tệp tin của bạn vào khu vực bên trái.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}