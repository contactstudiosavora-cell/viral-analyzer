import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { script, niche, platform } = await req.json();

    if (!script?.trim()) {
      return NextResponse.json({ error: "Script requis" }, { status: 400 });
    }

    const prompt = `Tu es un expert en création de contenu viral. Tu analyses des scripts vidéo pour maximiser leurs performances.

${niche ? `NICHE : ${niche}` : ""}
${platform ? `PLATEFORME CIBLE : ${platform}` : "PLATEFORME : TikTok / Instagram / Facebook"}

SCRIPT À ANALYSER :
---
${script}
---

Analyse ce script et donne des recommandations concrètes. Sois DIRECT, comme un créateur senior qui coache.

Réponds UNIQUEMENT en JSON valide :

{
  "score_viralite": {
    "note": 7,
    "label": "Bon potentiel",
    "explication": "Explication courte du score en 2 phrases max"
  },
  "analyse": {
    "hook": {
      "force": "Fort / Moyen / Faible",
      "score": 6,
      "diagnostic": "Analyse directe du hook actuel"
    },
    "clarte": {
      "force": "Clair / Moyen / Confus",
      "score": 7,
      "diagnostic": "Message principal clair?"
    },
    "rythme": {
      "force": "Rapide / Moyen / Lent",
      "score": 6,
      "diagnostic": "Rythme et fluidité du script"
    },
    "engagement": {
      "score": 6,
      "diagnostic": "Potentiel d'engagement et de partage"
    }
  },
  "points_faibles": [
    "Point faible 1 — explication courte",
    "Point faible 2 — explication courte",
    "Point faible 3 — explication courte"
  ],
  "optimisations": {
    "hook": {
      "probleme": "Ce qui ne marche pas dans le hook actuel",
      "solution": "Comment le corriger"
    },
    "retention": {
      "probleme": "Ce qui risque de faire décrocher",
      "solution": "Comment améliorer la rétention"
    },
    "cta": {
      "probleme": "Problème avec le CTA actuel ou son absence",
      "solution": "CTA recommandé"
    }
  },
  "script_ameliore": "Version complète et optimisée du script ici. Garde la structure mais améliore hook, rythme, et CTA. Écris-le comme s'il allait être dit à la caméra.",
  "bonus": {
    "hooks_optimises": [
      "Version alternative hook 1 — plus percutante",
      "Version alternative hook 2 — angle différent",
      "Version alternative hook 3 — plus émotionnelle"
    ],
    "idee_video": "Idée de vidéo alternative basée sur le même sujet mais avec un angle plus viral"
  }
}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Erreur de parsing" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("analyze/script error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
