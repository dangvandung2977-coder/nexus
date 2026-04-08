"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ListingImage } from "@/types";

interface ListingGalleryProps {
  images: ListingImage[];
}

export function ListingGallery({ images }: ListingGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {sorted.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-video rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors group"
          >
            <Image
              src={img.image_path}
              alt={img.alt_text ?? `Screenshot ${i + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="200px"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="relative max-w-4xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
              <Image
                src={sorted[lightboxIndex].image_path}
                alt={sorted[lightboxIndex].alt_text ?? "Screenshot"}
                width={1280}
                height={720}
                className="w-full h-auto rounded-xl object-contain max-h-[80vh]"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => setLightboxIndex(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              {lightboxIndex > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={() => setLightboxIndex((i) => (i ?? 1) - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {lightboxIndex < sorted.length - 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setLightboxIndex((i) => (i ?? 0) + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
