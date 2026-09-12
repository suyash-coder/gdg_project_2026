/**
 * Phase 5 Integration: Digital CV Generation
 * 
 * Uses jsPDF and qrcode to generate a client-side PDF containing public profile data.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { getAbsolutePublicProfileUrl } from "./public-profile-adapter";
import type { PublicProfile } from "@/lib/types";

export async function generateDigitalCV(workerId: string): Promise<Blob> {
  const supabase = createClient();
  
  // Fetch public profile data ONLY
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, display_name, bio, city, reputation_score")
    .eq("id", workerId)
    .single();

  if (error || !data) {
    throw new Error("Unable to fetch public profile data for CV. Verify profile is public.");
  }
  
  const profile = data as PublicProfile;

  // Initialize PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const margin = 20;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(profile.display_name || "Worker Profile", margin, y);
  y += 10;

  // Location
  if (profile.city) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Location: ${profile.city}`, margin, y);
    y += 8;
  }

  // Reputation
  if (profile.reputation_score !== undefined) {
    doc.text(`Reputation Score: ${profile.reputation_score}`, margin, y);
    y += 12;
  }

  // Bio
  if (profile.bio) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("About", margin, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const splitBio = doc.splitTextToSize(profile.bio, pageWidth - margin * 2);
    doc.text(splitBio, margin, y);
    y += splitBio.length * 6 + 10;
  }

  // QR Code
  const canonicalUrl = getAbsolutePublicProfileUrl(workerId);
  if (canonicalUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(canonicalUrl, { margin: 1, width: 100 });
      if (y + 40 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(qrDataUrl, "PNG", margin, y, 40, 40);
      doc.setFontSize(10);
      doc.text("Scan to view live profile", margin + 45, y + 20);
      y += 50;
    } catch (e) {
      console.warn("Failed to generate QR code for CV", e);
    }
  }

  // Footer Disclaimer
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("This document is a snapshot. Visit the live profile for the latest information.", margin, doc.internal.pageSize.getHeight() - margin);

  // Trigger download in browser
  doc.save(`WorkProof-CV-${profile.display_name?.replace(/[^a-zA-Z0-9]/g, '_') || workerId}.pdf`);

  return doc.output("blob");
}
