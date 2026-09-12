/**
 * WorkerProfileCard — public-facing worker profile display.
 *
 * Renders only the fields the contract marks public via the public_profiles view:
 *   id, display_name, bio, avatar_url, city, reputation_score
 *
 * No private evidence, full profile rows, or role information is shown here.
 */

import type { PublicProfile } from "@/lib/types";

interface WorkerProfileCardProps {
  profile: PublicProfile;
}

export function WorkerProfileCard({ profile }: WorkerProfileCardProps) {
  const initials = (profile.display_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <article
      style={{
        maxWidth: 600,
        margin: "48px auto",
        padding: "36px 40px",
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? "Worker avatar"}
            width={72}
            height={72}
            style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }}
          />
        ) : (
          <div
            aria-label="Avatar placeholder"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#1e293b",
              lineHeight: 1.2,
            }}
          >
            {profile.display_name ?? "Worker"}
          </h1>
          {profile.city && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span aria-hidden>📍</span> {profile.city}
            </p>
          )}
        </div>
      </div>

      {/* Reputation Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {/* Average Rating */}
        <div style={statCardStyle}>
          <div style={statValueStyle}>
            {profile.average_rating === null || profile.average_rating === undefined 
              ? "—" 
              : profile.average_rating}
            <span style={{ fontSize: 18, color: "#fbbf24", marginLeft: 4 }}>★</span>
          </div>
          <div style={statLabelStyle}>Average Rating</div>
          <div style={statSubStyle}>
            {profile.rating_count === 0 ? "No ratings yet" : `${profile.rating_count} ratings`}
          </div>
        </div>

        {/* Attested Reputation */}
        <div style={statCardStyle}>
          <div style={statValueStyle}>{profile.reputation_score}</div>
          <div style={statLabelStyle}>Attested Reputation</div>
          <div style={statSubStyle}>Customer-verified</div>
        </div>

        {/* Repeat Customers */}
        <div style={statCardStyle}>
          <div style={statValueStyle}>{profile.repeat_customers || 0}</div>
          <div style={statLabelStyle}>Repeat Customers</div>
          <div style={statSubStyle}>Hired 2+ times</div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio ? (
        <section>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94a3b8",
              margin: "0 0 8px",
            }}
          >
            About
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.7,
              color: "#334155",
              whiteSpace: "pre-wrap",
            }}
          >
            {profile.bio}
          </p>
        </section>
      ) : (
        <p style={{ color: "#94a3b8", fontSize: 14, fontStyle: "italic" }}>
          This worker has not added a bio yet.
        </p>
      )}

      {/* WorkProof badge */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }} aria-hidden>🔒</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          Profile verified by WorkProof · Only public information is shown
        </span>
      </div>
    </article>
  );
}

const statCardStyle: React.CSSProperties = {
  padding: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const statValueStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "#1e293b",
  display: "flex",
  alignItems: "center",
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginTop: 8,
};

const statSubStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 2,
};
