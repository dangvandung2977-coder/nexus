"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Plus, Loader2, Image as ImageIcon, FileUp,
  Save, Send, ChevronDown, Monitor, Cpu, Globe,
  DollarSign, Shield, Info, Video, HelpCircle,
  ExternalLink, Layers, History, Settings, ListChecks
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createListingSchema, type CreateListingInput } from "@/lib/validations/listing";
import { createListing, updateListing } from "@/actions/listings";
import { uploadListingCover, uploadListingScreenshot, uploadListingFile } from "@/actions/files";
import { SUPPORTED_PLATFORMS } from "@/lib/constants";
import type { Category } from "@/types";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ListingFormProps {
  categories: Category[];
  listing?: any;
}

export function ListingForm({ categories, listing }: ListingFormProps) {
  const router = useRouter();
  const isEdit = !!listing;
  const [tagInput, setTagInput] = useState("");
  const [depInput, setDepInput] = useState("");
  const [activeSection, setActiveSection] = useState("basic");
  
  const [uploading, setUploading] = useState<"cover" | "screenshot" | "file" | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(listing?.cover_image_url ?? null);
  const [screenshots, setScreenshots] = useState<any[]>(listing?.listing_images ?? []);
  const [files, setFiles] = useState<any[]>(listing?.listing_files ?? []);

  // Pending uploads for "Manual Save" behavior
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [pendingScreenshots, setPendingScreenshots] = useState<File[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the section closest to the top of the viewport
        const visibleSection = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visibleSection) {
          setActiveSection(visibleSection.target.id);
        }
      },
      { threshold: 0.1, rootMargin: "-80px 0px -70% 0px" }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema) as any,
    defaultValues: {
      title: listing?.title ?? "",
      short_description: listing?.short_description ?? "",
      description: listing?.description ?? "",
      category_id: listing?.category_id ?? undefined,
      external_url: listing?.external_url ?? "",
      youtube_url: listing?.youtube_url ?? "",
      license: listing?.license ?? "MIT",
      is_open_source: listing?.is_open_source ?? false,
      platforms: listing?.platforms ?? [],
      supported_versions: listing?.supported_versions ?? [],
      dependencies: listing?.dependencies ?? [],
      tags: listing?.listing_tags?.map((lt: any) => lt.tags.name) ?? [],
      price: listing?.price ?? 0,
      currency: listing?.currency ?? "USD",
      credit_cost: listing?.credit_cost ?? 0,
      changelog: listing?.changelog ?? "",
      status: listing?.status ?? "draft",
    },
  });

  const tags = watch("tags") ?? [];
  const platforms = watch("platforms") ?? [];
  const dependencies = watch("dependencies") ?? [];
  const isPaid = watch("price") > 0;
  const creditCost = watch("credit_cost") ?? 0;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setValue("tags", [...tags, t], { shouldDirty: true });
      setTagInput("");
    }
  };

  const addDependency = () => {
    const d = depInput.trim();
    if (d && !dependencies.includes(d)) {
      setValue("dependencies", [...dependencies, d], { shouldDirty: true });
      setDepInput("");
    }
  };

  const removeTag = (tag: string) => setValue("tags", tags.filter((t) => t !== tag), { shouldDirty: true });
  const removeDependency = (dep: string) => setValue("dependencies", dependencies.filter((d) => d !== dep), { shouldDirty: true });

  const togglePlatform = (p: string) => {
    const newVal = platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p];
    setValue("platforms", newVal, { shouldDirty: true });
  };

  const onSubmit = async (data: CreateListingInput, publish = false) => {
    const payload = { ...data, status: publish ? "published" : "draft" } as CreateListingInput;

    let result;
    if (isEdit) {
      result = await updateListing(listing.id, payload);
    } else {
      // Use fallback title if empty for initial auto-draft
      if (!payload.title) payload.title = "Untitled Resource";
      result = await createListing(payload);
    }

    if (result.error) {
      toast.error(result.error);
      return null;
    }

    const listingId = isEdit ? listing.id : result.data?.id;

    // Handle Pending Uploads
    try {
      if (pendingCover) {
        setUploading("cover");
        const fd = new FormData();
        fd.append("file", pendingCover);
        await uploadListingCover(listingId, fd);
        setPendingCover(null);
      }

      if (pendingScreenshots.length > 0) {
        setUploading("screenshot");
        for (const file of pendingScreenshots) {
          const fd = new FormData();
          fd.append("file", file);
          await uploadListingScreenshot(listingId, fd);
        }
        setPendingScreenshots([]);
      }

      if (pendingFile) {
        setUploading("file");
        const fd = new FormData();
        fd.append("file", pendingFile);
        await uploadListingFile(listingId, fd);
        setPendingFile(null);
      }
    } catch (err) {
      console.error("Upload error during submit:", err);
      toast.error("Failed to upload some files, but listing details were saved.");
    } finally {
      setUploading(null);
    }

    toast.success(isEdit ? "Listing updated!" : (publish ? "Listing published!" : "Draft saved!"));
    if (!isEdit && result.data) {
      router.push(`/dashboard/listings/${result.data.id}/edit`);
      return result.data.id;
    }
    return isEdit ? listing.id : result.data?.id;
  };

  const ensureListingId = async () => {
    if (listing?.id) return listing.id;
    // Trigger background save if ID missing
    const values = watch();
    return await onSubmit(values, false);
  };

  // Drag and Drop Logic
  const onDropCover = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPendingCover(file);
      setCoverPreview(URL.createObjectURL(file));
      toast.info("Cover selected (Pending Save)");
    }
  }, []);

  const onDropScreenshot = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, 5 - screenshots.length - pendingScreenshots.length);
    if (newFiles.length > 0) {
      setPendingScreenshots((prev) => [...prev, ...newFiles]);
      toast.info(`Added ${newFiles.length} screenshots to queue`);
    }
  }, [screenshots.length, pendingScreenshots.length]);

  const onDropFile = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPendingFile(file);
      toast.info("File selected (Pending Save)");
    }
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const { getRootProps: getCoverProps, getInputProps: getCoverInputProps } = useDropzone({ onDrop: onDropCover, accept: { 'image/*': [] }, maxFiles: 1 });
  const { getRootProps: getSsProps, getInputProps: getSsInputProps } = useDropzone({ onDrop: onDropScreenshot, accept: { 'image/*': [] }, maxFiles: 5 });
  const { getRootProps: getFileProps, getInputProps: getFileInputProps } = useDropzone({ onDrop: onDropFile, maxFiles: 1 });

  const sections = [
    { id: "basic", label: "Basic Info", icon: Info },
    { id: "media", label: "Media & Files", icon: ImageIcon },
    { id: "pricing", label: "Pricing & Legal", icon: DollarSign },
    { id: "compatibility", label: "Compatibility", icon: Monitor },
    { id: "changelog", label: "Changelog", icon: History },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background/50">
      <div className="flex flex-1">
        {/* Internal Section Navigation */}
        <aside className="w-64 border-r border-border/40 p-4 hidden xl:block bg-card/20 h-[calc(100vh-64px)] sticky top-16">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                  activeSection === s.id
                    ? "bg-primary/10 text-primary border-r-2 border-primary rounded-r-none"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <s.icon className={cn("w-4 h-4 transition-colors", activeSection === s.id ? "text-primary" : "group-hover:text-foreground")} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Quality Score</h4>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "65%" }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Complete all sections to increase your listing visibility.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6 md:p-10 space-y-12 pb-48">
          {/* Section: Basic Information */}
          <section id="basic" className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Basic Information</h2>
                <p className="text-sm text-muted-foreground">The core details of your resource.</p>
              </div>
            </div>

            <div className="grid gap-6 bg-card border border-border/50 p-6 rounded-2xl shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">Listing Title</Label>
                <Input id="title" placeholder="Enter a catchy name..." {...register("title")} className="h-11 bg-muted/30 focus:bg-background" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description" className="text-sm font-semibold">Tagline</Label>
                <Input id="short_description" placeholder="One sentence summary..." {...register("short_description")} className="h-11 bg-muted/30" />
                {errors.short_description && <p className="text-xs text-destructive">{errors.short_description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Category</Label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 bg-muted/30">
                          <SelectValue placeholder="Select best category">
                            {categories.find((c) => c.id === field.value)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_url" className="text-sm font-semibold">Documentation Link</Label>
                  <Input id="external_url" placeholder="https://docs..." {...register("external_url")} className="h-11 bg-muted/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea id="description" rows={10} placeholder="Markdown supported..." {...register("description")} className="bg-muted/30" />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Search Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="plugin, tools, minecraft..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    className="h-10 bg-muted/30"
                  />
                  <Button type="button" variant="secondary" onClick={addTag} size="icon" className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} className="pl-3 pr-1 py-1 gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="p-0.5 rounded-full hover:bg-primary/30 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Media and Files */}
          <section id="media" className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Media & Files</h2>
                <p className="text-sm text-muted-foreground">Visuals and source downloads.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4">
                <Label className="text-sm font-semibold">Resource Cover / Icon</Label>
                <div
                  {...getCoverProps()}
                  className={cn(
                    "relative aspect-video rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-muted/30 group",
                    coverPreview && "border-none shadow-inner"
                  )}
                >
                  <input {...getCoverInputProps()} />
                  {coverPreview ? (
                    <>
                      <Image src={coverPreview} alt="Cover" fill className="object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                        <p className="text-white text-xs font-semibold">Change Cover</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      {uploading === "cover" ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm font-medium">Drop image here</p>
                          <p className="text-xs text-muted-foreground mt-1">Recommended: 1280x720</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-2">
                   <Label htmlFor="youtube_url" className="text-sm font-semibold flex items-center gap-2">
                     <Video className="w-4 h-4 text-red-500" /> YouTube Preview URL
                   </Label>
                   <Input id="youtube_url" placeholder="https://youtube.com/watch?v=..." {...register("youtube_url")} className="h-10 bg-muted/30" />
                </div>
              </div>

              <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4">
                <Label className="text-sm font-semibold">Gallery Screenshots</Label>
                <div className="grid grid-cols-3 gap-2 min-h-[140px]">
                  {screenshots.map((img, i) => (
                    <div key={img.id ?? i} className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                      <Image src={img.image_path} alt={`Screenshot ${i + 1}`} fill className="object-cover" />
                      <button type="button" className="absolute top-1 right-1 p-1 bg-destructive rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {screenshots.length < 5 && (
                    <div {...getSsProps()} className="border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <input {...getSsInputProps()} />
                      {uploading === "screenshot" ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Plus className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  )}
                </div>
                <Separator className="bg-border/40" />
                <Label className="text-sm font-semibold">Downloadable File</Label>
                <div {...getFileProps()} className="border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all rounded-xl p-4 cursor-pointer text-center group">
                  <input {...getFileInputProps()} />
                  {uploading === "file" ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  ) : pendingFile ? (
                    <div className="flex items-center gap-3 justify-center">
                      <FileUp className="w-5 h-5 text-amber-500" />
                      <p className="text-sm font-medium text-amber-500">{pendingFile.name} (Waiting to save)</p>
                    </div>
                  ) : files.length > 0 ? (
                    <div className="flex items-center gap-3 justify-center">
                      <FileUp className="w-5 h-5 text-primary" />
                      <p className="text-sm font-medium text-primary">{files[0].file_name}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-center">
                      <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Upload .zip, .jar, etc.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section: Pricing and Licensing */}
          <section id="pricing" className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Pricing & Legal</h2>
                <p className="text-sm text-muted-foreground">Monetization and licensing terms.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-6">
                 <div className="space-y-4">
                    <Label className="text-sm font-semibold">Pricing Model</Label>
                    <div className="grid grid-cols-3 gap-2">
                       <button
                         type="button"
                         onClick={() => { setValue("price", 0); setValue("credit_cost", 0); }}
                         className={cn(
                           "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left",
                           !isPaid && creditCost === 0 ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                         )}
                       >
                         <Shield className={cn("w-5 h-5", !isPaid && creditCost === 0 ? "text-primary" : "text-muted-foreground")} />
                         <span className="text-sm font-bold">Free</span>
                       </button>
                       <button
                         type="button"
                         onClick={() => { setValue("price", 5); setValue("credit_cost", 0); }}
                         className={cn(
                           "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left",
                           isPaid && creditCost === 0 ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                         )}
                       >
                         <DollarSign className={cn("w-5 h-5", isPaid && creditCost === 0 ? "text-primary" : "text-muted-foreground")} />
                         <span className="text-sm font-bold">Paid ($)</span>
                       </button>
                       <button
                         type="button"
                         onClick={() => { setValue("price", 0); setValue("credit_cost", 5); }}
                         className={cn(
                           "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-left",
                           creditCost > 0 ? "border-amber-500 bg-amber-500/5" : "border-border/50 hover:border-border"
                         )}
                       >
                         <span className={cn("text-xl", creditCost > 0 ? "text-amber-500" : "text-muted-foreground")}>🪙</span>
                         <span className="text-sm font-bold">Credits</span>
                       </button>
                    </div>
                 </div>

                 {isPaid && creditCost === 0 && (
                   <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Label htmlFor="price" className="text-sm font-semibold">Price (USD)</Label>
                      <div className="relative group/input">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                        </div>
                        <Input 
                          id="price" 
                          type="number" 
                          step="0.01" 
                          {...register("price")} 
                          className="h-11 pl-10 bg-muted/30 focus:bg-background transition-colors" 
                        />
                      </div>
                   </motion.div>
                 )}

                 {creditCost > 0 && (
                   <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Label htmlFor="credit_cost" className="text-sm font-semibold">Credit Cost</Label>
                      <div className="relative group/input">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                          <span className="text-amber-500 text-lg leading-none">🪙</span>
                        </div>
                        <Input 
                          id="credit_cost" 
                          type="number" 
                          min={1} 
                          {...register("credit_cost")} 
                          className="h-11 pl-11 bg-muted/30 focus:bg-background transition-colors" 
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Users will spend this many credits to download your resource.</p>
                   </motion.div>
                 )}
               </div>

               <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">License Type</Label>
                    <Controller
                      name="license"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 bg-muted/30 border-border/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MIT">MIT License</SelectItem>
                            <SelectItem value="GPL">GPL-3.0</SelectItem>
                            <SelectItem value="Apache">Apache 2.0</SelectItem>
                            <SelectItem value="Custom">Custom / Proprietary</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Open Source</Label>
                      <p className="text-[10px] text-muted-foreground">Source code is publicly available.</p>
                    </div>
                    <Switch
                      checked={watch("is_open_source")}
                      onCheckedChange={(val) => setValue("is_open_source", val)}
                    />
                  </div>
               </div>
            </div>
          </section>

          {/* Section: Requirements & Compatibility */}
          <section id="compatibility" className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Requirements & Compatibility</h2>
                <p className="text-sm text-muted-foreground">Technical constraints and dependencies.</p>
              </div>
            </div>

            <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Plugin Dependencies
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. PlaceholderAPI 2.0+"
                      value={depInput}
                      onChange={(e) => setDepInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDependency(); } }}
                      className="h-10 bg-muted/30"
                    />
                    <Button type="button" variant="outline" onClick={addDependency} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dependencies.map((dep) => (
                      <div key={dep} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50">
                        <span className="text-xs font-medium">{dep}</span>
                        <button type="button" onClick={() => removeDependency(dep)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {dependencies.length === 0 && <p className="text-xs text-muted-foreground italic pl-1">No dependencies specified.</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Supported Platforms
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-medium border-2 transition-all",
                          platforms.includes(p)
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Changelog */}
          <section id="changelog" className="space-y-6 scroll-mt-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <History className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Version Update</h2>
                <p className="text-sm text-muted-foreground">Log changes for this release.</p>
              </div>
            </div>

            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <Label htmlFor="changelog" className="text-sm font-semibold">What's new in v1.0.0?</Label>
                   <Badge variant="outline" className="font-mono text-[10px]">Initial Release</Badge>
                </div>
                <Textarea
                  id="changelog"
                  rows={8}
                  placeholder="• Fixed bugs...&#10;• Added multi-language support..."
                  {...register("changelog")}
                  className="bg-muted/30 focus:ring-primary/20"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Fixed Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 border-t border-border/50 bg-background/95 backdrop-blur-xl z-40 flex items-center justify-between px-10 xl:pl-[280px]">
        <div className="flex items-center gap-2">
          {isDirty && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-primary font-medium text-sm mr-4">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               Unsaved changes
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, false))}
            className="hover:bg-muted"
          >
            <Save className="w-4 h-4 mr-2" />
            Save to Drafts
          </Button>
          <Button
            type="button"
            className="shadow-lg shadow-primary/20 h-11 px-8 rounded-xl"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, true))}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isEdit ? "Publish Update" : "Publish Resource"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
