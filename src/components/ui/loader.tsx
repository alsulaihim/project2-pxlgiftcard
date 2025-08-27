"use client";

import React from "react";

/**
 * LoadingDots renders three animated dots for consistent loading feedback across the app.
 * Use for inline/section loaders. For full-screen routes, prefer FullPageLoader.
 */
export function LoadingDots({ label = "Loading", size = 6, className = "" }: { label?: string; size?: number; className?: string }) {
  const dotSize = `h-${size} w-${size}`; // Tailwind size tokens: e.g., h-4 w-4
  return (
    <div className={`flex items-center gap-2 text-gray-400 ${className}`} role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className={`rounded-full bg-gray-400 ${dotSize} animate-bounce`} />
      <div className={`rounded-full bg-gray-400 ${dotSize} animate-bounce [animation-delay:120ms]`} />
      <div className={`rounded-full bg-gray-400 ${dotSize} animate-bounce [animation-delay:240ms]`} />
    </div>
  );
}

/**
 * FullPageLoader centers a label and LoadingDots in a full-height container on dark background.
 */
export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <LoadingDots label={label} size={4} className="justify-center mx-auto mb-4" />
        <p className="text-gray-400">{label}...</p>
      </div>
    </div>
  );
}


