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



interface CameraVideoProps {
  onReady: (el: HTMLVideoElement | null) => void;
  style?: React.CSSProperties;
}

export default function CameraVideo({ onReady, style }: CameraVideoProps) {
  return (
    <video
      ref={onReady}
      autoPlay
      playsInline
      muted
      style={style}
      id="camera-preview"
    />
  );
}
