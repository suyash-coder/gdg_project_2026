"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getAbsolutePublicProfileUrl } from "@/lib/public-profile-adapter";

interface ProfileQRProps {
  workerId: string;
}

export default function ProfileQR({ workerId }: ProfileQRProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const url = mounted ? getAbsolutePublicProfileUrl(workerId) : "";

  if (!url) {
    return (
      <div style={{ ...styles.boundaryCard, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: "14px" }}>Loading QR...</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <QRCodeSVG
        value={url}
        size={200}
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"L"}
        includeMargin={false}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "16px",
    background: "#ffffff",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  boundaryCard: {
    padding: "24px",
    background: "rgba(0, 0, 0, 0.02)",
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)",
    textAlign: "center",
  },
};
