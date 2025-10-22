// src/pages/Entertainment/LoadingSpiner.jsx
// Professional loading overlay (Bootstrap-only) with smart delays
// - delayMs: show only if loading lasts longer than delay
// - minShowMs: keep visible for at least this long once shown (anti-flicker)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

let activeInstances = 0; // singleton guard

export default function LoadingSpiner({
  visible = true,
  fullScreen = true,     // kept for compatibility
  message = "Loading…",
  showBackdrop = true,
  size = "lg",           // "sm" | "md" | "lg"
  zIndex = 1080,
  blockScroll = true,
  delayMs = 250,         // wait this long before showing
  minShowMs = 500,       // keep visible at least this long once shown
}) {
  const sizes = useMemo(
    () => ({
      sm: { spinner: 20, ring: 36 },
      md: { spinner: 28, ring: 52 },
      lg: { spinner: 36, ring: 68 },
    }),
    []
  );
  const s = sizes[size] || sizes.lg;

  // Singleton: only first mounted instance renders
  const [isPrimary, setIsPrimary] = useState(false);
  useEffect(() => {
    activeInstances += 1;
    if (activeInstances === 1) setIsPrimary(true);
    return () => {
      activeInstances = Math.max(0, activeInstances - 1);
    };
  }, []);

  // Create/get a global overlay container for the portal
  const containerRef = useRef(null);
  if (typeof document !== "undefined" && !containerRef.current) {
    let el = document.getElementById("app-loading-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "app-loading-overlay";
      document.body.appendChild(el);
    }
    containerRef.current = el;
  }

  // Smart visibility (delay + min show)
  const [actuallyVisible, setActuallyVisible] = useState(false);
  const delayTimer = useRef(null);
  const hideTimer = useRef(null);
  const shownAt = useRef(0);

  useEffect(() => {
    // Clear timers on prop change/unmount
    const clearTimers = () => {
      if (delayTimer.current) { clearTimeout(delayTimer.current); delayTimer.current = null; }
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    };

    if (!isPrimary) return; // only primary instance controls visibility

    if (visible) {
      // If already visible, do nothing
      if (actuallyVisible) return;
      // Start delay timer before showing
      delayTimer.current = setTimeout(() => {
        shownAt.current = Date.now();
        setActuallyVisible(true);
        delayTimer.current = null;
      }, Math.max(0, delayMs));
    } else {
      // Want to hide: either hide immediately if not yet shown,
      // or respect minShowMs if it is already visible
      if (!actuallyVisible) {
        clearTimers();
      } else {
        const elapsed = Date.now() - shownAt.current;
        const waitMs = Math.max(0, minShowMs - elapsed);
        hideTimer.current = setTimeout(() => {
          setActuallyVisible(false);
          hideTimer.current = null;
        }, waitMs);
      }
    }

    return () => clearTimers();
  }, [visible, delayMs, minShowMs, actuallyVisible, isPrimary]);

  // Lock body scroll while visible
  useEffect(() => {
    if (!blockScroll || !isPrimary) return;
    if (actuallyVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [actuallyVisible, isPrimary, blockScroll]);

  // Early exits
  if (!actuallyVisible || !isPrimary || !containerRef.current) return null;

  const overlay = (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showBackdrop && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backdropFilter: "blur(6px)",
            background: "rgba(10,10,10,.55)",
            animation: "fadeIn .3s ease",
          }}
        />
      )}

      <div
        className="position-relative d-flex flex-column align-items-center justify-content-center p-4 rounded-4 shadow-lg"
        style={{
          minWidth: 240,
          background: "rgba(255,255,255,.95)",
          backdropFilter: "blur(8px)",
          animation: "scaleIn .28s ease",
        }}
      >
        {/* Outer glowing animated ring */}
        <div
          className="position-relative d-flex align-items-center justify-content-center mb-3"
          style={{
            width: s.ring,
            height: s.ring,
            borderRadius: "50%",
            background:
              "conic-gradient(from 0deg, rgba(13,110,253,.30), rgba(111,66,193,.22), rgba(13,110,253,.30))",
            boxShadow:
              "0 8px 28px rgba(0,0,0,.28), inset 0 1px 3px rgba(255,255,255,.22)",
            animation: "spinSlow 1.6s linear infinite",
          }}
        >
          <div
            className="spinner-border text-primary"
            style={{ width: s.spinner, height: s.spinner, borderWidth: "0.25rem" }}
          >
            <span className="visually-hidden">{message}</span>
          </div>
          <span
            className="position-absolute rounded-circle"
            style={{
              width: 8,
              height: 8,
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "rgba(13,110,253,.95)",
              boxShadow: "0 0 14px rgba(13,110,253,.85)",
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />
        </div>

        <div className="text-dark text-center fw-semibold" style={{ letterSpacing: ".35px" }}>
          {message}
        </div>
      </div>

      <style>{`
        @keyframes spinSlow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes pulse { 0% { transform: translateY(-50%) scale(.9); opacity: .6; } 50% { transform: translateY(-50%) scale(1.2); opacity: 1; } 100% { transform: translateY(-50%) scale(.9); opacity: .6; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(.96); opacity: .8; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );

  return createPortal(overlay, containerRef.current);
}
