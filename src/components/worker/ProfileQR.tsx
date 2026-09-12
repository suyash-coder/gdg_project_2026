"use client";

/**
 * Phase 5 Integration Boundary: Profile QR
 * 
 * Strict Requirement:
 * - "A visual placeholder is NOT a working QR. If a genuine QR cannot be implemented without a 
 *    dependency approval, leave the feature at a clearly documented integration boundary rather 
 *    than pretending a placeholder is scannable."
 * - Requires an approved QR dependency (e.g., qrcode.react) which is not in package.json.
 */

interface ProfileQRProps {
  workerId: string;
}

export default function ProfileQR({ workerId: _workerId }: ProfileQRProps) {
  return (
    <div style={styles.boundaryCard}>
      <p style={styles.boundaryText}>
        <strong>QR Feature Blocked</strong><br/>
        Missing approved dependency (e.g., <code>qrcode.react</code>) and Canonical URL definition.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  boundaryCard: {
    padding: "24px",
    background: "rgba(0, 0, 0, 0.02)",
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)",
    textAlign: "center",
  },
  boundaryText: {
    fontSize: "13px",
    color: "var(--muted)",
    lineHeight: "1.5",
  },
};
