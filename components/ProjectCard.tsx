"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ProjectCardProps {
  name: string
  tagline: string
  url: string
  images: string[]
  tags?: string[]
  priority?: boolean
}

export default function ProjectCard({ name, tagline, url, images, tags, priority }: ProjectCardProps) {
  const total = images.length
  // Wrap with clones: [last, ...originals, first] for seamless looping
  const cloned = useMemo(
    () => total > 1 ? [images[total - 1], ...images, images[0]] : images,
    [images, total]
  )

  const [visualIndex, setVisualIndex] = useState(total > 1 ? 1 : 0)
  const [transition, setTransition] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const host = new URL(url).host

  // dotIndex maps cloned positions back to real 0-based index
  const dotIndex = total > 1 ? ((visualIndex - 1) % total + total) % total : 0

  const startTimer = useCallback(() => {
    if (total <= 1) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setVisualIndex((v) => v + 1), 3500)
  }, [total])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  // After an instant jump (transition=false), re-enable transition on next paint
  useEffect(() => {
    if (!transition) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setTransition(true))
      )
      return () => cancelAnimationFrame(id)
    }
  }, [transition])

  const handleTransitionEnd = () => {
    if (visualIndex === 0) {
      setTransition(false)
      setVisualIndex(total)
    } else if (visualIndex === total + 1) {
      setTransition(false)
      setVisualIndex(1)
    }
  }

  const prev = () => { setVisualIndex((v) => v - 1); startTimer() }
  const next = () => { setVisualIndex((v) => v + 1); startTimer() }
  const goTo = (i: number) => { setVisualIndex(i + 1); startTimer() }

  return (
    <div className="rounded-[20px] bg-surface border border-border overflow-hidden">
      {/* Slideshow */}
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-alt group">
        {images.length > 0 ? (
          <>
            <div
              className={`flex h-full ${transition ? "transition-transform duration-500 ease-in-out" : ""}`}
              style={{
                width: `${cloned.length * 100}%`,
                transform: `translateX(-${(visualIndex * 100) / cloned.length}%)`,
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {cloned.map((src, i) => (
                <div
                  key={i}
                  className="relative h-full flex-shrink-0"
                  style={{ width: `${100 / cloned.length}%` }}
                >
                  <Image
                    src={src}
                    alt={`${name} screenshot ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    draggable={false}
                    priority={priority && i === (total > 1 ? 1 : 0)}
                  />
                </div>
              ))}
            </div>

            {total > 1 && (
              <>
                {/* Prev arrow */}
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Next arrow */}
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Gradient + dots */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                        i === dotIndex ? "bg-white" : "bg-white/40"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted text-sm font-mono">{name}</p>
          </div>
        )}
      </div>

      {/* Text block */}
      <div className="p-7">
        <p className="text-lg font-bold font-heading text-text leading-tight">
          {name}{" "}
          <span className="text-sm font-normal text-muted font-mono">({host})</span>
        </p>
        <p className="text-sm text-muted mt-2 mb-4 leading-relaxed">{tagline}</p>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full bg-surface-alt text-xs font-mono text-muted border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-[14px] bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-[180ms]"
        >
          Visit →
        </a>
      </div>
    </div>
  )
}
