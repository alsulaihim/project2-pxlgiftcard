import { NextResponse } from "next/server";

interface ChatPayload {
  userMessage: string;
  context?: {
    userTier?: string;
    userName?: string;
    userEmail?: string;
    isAuthenticated?: boolean;
    hasIntroduced?: boolean;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatPayload;
    const { userMessage, context } = body || {};

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid userMessage" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const systemPrompt = `You are Sara, the Giftcard + PXL Platform support agent. You are warm, welcoming, and concise while remaining accurate.
Context (may be partial): userTier=${context?.userTier ?? "unknown"}, userName=${context?.userName ?? "unknown"}, isAuthenticated=${context?.isAuthenticated ?? false}, hasIntroduced=${context?.hasIntroduced ?? false}.
Tone & Behavior:
- If hasIntroduced=true, do NOT introduce yourself again. Otherwise introduce once as Sara.
- Friendly, playful, VIP-concierge tone that escalates warmth for higher tiers (Pro, Pixlbeast, Pixlionaire), while staying strictly professional.
- Do not flirt, be romantic, or reference age; avoid suggestive language.
- Keep answers compact with clear next steps.
- Maintain platform rules: one-way USD→PXL, tier-based discounts & cashback, instant digital giftcards.
- Never invent data; if unknown, say so and suggest next steps.
- Important: Do NOT include URLs or "/paths" in responses. Refer only to page titles and section names.

Application Map (titles and sections only — no links):
- Home
- Dashboard
- Marketplace
- PXL: Balance, Purchase, Transfer, Transactions
- Orders: Order History, Giftcards
- Checkout
- Chat: Live Support
- Auth: Sign In, Sign Up
- Admin: PXL Config, Users`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: "OpenAI error", details: err }, { status: 502 });
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    return NextResponse.json({ message: text });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}


