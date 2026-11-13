import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { videoEmbedUrl } from "@/lib/video";
import type { GalleryImage, Trailer } from "@/types";

export function TrailerModal({ trailer, onClose }: { trailer: Trailer | null; onClose: () => void }) {
  const embed = trailer?.videoUrl ? videoEmbedUrl(trailer.videoUrl) : undefined;
  const link = trailer?.videoUrl?.startsWith("https://") ? trailer.videoUrl : undefined;
  return <Dialog open={!!trailer} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="w-[calc(100%-32px)] max-w-4xl border-subtle bg-hero-dark p-4 pt-12 text-on-hero" aria-describedby={undefined}>
    <DialogTitle className="sr-only">{trailer?.title ?? "Trailer"}</DialogTitle>
    {embed ? <iframe key={embed} src={embed} title={trailer?.title} className="aspect-video w-full rounded-lg border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="flex aspect-video items-center justify-center text-center">{link ? <Button asChild variant="secondary"><a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink />Watch trailer</a></Button> : <p>This video is not available yet.</p>}</div>}
  </DialogContent></Dialog>;
}

export function PosterLightbox({ images, index, title, onChange, onClose }: { images: GalleryImage[]; index: number | null; title: string; onChange: (index: number) => void; onClose: () => void }) {
  const image = index === null ? undefined : images[index];
  return <Dialog open={!!image} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="w-[calc(100%-32px)] max-w-3xl border-subtle bg-hero-dark p-4 pt-12 text-on-hero" onKeyDown={(e) => { if (index === null || images.length < 2) return; if (e.key === "ArrowRight") onChange((index + 1) % images.length); if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length); }}>
    <DialogTitle className="sr-only">{title} — Posters & Wallpapers</DialogTitle><DialogDescription className="sr-only">{index === null ? "" : `Image ${index + 1} of ${images.length}`}</DialogDescription>
    {image && <img src={image.imageUrl} alt={`${title} poster ${(index ?? 0) + 1}`} className="mx-auto max-h-[75dvh] max-w-full rounded-lg object-contain" />}
    {images.length > 1 && index !== null && <div className="flex items-center justify-center gap-5"><Button variant="ghost" size="icon" className="text-on-hero hover:bg-on-hero/15 hover:text-on-hero" aria-label="Previous image" title="Previous image" onClick={() => onChange((index - 1 + images.length) % images.length)}><ChevronLeft /></Button><span className="text-sm">{index + 1} / {images.length}</span><Button variant="ghost" size="icon" className="text-on-hero hover:bg-on-hero/15 hover:text-on-hero" aria-label="Next image" title="Next image" onClick={() => onChange((index + 1) % images.length)}><ChevronRight /></Button></div>}
  </DialogContent></Dialog>;
}