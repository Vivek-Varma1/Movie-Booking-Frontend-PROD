import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HorizontalScroller({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => setEdges({ left: row.scrollLeft > 2, right: row.scrollWidth - row.clientWidth - row.scrollLeft > 2 });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    for (const child of row.children) observer.observe(child);
    row.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); row.removeEventListener("scroll", update); };
  }, [children]);
  const scroll = (direction: number) => {
    const row = ref.current;
    if (!row) return;
    row.scrollBy({ left: direction * row.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const arrow = "absolute top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border-subtle bg-surface text-text-primary shadow-movie hover:bg-page-muted hover:text-text-primary";
  return <div className="relative">
    <div ref={ref} role="region" aria-label={label} tabIndex={0} className="media-scroller flex gap-6 overflow-x-auto py-1 focus-visible:outline-2 focus-visible:outline-ring">{children}</div>
    {edges.left && <Button variant="outline" size="icon" className={`${arrow} -left-3`} aria-label={`Scroll ${label} left`} title="Scroll left" onClick={() => scroll(-1)}><ChevronLeft /></Button>}
    {edges.right && <Button variant="outline" size="icon" className={`${arrow} -right-3`} aria-label={`Scroll ${label} right`} title="Scroll right" onClick={() => scroll(1)}><ChevronRight /></Button>}
  </div>;
}