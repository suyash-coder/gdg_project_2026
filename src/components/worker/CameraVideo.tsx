"use client";

/**
 * CameraVideo.tsx
 *
 * Thin wrapper around the <video> element for camera preview.
 * Owns its own ref to avoid react-hooks/refs lint errors when
 * the parent passes down a callback ref from useCamera.
 *
 * The `onReady` callback receives the HTMLVideoElement so the
 * parent camera hook can store it internally.
 */

import { useRef, useEffect } from "react";

interface CameraVideoProps {
  onReady: (el: HTMLVideoElement | null) => void;
  style?: React.CSSProperties;
}

export default function CameraVideo({ onReady, style }: CameraVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  // Fire onReady after mount so the parent hook can record the element
  useEffect(() => {
    onReady(ref.current);
    return () => {
      onReady(null);
    };
  }, [onReady]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={style}
      id="camera-preview"
    />
  );
}
