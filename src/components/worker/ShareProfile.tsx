"use client";

import { useState } from "react";
import { getCanonicalPublicProfileUrl } from "@/lib/public-profile-adapter";
import ProfileQR from "./ProfileQR";
import { generateDigitalCV } from "@/lib/cv-generator";

/**
 * Phase 5 Share Controls
 * 
 * Safely consumes the Canonical Public Profile URL integration boundary.
 * Displays appropriate fallback UI when dependencies or contracts are missing.
 */

interface ShareProfileProps {
  workerId: string;
}

export default function ShareProfile({ workerId }: ShareProfileProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // The canonical URL might be null if Worker 3 hasn't defined it yet.
  const url = getCanonicalPublicProfileUrl(workerId);

  const handleShareClick = async () => {
    setErrorMsg(null);
    if (!url) {
      setErrorMsg("Sharing disabled: Canonical public profile URL is not yet defined by Worker 3.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My WorkProof Profile",
          text: "Check out my attested work history and reputation on WorkProof.",
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Profile URL copied to clipboard!");
      }
    } catch (err) {
      // Ignore AbortError from native share cancellation
      if (err instanceof Error && err.name !== "AbortError") {
        setErrorMsg("Failed to share or copy link.");
      }
    }
  };

  const handleWhatsAppShare = () => {
    setErrorMsg(null);
    if (!url) {
      setErrorMsg("WhatsApp sharing disabled: Canonical URL is undefined.");
      return;
    }
    const text = encodeURIComponent(`Check out my attested work history and reputation on WorkProof: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleDownloadCV = async () => {
    setErrorMsg(null);
    try {
      await generateDigitalCV(workerId);
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to generate CV.");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Share Your Profile</h2>
      
      {errorMsg && (
        <div style={styles.errorBanner} role="alert">
          {errorMsg}
        </div>
      )}

      <div style={styles.actions}>
        <button 
          onClick={handleShareClick} 
          style={styles.primaryBtn}
          disabled={!url}
        >
          {url ? "🔗 Share Profile Link" : "🔗 Share Unavailable"}
        </button>
        
        <button 
          onClick={handleWhatsAppShare} 
          style={styles.secondaryBtn}
          disabled={!url}
        >
          WhatsApp Share
        </button>
        
        <button 
          onClick={handleDownloadCV} 
          style={styles.secondaryBtn}
        >
          📄 Download Digital CV
        </button>
      </div>

      <div style={styles.qrSection}>
        <h3 style={styles.subTitle}>Profile QR Code</h3>
        <ProfileQR workerId={workerId} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginTop: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "16px",
  },
  subTitle: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "12px",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "24px",
  },
  primaryBtn: {
    padding: "12px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "12px",
    background: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  errorBanner: {
    padding: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    fontSize: "13px",
    color: "var(--danger)",
    marginBottom: "16px",
  },
  qrSection: {
    borderTop: "1px solid var(--border)",
    paddingTop: "16px",
  },
};
