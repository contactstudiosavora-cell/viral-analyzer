"use client";

import { useState } from "react";

type Mode = "niche" | "video" | "script" | "trends" | null;
const PLATFORMS = ["TikTok", "Instagram", "Facebook", "X"];

/* ─────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────── */
const C = {
  cream: "#E9E5DA",
  creamDark: "#DEDAD0",
  olive: "#1A1A10",
  lime: "#C9F019",
  white: "#FFFFFF",
};

/* ─────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────── */

function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full"
      style={
        active
          ? { backgroundColor: C.lime, color: C.olive }
          : { backgroundColor: "rgba(26,26,16,0.07)", color: "rgba(26,26,16,0.5)" }
      }
    >
      {children}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f97316" : "#ef4444";
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: color + "18", color, border: `1px solid ${color}30` }}
    >
      {score}<span style={{ opacity: 0.5 }}>/10</span>
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] mb-3"
      style={{ color: "rgba(26,26,16,0.35)" }}>
      {children}
    </p>
  );
}

function Tag({ children, lime }: { children: React.ReactNode; lime?: boolean }) {
  return (
    <span
      className="inline-block text-[11px] font-sans font-semibold px-3 py-1 rounded-full"
      style={
        lime
          ? { backgroundColor: C.lime, color: C.olive }
          : { backgroundColor: "rgba(26,26,16,0.07)", color: "rgba(26,26,16,0.65)" }
      }
    >
      {children}
    </span>
  );
}

function Divider() {
  return <div className="h-px" style={{ backgroundColor: "rgba(26,26,16,0.07)" }} />;
}

function Row({ icon, children }: { icon: "good" | "bad" | "neutral"; children: React.ReactNode }) {
  const styles = {
    good: { color: "#16a34a", char: "↑" },
    bad: { color: "#ef4444", char: "↓" },
    neutral: { color: "rgba(26,26,16,0.3)", char: "·" },
  }[icon];
  return (
    <div className="flex gap-3 items-start text-sm" style={{ color: "rgba(26,26,16,0.7)" }}>
      <span className="font-bold shrink-0 mt-0.5 text-xs" style={{ color: styles.color }}>
        {styles.char}
      </span>
      <span>{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   CARD — white, shadow, rounded
───────────────────────────────────────── */
function Card({ children, className = "", accent }: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        backgroundColor: accent ? C.olive : C.white,
        boxShadow: "0 1px 3px rgba(26,26,16,0.06), 0 4px 16px rgba(26,26,16,0.04)",
        border: accent ? "none" : "1px solid rgba(26,26,16,0.06)",
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   INSET — beige background for sub-sections
───────────────────────────────────────── */
function Inset({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{ backgroundColor: C.cream }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   NUMBER BADGE
───────────────────────────────────────── */
function Num({ n }: { n: number }) {
  return (
    <span
      className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
      style={{ backgroundColor: C.lime, color: C.olive }}
    >
      {n}
    </span>
  );
}

/* ─────────────────────────────────────────
   SECTION HEADER — used inside results
───────────────────────────────────────── */
function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="text-base">{emoji}</span>
      <span
        className="text-[11px] font-sans font-bold uppercase tracking-[0.2em]"
        style={{ color: "rgba(26,26,16,0.4)" }}
      >
        {title}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   NICHE / PRODUIT RESULTS
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NicheResults({ data }: { data: any }) {
  const { analysis, niche } = data;
  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center gap-3 flex-wrap py-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.lime }} />
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(26,26,16,0.35)" }}>Produit analysé</span>
        <Chip active>{niche}</Chip>
      </div>

      {/* Tendances */}
      <Card>
        <SectionHeader emoji="📈" title="Tendances actuelles" />
        <div className="space-y-5">
          <div>
            <Label>Formats</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.tendances?.formats?.map((f: string, i: number) => <Tag key={i}>{f}</Tag>)}
            </div>
          </div>
          <Divider />
          <div>
            <Label>Styles dominants</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.tendances?.styles_dominants?.map((s: string, i: number) => <Tag key={i} lime>{s}</Tag>)}
            </div>
          </div>
          <Divider />
          <div className="flex items-center gap-3">
            <Label>Durée moyenne</Label>
            <span className="font-sans font-bold text-sm -mt-3" style={{ color: C.olive }}>
              {analysis.tendances?.duree_moyenne}
            </span>
          </div>
        </div>
      </Card>

      {/* Patterns */}
      <Card>
        <SectionHeader emoji="🎯" title="Patterns qui marchent" />
        <div className="space-y-5">
          <div>
            <Label>Types de hooks</Label>
            <div className="space-y-2.5">
              {analysis.patterns?.hooks?.map((h: { type: string; exemple: string; pourquoi: string }, i: number) => (
                <Inset key={i}>
                  <Chip active>{h.type}</Chip>
                  <p className="text-sm italic mt-2.5 mb-1" style={{ color: C.olive }}>"{h.exemple}"</p>
                  <p className="text-xs" style={{ color: "rgba(26,26,16,0.45)" }}>{h.pourquoi}</p>
                </Inset>
              ))}
            </div>
          </div>
          <Divider />
          <div>
            <Label>Structures</Label>
            <div className="space-y-2">
              {analysis.patterns?.structures?.map((s: string, i: number) => (
                <div key={i} className="flex gap-3 text-sm" style={{ color: "rgba(26,26,16,0.7)" }}>
                  <span style={{ color: C.lime, fontWeight: 700 }}>›</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <Divider />
          <div>
            <Label>CTA efficaces</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.patterns?.cta?.map((c: string, i: number) => <Tag key={i} lime>{c}</Tag>)}
            </div>
          </div>
        </div>
      </Card>

      {/* Comportement */}
      <Card>
        <SectionHeader emoji="🧠" title="Psychologie de l'audience" />
        <div className="space-y-2.5">
          {[
            { label: "Pourquoi ils cliquent", value: analysis.comportement?.pourquoi_cliquent },
            { label: "Pourquoi ils restent", value: analysis.comportement?.pourquoi_restent },
            { label: "Pourquoi ils partagent", value: analysis.comportement?.pourquoi_partagent },
          ].map(({ label, value }) => (
            <Inset key={label}>
              <Label>{label}</Label>
              <p className="text-sm" style={{ color: "rgba(26,26,16,0.8)" }}>{value}</p>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Hooks prêts */}
      <Card>
        <SectionHeader emoji="💡" title="5 hooks prêts à utiliser" />
        <div className="space-y-2.5">
          {analysis.recommandations?.hooks_prets?.map((h: string, i: number) => (
            <div key={i} className="flex gap-3.5 items-start">
              <Num n={i + 1} />
              <p className="text-sm italic pt-0.5" style={{ color: "rgba(26,26,16,0.75)" }}>"{h}"</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Concepts vidéos */}
      <Card>
        <SectionHeader emoji="🎬" title="3 concepts de vidéos" />
        <div className="space-y-2.5">
          {analysis.recommandations?.concepts_videos?.map((c: { titre: string; description: string; format: string; pourquoi: string }, i: number) => (
            <Inset key={i}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-sans font-bold text-sm" style={{ color: C.olive }}>{c.titre}</span>
                <Tag>{c.format}</Tag>
              </div>
              <p className="text-sm mb-2" style={{ color: "rgba(26,26,16,0.6)" }}>{c.description}</p>
              <p className="text-xs font-semibold" style={{ color: "#16a34a" }}>↑ {c.pourquoi}</p>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Plan d'action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionHeader emoji="📐" title="Angles marketing" />
          <div className="space-y-3.5">
            {analysis.recommandations?.angles_marketing?.map((a: { angle: string; approche: string }, i: number) => (
              <div key={i}>
                <p className="text-sm font-bold mb-0.5" style={{ color: C.olive }}>{a.angle}</p>
                <p className="text-xs" style={{ color: "rgba(26,26,16,0.5)" }}>{a.approche}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader emoji="🚀" title="Priorités" />
          <div className="space-y-2.5">
            {analysis.plan_action?.priorites?.map((p: string, i: number) => (
              <div key={i} className="flex gap-3 items-start">
                <Num n={i + 1} />
                <span className="text-sm pt-0.5" style={{ color: "rgba(26,26,16,0.7)" }}>{p}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader emoji="⚠️" title="Erreurs à éviter" />
        <div className="space-y-2">
          {analysis.plan_action?.erreurs_eviter?.map((e: string, i: number) => (
            <Row key={i} icon="bad">{e}</Row>
          ))}
        </div>
      </Card>

      <BonusSection bonus={analysis.bonus} />
    </div>
  );
}

/* ─────────────────────────────────────────
   VIDEO RESULTS
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VideoResults({ data }: { data: any }) {
  const { analysis, framesAnalyzed, performance } = data;
  const score = analysis.score_viralite?.note ?? 0;
  const scoreColor = score >= 7 ? "#22c55e" : score >= 5 ? "#f97316" : "#ef4444";
  const perf: Record<string, { bg: string; text: string; label: string }> = {
    viral:   { bg: "#22c55e14", text: "#16a34a", label: "Virale" },
    flop:    { bg: "#ef444414", text: "#dc2626", label: "Flop" },
    unknown: { bg: C.lime + "25", text: C.olive, label: "Pré-publication" },
  };
  const vs = perf[performance] || perf.unknown;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap py-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.lime }} />
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(26,26,16,0.35)" }}>Analyse vidéo</span>
        <Chip>{analysis.plateforme}</Chip>
        {framesAnalyzed && (
          <span className="text-[10px] font-sans font-semibold uppercase tracking-widest"
            style={{ color: "rgba(26,26,16,0.3)" }}>
            {framesAnalyzed} frames
          </span>
        )}
      </div>

      {/* Score hero */}
      <Card>
        <div className="flex items-center gap-6">
          {/* Circle score */}
          <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
            <svg className="-rotate-90" width="80" height="80" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke="rgba(26,26,16,0.08)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={scoreColor} strokeWidth="2.5"
                strokeDasharray={`${(score / 10) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-sans font-black text-2xl" style={{ color: scoreColor }}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <span
              className="inline-block text-[11px] font-sans font-bold px-3 py-1 rounded-full mb-2.5 uppercase tracking-wider"
              style={{ backgroundColor: vs.bg, color: vs.text }}
            >
              {analysis.verdict}
            </span>
            <p className="font-sans font-black text-xl leading-tight" style={{ color: C.olive }}>
              {analysis.score_viralite?.label}
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(26,26,16,0.45)" }}>
              {analysis.score_viralite?.explication}
            </p>
          </div>
        </div>
      </Card>

      {/* Hook */}
      <Card>
        <SectionHeader emoji="🎣" title="Hook" />
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <ScorePill score={analysis.hook?.score} />
          <span className="text-xs font-semibold"
            style={{ color: analysis.hook?.arrete_scroll ? "#16a34a" : "#ef4444" }}>
            {analysis.hook?.arrete_scroll ? "↑ Arrête le scroll" : "↓ Ne stoppe pas le scroll"}
          </span>
          {analysis.hook?.technique && (
            <span className="text-xs" style={{ color: "rgba(26,26,16,0.4)" }}>
              · {analysis.hook.technique}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(26,26,16,0.75)" }}>
          {analysis.hook?.analyse}
        </p>
      </Card>

      {/* Structure */}
      <Card>
        <SectionHeader emoji="🏗️" title="Structure" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Rythme", value: analysis.structure?.rythme },
            { label: "Clarté", value: analysis.structure?.clarte },
            { label: "Storytelling", value: analysis.structure?.storytelling },
          ].map(({ label, value }) => (
            <Inset key={label}>
              <Label>{label}</Label>
              <p className="text-sm" style={{ color: "rgba(26,26,16,0.8)" }}>{value}</p>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Diagnostic */}
      <Card>
        <SectionHeader emoji="🔬" title="Diagnostic" />
        <Inset className="mb-4">
          <Label>Facteur clé</Label>
          <p className="text-sm font-semibold" style={{ color: C.olive }}>
            {analysis.diagnostic_performance?.facteur_cle}
          </p>
        </Inset>
        <div className="space-y-2">
          {analysis.diagnostic_performance?.raisons_principales?.map((r: string, i: number) => (
            <Row key={i} icon="neutral">{r}</Row>
          ))}
        </div>
      </Card>

      {/* Points forts / faibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionHeader emoji="✅" title="Points forts" />
          <div className="space-y-2">
            {analysis.points_forts?.map((p: string, i: number) => (
              <Row key={i} icon="good">{p}</Row>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader emoji="⚠️" title="Points faibles" />
          <div className="space-y-2">
            {analysis.points_faibles?.map((p: string, i: number) => (
              <Row key={i} icon="bad">{p}</Row>
            ))}
          </div>
        </Card>
      </div>

      {/* Optimisations */}
      <Card>
        <SectionHeader emoji="🛠️" title="Optimisations concrètes" />
        <div className="space-y-3">
          {analysis.optimisations?.map((o: { element: string; probleme: string; solution: string }, i: number) => (
            <Inset key={i} className="space-y-2">
              <Label>{o.element}</Label>
              <Row icon="bad">{o.probleme}</Row>
              <Row icon="good">{o.solution}</Row>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Verdict final */}
      <Card accent>
        <p className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] mb-3"
          style={{ color: C.lime }}>
          Verdict final
        </p>
        <p className="text-sm font-semibold leading-relaxed" style={{ color: C.cream }}>
          {analysis.verdict_final}
        </p>
      </Card>

      <BonusSection bonus={analysis.bonus} />
    </div>
  );
}

/* ─────────────────────────────────────────
   SCRIPT RESULTS
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScriptResults({ data }: { data: any }) {
  const { analysis } = data;
  const score = analysis.score_viralite?.note ?? 0;
  const scoreColor = score >= 7 ? "#22c55e" : score >= 5 ? "#f97316" : "#ef4444";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 py-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.lime }} />
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(26,26,16,0.35)" }}>Analyse script</span>
      </div>

      {/* Score */}
      <Card>
        <div className="flex items-center gap-6">
          <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
            <svg className="-rotate-90" width="80" height="80" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke="rgba(26,26,16,0.08)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={scoreColor} strokeWidth="2.5"
                strokeDasharray={`${(score / 10) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-sans font-black text-2xl" style={{ color: scoreColor }}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="font-sans font-black text-xl leading-tight mb-1" style={{ color: C.olive }}>
              {analysis.score_viralite?.label}
            </p>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.45)" }}>
              {analysis.score_viralite?.explication}
            </p>
          </div>
        </div>
      </Card>

      {/* Métriques */}
      <Card>
        <SectionHeader emoji="📊" title="Analyse détaillée" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Hook", metric: analysis.analyse?.hook },
            { label: "Clarté", metric: analysis.analyse?.clarte },
            { label: "Rythme", metric: analysis.analyse?.rythme },
            { label: "Engagement", metric: analysis.analyse?.engagement },
          ].map(({ label, metric }) => (
            <Inset key={label} className="text-center">
              <Label>{label}</Label>
              <ScorePill score={metric?.score ?? 0} />
              {metric?.force && (
                <p className="text-[10px] mt-2" style={{ color: "rgba(26,26,16,0.4)" }}>
                  {metric.force}
                </p>
              )}
            </Inset>
          ))}
        </div>
      </Card>

      {/* Points faibles */}
      <Card>
        <SectionHeader emoji="⚠️" title="Points à améliorer" />
        <div className="space-y-2">
          {analysis.points_faibles?.map((p: string, i: number) => (
            <Row key={i} icon="bad">{p}</Row>
          ))}
        </div>
      </Card>

      {/* Optimisations */}
      <Card>
        <SectionHeader emoji="🛠️" title="Optimisations" />
        <div className="space-y-3">
          {[
            { label: "Hook", data: analysis.optimisations?.hook },
            { label: "Rétention", data: analysis.optimisations?.retention },
            { label: "CTA", data: analysis.optimisations?.cta },
          ].map(({ label, data }) => (
            <Inset key={label} className="space-y-2">
              <Label>{label}</Label>
              {data?.probleme && <Row icon="bad">{data.probleme}</Row>}
              {data?.solution && <Row icon="good">{data.solution}</Row>}
            </Inset>
          ))}
        </div>
      </Card>

      {/* Script optimisé */}
      <Card accent>
        <p className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] mb-4"
          style={{ color: C.lime }}>
          ✨ Script optimisé
        </p>
        <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
            style={{ color: "rgba(233,229,218,0.85)" }}>
            {analysis.script_ameliore}
          </p>
        </div>
      </Card>

      <BonusSection bonus={analysis.bonus} />
    </div>
  );
}

/* ─────────────────────────────────────────
   TRENDS RESULTS
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendsResults({ data }: { data: any }) {
  const { analysis, platform, niche } = data;
  const urgColor: Record<string, string> = {
    haute: "#ef4444", moyenne: "#f97316", basse: "#22c55e",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap py-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#ef4444" }} />
          <span className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "#ef4444" }} />
        </span>
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em]"
          style={{ color: "rgba(26,26,16,0.35)" }}>
          Données temps réel
        </span>
        <Chip active>{platform}</Chip>
        {niche && <Chip>{niche}</Chip>}
      </div>

      {/* Sources banner */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ backgroundColor: C.white, border: "1px solid rgba(26,26,16,0.06)" }}>
        <span className="text-sm shrink-0 mt-0.5">🌐</span>
        <p className="text-[11px] leading-relaxed" style={{ color: "rgba(26,26,16,0.45)" }}>
          Collecte live depuis{" "}
          <strong style={{ color: "rgba(26,26,16,0.65)" }}>TikTok Creative Center</strong> ·{" "}
          <strong style={{ color: "rgba(26,26,16,0.65)" }}>trends24.in</strong> ·{" "}
          <strong style={{ color: "rgba(26,26,16,0.65)" }}>top-hashtags.com</strong> ·{" "}
          <strong style={{ color: "rgba(26,26,16,0.65)" }}>Google Trends</strong> ·{" "}
          <strong style={{ color: "rgba(26,26,16,0.65)" }}>Reddit</strong>
        </p>
      </div>

      {/* Formats */}
      <Card>
        <SectionHeader emoji="🚀" title="Formats qui explosent" />
        <div className="space-y-2.5">
          {analysis.formats_qui_explosent?.map((f: { format: string; description: string; pourquoi: string; duree: string }, i: number) => (
            <Inset key={i}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-sans font-bold text-sm" style={{ color: C.olive }}>{f.format}</span>
                <span className="text-[10px] font-mono font-bold shrink-0"
                  style={{ color: "rgba(26,26,16,0.35)" }}>{f.duree}</span>
              </div>
              <p className="text-sm mb-1.5" style={{ color: "rgba(26,26,16,0.6)" }}>{f.description}</p>
              <p className="text-xs font-semibold" style={{ color: "#16a34a" }}>↑ {f.pourquoi}</p>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Hooks */}
      <Card>
        <SectionHeader emoji="🎣" title="Types de hooks qui marchent" />
        <div className="space-y-2.5">
          {analysis.types_de_hooks?.map((h: { type: string; exemple: string; score_retention: number }, i: number) => (
            <Inset key={i}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Chip active>{h.type}</Chip>
                <ScorePill score={h.score_retention} />
              </div>
              <p className="text-sm italic" style={{ color: "rgba(26,26,16,0.75)" }}>"{h.exemple}"</p>
            </Inset>
          ))}
        </div>
      </Card>

      {/* Musique */}
      <Card>
        <SectionHeader emoji="🎵" title="Tendances musicales" />
        <div className="space-y-4">
          <div>
            <Label>Styles qui performent</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.tendances_musicales?.styles?.map((s: string, i: number) => <Tag key={i} lime>{s}</Tag>)}
            </div>
          </div>
          <Divider />
          <Inset>
            <Label>Énergie</Label>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.8)" }}>{analysis.tendances_musicales?.energie}</p>
          </Inset>
          <Inset>
            <Label>Conseil</Label>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.8)" }}>💡 {analysis.tendances_musicales?.conseil}</p>
          </Inset>
        </div>
      </Card>

      {/* Visuels */}
      <Card>
        <SectionHeader emoji="🎬" title="Visuels qui performent" />
        <div className="space-y-4">
          <div>
            <Label>Couleurs / palettes</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.visuels_qui_performent?.couleurs?.map((c: string, i: number) => <Tag key={i}>{c}</Tag>)}
            </div>
          </div>
          <Divider />
          <div>
            <Label>Styles de tournage</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.visuels_qui_performent?.styles_tournage?.map((s: string, i: number) => <Tag key={i} lime>{s}</Tag>)}
            </div>
          </div>
          <Divider />
          <div>
            <Label>Transitions</Label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.visuels_qui_performent?.transitions?.map((t: string, i: number) => <Tag key={i}>{t}</Tag>)}
            </div>
          </div>
          <Divider />
          <Inset>
            <Label>Texte à l'écran</Label>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.75)" }}>
              {analysis.visuels_qui_performent?.texte_a_lecran}
            </p>
          </Inset>
        </div>
      </Card>

      {/* Sujets en tendance */}
      <Card>
        <SectionHeader emoji="🔥" title="Sujets en tendance" />
        <div className="space-y-2.5">
          {analysis.sujets_en_tendance?.map((s: { sujet: string; angle: string; urgence: string }, i: number) => (
            <div key={i} className="flex gap-4 items-start rounded-xl p-4"
              style={{ backgroundColor: C.cream }}>
              <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: urgColor[s.urgence] || C.lime }} />
              <div className="flex-1">
                <p className="font-sans font-bold text-sm mb-0.5" style={{ color: C.olive }}>{s.sujet}</p>
                <p className="text-xs" style={{ color: "rgba(26,26,16,0.5)" }}>Angle : {s.angle}</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: (urgColor[s.urgence] || C.lime) + "18",
                  color: urgColor[s.urgence] || C.lime,
                }}>
                {s.urgence}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Algorithme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionHeader emoji="⬆️" title="Ce qui booste" />
          <div className="space-y-2">
            {analysis.algorithme?.ce_qui_booste?.map((b: string, i: number) => (
              <Row key={i} icon="good">{b}</Row>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader emoji="⬇️" title="Ce qui pénalise" />
          <div className="space-y-2">
            {analysis.algorithme?.ce_qui_penalise?.map((p: string, i: number) => (
              <Row key={i} icon="bad">{p}</Row>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label>Meilleur moment</Label>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.75)" }}>
              {analysis.algorithme?.meilleur_moment_poster}
            </p>
          </div>
          <div>
            <Label>Fréquence idéale</Label>
            <p className="text-sm" style={{ color: "rgba(26,26,16,0.75)" }}>
              {analysis.algorithme?.frequence_ideale}
            </p>
          </div>
        </div>
      </Card>

      {/* Erreurs */}
      <Card>
        <SectionHeader emoji="🚫" title="Erreurs du moment" />
        <div className="space-y-2">
          {analysis.erreurs_du_moment?.map((e: string, i: number) => (
            <Row key={i} icon="bad">{e}</Row>
          ))}
        </div>
      </Card>

      {/* Opportunités */}
      <Card>
        <SectionHeader emoji="💎" title="Opportunités à saisir" />
        <div className="space-y-2.5">
          {analysis.opportunites?.map((o: { opportunite: string; pourquoi_maintenant: string }, i: number) => (
            <div key={i} className="flex gap-4 items-start rounded-xl p-4"
              style={{ backgroundColor: C.cream }}>
              <Num n={i + 1} />
              <div>
                <p className="font-sans font-bold text-sm mb-0.5" style={{ color: C.olive }}>
                  {o.opportunite}
                </p>
                <p className="text-xs" style={{ color: "rgba(26,26,16,0.5)" }}>
                  {o.pourquoi_maintenant}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Concepts */}
      <Card>
        <SectionHeader emoji="💡" title="Concepts à filmer maintenant" />
        <div className="space-y-2.5">
          {analysis.exemples_concepts?.map((c: string, i: number) => (
            <div key={i} className="flex gap-3.5 items-start">
              <Num n={i + 1} />
              <p className="text-sm pt-0.5" style={{ color: "rgba(26,26,16,0.75)" }}>{c}</p>
            </div>
          ))}
        </div>
      </Card>

      <BonusSection bonus={analysis.bonus} />
    </div>
  );
}

/* ─────────────────────────────────────────
   BONUS SECTION
───────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BonusSection({ bonus }: { bonus: any }) {
  if (!bonus) return null;
  return (
    <Card accent>
      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] mb-5"
        style={{ color: C.lime }}>
        💎 Bonus — Hooks optimisés
      </p>
      <div className="space-y-2.5 mb-6">
        {bonus.hooks_optimises?.map((h: string, i: number) => (
          <div key={i} className="flex gap-3.5 items-start">
            <span
              className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
              style={{ backgroundColor: C.lime, color: C.olive }}
            >
              {i + 1}
            </span>
            <p className="text-sm italic pt-0.5" style={{ color: "rgba(233,229,218,0.8)" }}>"{h}"</p>
          </div>
        ))}
      </div>
      {bonus.idee_video && (
        <div>
          <p className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] mb-3"
            style={{ color: C.lime }}>
            Idée de vidéo
          </p>
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-sm" style={{ color: "rgba(233,229,218,0.8)" }}>💡 {bonus.idee_video}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export default function Home() {
  const [mode, setMode] = useState<Mode>(null);
  const [niche, setNiche] = useState("");
  const [nicheCategory, setNicheCategory] = useState("");
  const [nicheDescription, setNicheDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["TikTok", "Instagram"]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTab, setVideoTab] = useState<"url" | "upload">("url");
  const [videoPerformance, setVideoPerformance] = useState<"viral" | "flop" | "unknown">("unknown");
  const [videoContext, setVideoContext] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPlatform, setVideoPlatform] = useState("TikTok");
  const [script, setScript] = useState("");
  const [scriptNiche, setScriptNiche] = useState("");
  const [scriptPlatform, setScriptPlatform] = useState("TikTok");
  const [trendsPlatform, setTrendsPlatform] = useState("TikTok");
  const [trendsNiche, setTrendsNiche] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [resultMode, setResultMode] = useState<Mode>(null);
  const [error, setError] = useState("");

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSubmit() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      let endpoint = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any = {};
      if (mode === "niche") {
        if (!niche.trim()) { setError("Entre un produit ou une niche."); setLoading(false); return; }
        endpoint = "/api/analyze/niche";
        const fullDescription = [nicheCategory, nicheDescription].filter(Boolean).join(" — ");
        body = { niche, description: fullDescription, platforms: selectedPlatforms };
      } else if (mode === "video") {
        endpoint = "/api/analyze/video";
        if (videoTab === "upload") {
          if (!videoFile) { setError("Sélectionne une vidéo."); setLoading(false); return; }
          const fd = new FormData();
          fd.append("video", videoFile);
          fd.append("performance", videoPerformance);
          fd.append("context", videoContext);
          fd.append("platform", videoPlatform);
          const res = await fetch(endpoint, { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erreur");
          setResult(data); setResultMode(mode);
          setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
          setLoading(false);
          return;
        } else {
          if (!videoUrl.trim()) { setError("Entre une URL."); setLoading(false); return; }
          body = { url: videoUrl, performance: videoPerformance, context: videoContext };
        }
      } else if (mode === "script") {
        if (!script.trim()) { setError("Entre ton script."); setLoading(false); return; }
        endpoint = "/api/analyze/script";
        body = { script, niche: scriptNiche, platform: scriptPlatform };
      } else if (mode === "trends") {
        endpoint = "/api/analyze/trends";
        body = { platform: trendsPlatform, niche: trendsNiche };
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setResult(data); setResultMode(mode);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  const modes = [
    { id: "trends" as Mode, num: "01", icon: "📡", title: "Tendances", desc: "Données live · Formats · Hooks · Musique" },
    { id: "niche" as Mode, num: "02", icon: "🎯", title: "Produit", desc: "Niche · Tendances · Plan d'action" },
    { id: "video" as Mode, num: "03", icon: "🎬", title: "Vidéo", desc: "Viral · Flop · Pré-publication" },
    { id: "script" as Mode, num: "04", icon: "✍️", title: "Script", desc: "Score · Version optimisée" },
  ];

  const inputCls = [
    "w-full rounded-xl px-4 py-3 text-sm font-sans transition-all outline-none",
    "border focus:border-[#1A1A10]/40",
  ].join(" ");

  const inputStyle = {
    backgroundColor: C.cream,
    borderColor: "rgba(26,26,16,0.12)",
    color: C.olive,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream }}>

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-50 border-b px-6 py-3.5"
        style={{
          backgroundColor: C.olive,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: C.lime }}
            >
              <span className="font-sans font-black text-[11px]" style={{ color: C.olive }}>SS</span>
            </div>
            <span className="font-sans font-bold text-sm tracking-tight" style={{ color: C.cream }}>
              Studio Savora
            </span>
            <span className="text-xs font-sans" style={{ color: "rgba(233,229,218,0.3)" }}>
              / Viral Analyzer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ backgroundColor: C.lime }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: C.lime }} />
            </span>
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.18em]"
              style={{ color: "rgba(233,229,218,0.4)" }}>
              Live
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-16 space-y-12">

        {/* ── HERO ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: "rgba(26,26,16,0.12)" }} />
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em]"
              style={{ color: "rgba(26,26,16,0.35)" }}>
              TikTok · Instagram · Facebook · X
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "rgba(26,26,16,0.12)" }} />
          </div>

          <div>
            <h1
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: "clamp(52px, 10vw, 88px)",
                color: C.olive,
                letterSpacing: "-0.01em",
              }}
            >
              ANALYSE DE<br />
              CONTENU{" "}
              <span
                className="inline-block px-3 rounded-lg"
                style={{ backgroundColor: C.lime, color: C.olive }}
              >
                VIRAL
              </span>
            </h1>
          </div>

          <p className="text-base font-sans max-w-xs" style={{ color: "rgba(26,26,16,0.45)" }}>
            Insights directs. Recommandations actionnables.<br />Zéro blabla.
          </p>
        </div>

        {/* ── MODE SELECTOR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(""); }}
                className="relative p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer group"
                style={{
                  backgroundColor: active ? C.olive : C.white,
                  boxShadow: active
                    ? `0 0 0 2px ${C.lime}`
                    : "0 1px 3px rgba(26,26,16,0.06), 0 4px 16px rgba(26,26,16,0.04)",
                  border: active ? "none" : "1px solid rgba(26,26,16,0.06)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: active ? C.lime : "rgba(26,26,16,0.2)" }}
                  >
                    {m.num}
                  </span>
                  <span className="text-lg leading-none">{m.icon}</span>
                </div>
                <p
                  className="font-sans font-bold text-sm mb-1"
                  style={{ color: active ? C.white : C.olive }}
                >
                  {m.title}
                </p>
                <p
                  className="text-[11px] font-sans leading-snug"
                  style={{ color: active ? "rgba(255,255,255,0.35)" : "rgba(26,26,16,0.35)" }}
                >
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── FORM ── */}
        {mode && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 2px 8px rgba(26,26,16,0.08), 0 16px 48px rgba(26,26,16,0.06)",
              border: "1px solid rgba(26,26,16,0.06)",
            }}
          >
            {/* Form header */}
            <div className="px-6 py-4 border-b" style={{
              backgroundColor: C.olive,
              borderColor: "rgba(255,255,255,0.08)",
            }}>
              <p className="text-sm font-sans font-bold" style={{ color: C.cream }}>
                {mode === "trends" && "📡 Analyse des tendances"}
                {mode === "niche" && "🎯 Analyser un produit"}
                {mode === "video" && "🎬 Analyser une vidéo"}
                {mode === "script" && "✍️ Analyser un script"}
              </p>
            </div>

            {/* Form body */}
            <div className="p-6 space-y-5" style={{ backgroundColor: C.white }}>

              {/* ── TRENDS ── */}
              {mode === "trends" && (
                <>
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Plateforme
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setTrendsPlatform(p)}
                          className="px-4 py-2 rounded-xl text-sm font-sans font-bold transition-all cursor-pointer"
                          style={
                            trendsPlatform === p
                              ? { backgroundColor: C.olive, color: C.lime }
                              : { backgroundColor: C.cream, color: "rgba(26,26,16,0.5)", border: "1px solid rgba(26,26,16,0.1)" }
                          }
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Catégorie{" "}
                      <span className="normal-case font-normal" style={{ color: "rgba(26,26,16,0.25)" }}>
                        — optionnel
                      </span>
                    </p>
                    <input
                      value={trendsNiche}
                      onChange={(e) => setTrendsNiche(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="beauté, fitness, finance, food..."
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* ── NICHE / PRODUIT ── */}
              {mode === "niche" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                        style={{ color: "rgba(26,26,16,0.4)" }}>
                        Produit
                      </p>
                      <input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder="sérum vitamine C, montre connectée..."
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                        style={{ color: "rgba(26,26,16,0.4)" }}>
                        Niche{" "}
                        <span className="normal-case font-normal" style={{ color: "rgba(26,26,16,0.25)" }}>
                          — optionnel
                        </span>
                      </p>
                      <input
                        value={nicheCategory}
                        onChange={(e) => setNicheCategory(e.target.value)}
                        placeholder="beauté, fitness, tech..."
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Description{" "}
                      <span className="normal-case font-normal" style={{ color: "rgba(26,26,16,0.25)" }}>
                        — optionnel
                      </span>
                    </p>
                    <textarea
                      value={nicheDescription}
                      onChange={(e) => setNicheDescription(e.target.value)}
                      placeholder="Cible, positionnement, différenciateur..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Plateformes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => togglePlatform(p)}
                          className="px-4 py-1.5 rounded-full text-xs font-sans font-bold transition-all cursor-pointer"
                          style={
                            selectedPlatforms.includes(p)
                              ? { backgroundColor: C.olive, color: C.lime }
                              : { backgroundColor: C.cream, color: "rgba(26,26,16,0.45)", border: "1px solid rgba(26,26,16,0.1)" }
                          }
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── VIDEO ── */}
              {mode === "video" && (
                <>
                  {/* Tabs URL / Upload */}
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Source
                    </p>
                    <div className="flex rounded-xl p-1" style={{ backgroundColor: C.cream }}>
                      {(["url", "upload"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setVideoTab(tab)}
                          className="flex-1 py-2 rounded-lg text-sm font-sans font-bold transition-all cursor-pointer"
                          style={
                            videoTab === tab
                              ? { backgroundColor: C.white, color: C.olive, boxShadow: "0 1px 4px rgba(26,26,16,0.1)" }
                              : { color: "rgba(26,26,16,0.4)" }
                          }
                        >
                          {tab === "url" ? "🔗 URL" : "📁 Upload"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {videoTab === "url" ? (
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@..."
                      className={inputCls}
                      style={inputStyle}
                    />
                  ) : (
                    <div>
                      <div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                          style={{ color: "rgba(26,26,16,0.4)" }}>
                          Plateforme
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {PLATFORMS.map((p) => (
                            <button
                              key={p}
                              onClick={() => setVideoPlatform(p)}
                              className="px-3 py-1.5 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer"
                              style={
                                videoPlatform === p
                                  ? { backgroundColor: C.olive, color: C.lime }
                                  : { backgroundColor: C.cream, color: "rgba(26,26,16,0.45)", border: "1px solid rgba(26,26,16,0.1)" }
                              }
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all"
                        style={{
                          borderColor: videoFile ? C.lime : "rgba(26,26,16,0.12)",
                          backgroundColor: videoFile ? C.lime + "10" : C.cream,
                        }}
                      >
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        />
                        <span className="text-2xl">{videoFile ? "✅" : "📹"}</span>
                        <span className="text-sm font-sans font-semibold text-center"
                          style={{ color: videoFile ? C.olive : "rgba(26,26,16,0.4)" }}>
                          {videoFile ? videoFile.name : "Clique pour sélectionner une vidéo"}
                        </span>
                        {!videoFile && (
                          <span className="text-xs" style={{ color: "rgba(26,26,16,0.3)" }}>
                            MP4, MOV, AVI...
                          </span>
                        )}
                      </label>
                    </div>
                  )}

                  {/* Performance selector */}
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Situation de la vidéo
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "viral" as const, label: "Elle a cartonné", emoji: "🚀" },
                        { id: "flop" as const, label: "Elle n'a pas marché", emoji: "📉" },
                        { id: "unknown" as const, label: "Pas encore postée", emoji: "🔍" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setVideoPerformance(p.id)}
                          className="py-3.5 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer text-center"
                          style={
                            videoPerformance === p.id
                              ? { backgroundColor: C.olive, color: C.lime }
                              : { backgroundColor: C.cream, color: "rgba(26,26,16,0.5)", border: "1px solid rgba(26,26,16,0.1)" }
                          }
                        >
                          <span className="block text-lg mb-1">{p.emoji}</span>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Précisions{" "}
                      <span className="normal-case font-normal" style={{ color: "rgba(26,26,16,0.25)" }}>
                        — optionnel
                      </span>
                    </p>
                    <textarea
                      value={videoContext}
                      onChange={(e) => setVideoContext(e.target.value)}
                      placeholder="Pourquoi le hook ne retient pas ? Comment améliorer le CTA ?..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* ── SCRIPT ── */}
              {mode === "script" && (
                <>
                  <div>
                    <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                      style={{ color: "rgba(26,26,16,0.4)" }}>
                      Ton script
                    </p>
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Colle ton script ici..."
                      rows={6}
                      className={`${inputCls} resize-none`}
                      style={inputStyle}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                        style={{ color: "rgba(26,26,16,0.4)" }}>
                        Niche{" "}
                        <span className="normal-case font-normal" style={{ color: "rgba(26,26,16,0.25)" }}>
                          — optionnel
                        </span>
                      </p>
                      <input
                        value={scriptNiche}
                        onChange={(e) => setScriptNiche(e.target.value)}
                        placeholder="fitness, beauty..."
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-2"
                        style={{ color: "rgba(26,26,16,0.4)" }}>
                        Plateforme cible
                      </p>
                      <select
                        value={scriptPlatform}
                        onChange={(e) => setScriptPlatform(e.target.value)}
                        className={`${inputCls} appearance-none cursor-pointer`}
                        style={inputStyle}
                      >
                        {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm font-sans font-medium"
                  style={{ backgroundColor: "#ef444412", color: "#dc2626" }}>
                  {error}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-xl font-sans font-black text-sm uppercase tracking-[0.15em] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: C.olive, color: C.lime }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                    </svg>
                    {mode === "video"
                      ? "Téléchargement + analyse..."
                      : mode === "trends"
                      ? "Collecte données live + analyse..."
                      : "Analyse en cours..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Lancer l'analyse
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && (
          <div id="results" className="space-y-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ backgroundColor: "rgba(26,26,16,0.1)" }} />
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em]"
                style={{ color: "rgba(26,26,16,0.3)" }}>
                Résultats
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: "rgba(26,26,16,0.1)" }} />
            </div>
            {resultMode === "trends" && <TrendsResults data={result} />}
            {resultMode === "niche" && <NicheResults data={result} />}
            {resultMode === "video" && <VideoResults data={result} />}
            {resultMode === "script" && <ScriptResults data={result} />}
          </div>
        )}

        <div className="pb-10" />
      </main>
    </div>
  );
}
