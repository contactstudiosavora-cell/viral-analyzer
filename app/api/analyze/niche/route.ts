import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { niche, description, platforms } = await req.json();

    if (!niche?.trim() && !description?.trim()) {
      return NextResponse.json({ error: "Produit ou niche requis" }, { status: 400 });
    }

    const platformList =
      Array.isArray(platforms) && platforms.length
        ? platforms.join(", ")
        : "TikTok, Instagram, Facebook, X";

    const prompt = `Tu es un expert en marketing viral et analyse de contenu social media. Tu analyses les tendances pour des agences de création de contenu UGC.

PRODUIT : ${niche || "Non spécifié"}
${description ? `DESCRIPTION / NICHE : ${description}` : ""}
PLATEFORMES : ${platformList}

Fais une analyse complète et actionnable. Sois DIRECT, CONCIS, comme un créateur de contenu senior qui partage ses insights.

Réponds UNIQUEMENT en JSON valide (rien d'autre) :

{
  "tendances": {
    "formats": ["format1", "format2", "format3", "format4", "format5"],
    "types_videos": ["type1", "type2", "type3"],
    "duree_moyenne": "X-Y secondes",
    "styles_dominants": ["style1", "style2", "style3", "style4"]
  },
  "patterns": {
    "hooks": [
      { "type": "Question choc", "exemple": "exemple concret", "pourquoi": "raison courte" },
      { "type": "Relatable", "exemple": "exemple concret", "pourquoi": "raison courte" },
      { "type": "Chiffre/Stats", "exemple": "exemple concret", "pourquoi": "raison courte" },
      { "type": "Contre-intuitif", "exemple": "exemple concret", "pourquoi": "raison courte" }
    ],
    "structures": ["Problème → Douleur → Solution → CTA", "structure2", "structure3"],
    "cta": ["CTA1", "CTA2", "CTA3", "CTA4"]
  },
  "comportement": {
    "pourquoi_cliquent": "explication directe en 2-3 phrases",
    "pourquoi_restent": "explication directe en 2-3 phrases",
    "pourquoi_partagent": "explication directe en 2-3 phrases"
  },
  "recommandations": {
    "hooks_prets": [
      "Hook 1 complet prêt à utiliser",
      "Hook 2 complet prêt à utiliser",
      "Hook 3 complet prêt à utiliser",
      "Hook 4 complet prêt à utiliser",
      "Hook 5 complet prêt à utiliser"
    ],
    "concepts_videos": [
      { "titre": "Titre concept", "description": "Description courte", "format": "format", "pourquoi": "pourquoi ça marche" },
      { "titre": "Titre concept", "description": "Description courte", "format": "format", "pourquoi": "pourquoi ça marche" },
      { "titre": "Titre concept", "description": "Description courte", "format": "format", "pourquoi": "pourquoi ça marche" }
    ],
    "angles_marketing": [
      { "angle": "Nom angle", "approche": "description courte" },
      { "angle": "Nom angle", "approche": "description courte" },
      { "angle": "Nom angle", "approche": "description courte" }
    ]
  },
  "plan_action": {
    "priorites": ["Action 1 à tester en premier", "Action 2", "Action 3"],
    "erreurs_eviter": ["Erreur fréquente 1", "Erreur 2", "Erreur 3"],
    "quick_wins": ["Win rapide 1", "Win rapide 2"]
  },
  "bonus": {
    "hooks_optimises": [
      "Hook optimisé 1",
      "Hook optimisé 2",
      "Hook optimisé 3"
    ],
    "idee_video": "Description d'une idée de vidéo inspirée de l'analyse, directement actionnable"
  }
}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Erreur de parsing" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis, niche, platforms: platformList });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("analyze/niche error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
