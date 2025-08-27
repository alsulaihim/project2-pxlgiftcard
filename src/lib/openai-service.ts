// OpenAI service for chat support
// In production, this would make actual API calls to OpenAI

interface ChatContext {
  userTier?: string;
  userName?: string;
  userEmail?: string;
  isAuthenticated: boolean;
}

interface QueryCategory {
  category: "pricing" | "tier" | "pxl" | "giftcard" | "account" | "technical" | "general";
  confidence: number;
}

/**
 * Categorize user query to provide better responses
 */
function categorizeQuery(query: string): QueryCategory {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("price") || lowerQuery.includes("cost") || lowerQuery.includes("discount")) {
    return { category: "pricing", confidence: 0.9 };
  }
  
  if (lowerQuery.includes("tier") || lowerQuery.includes("level") || lowerQuery.includes("status")) {
    return { category: "tier", confidence: 0.9 };
  }
  
  if (lowerQuery.includes("pxl") || lowerQuery.includes("currency") || lowerQuery.includes("exchange")) {
    return { category: "pxl", confidence: 0.9 };
  }
  
  if (lowerQuery.includes("gift") || lowerQuery.includes("card") || lowerQuery.includes("brand")) {
    return { category: "giftcard", confidence: 0.8 };
  }
  
  if (lowerQuery.includes("account") || lowerQuery.includes("profile") || lowerQuery.includes("password")) {
    return { category: "account", confidence: 0.8 };
  }
  
  if (lowerQuery.includes("error") || lowerQuery.includes("bug") || lowerQuery.includes("issue")) {
    return { category: "technical", confidence: 0.8 };
  }
  
  return { category: "general", confidence: 0.5 };
}

/**
 * Generate contextual responses based on user tier and query
 */
export async function generateAIResponse(
  userMessage: string,
  context: ChatContext
): Promise<string> {
  // If OpenAI key present, route to server API for real model
  if (process.env.NEXT_PUBLIC_ENABLE_OPENAI === "true") {
    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, context }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.message) return data.message as string;
      }
    } catch {
      // Fallback to local heuristic below
    }
  }

  const { category } = categorizeQuery(userMessage);
  const { userTier, userName, isAuthenticated } = context;
  const greeting = userName ? `Hi ${userName}! I’m Sara.` : "Hello! I’m Sara.";

  switch (category) {
    case "pricing":
      if (userTier === "pixlionaire") {
        return `${greeting} As a Pixlionaire member, you enjoy our maximum 13% discount on all giftcard purchases when paying with PXL, plus 3% cashback! You're getting the absolute best deals on our platform. Would you like to see specific brand pricing?`;
      } else if (userTier === "pixlbeast") {
        return `${greeting} As a Pixlbeast member, you get 10% off all giftcard purchases with PXL and 3% cashback! You're just 40,000 PXL away from Pixlionaire status with even better benefits. Would you like to know more about specific pricing?`;
      } else if (userTier === "pro") {
        return `${greeting} As a Pro member, you enjoy 8% discount on giftcards when using PXL, plus 2% cashback. Your next tier (Pixlbeast) offers 10% discount - just 5,000 more PXL to go! What specific pricing information can I help you with?`;
      } else if (userTier === "rising") {
        return `${greeting} As a Rising member, you get 5% off giftcards with PXL payments and 1% cashback. You can save even more by advancing to Pro tier (5,000 PXL). Would you like to see how much you could save on specific brands?`;
      } else {
        return `Our giftcards are available at face value when paying with USD, or you can save up to 13% by using PXL currency! As you advance through our tiers (Rising → Pro → Pixlbeast → Pixlionaire), you unlock better discounts and cashback. Would you like to learn more about our pricing structure?`;
      }
      
    case "tier":
      const tierInfo = {
        starter: "You're currently at Starter tier. Reach 1,000 PXL to unlock Rising tier with 5% discounts!",
        rising: "You're at Rising tier with 5% discounts! Reach 5,000 PXL for Pro tier (8% discount).",
        pro: "You're at Pro tier enjoying 8% discounts! Get to 10,000 PXL for Pixlbeast tier.",
        pixlbeast: "You're a Pixlbeast with 10% discounts! The ultimate Pixlionaire tier awaits at 50,000 PXL.",
        pixlionaire: "You've reached the pinnacle! As a Pixlionaire, you enjoy maximum benefits - 13% discount and 3% cashback!"
      };
      
      return userTier ? tierInfo[userTier] : "We have 5 tiers: Starter (0 PXL), Rising (1,000 PXL), Pro (5,000 PXL), Pixlbeast (10,000 PXL), and Pixlionaire (50,000 PXL). Each tier unlocks better discounts and cashback rewards!";
      
    case "pxl":
      return `PXL is our platform currency that offers real value! Current exchange rate: 1 USD = ~100 PXL (rates vary). When you use PXL to purchase giftcards, you get tier-based discounts up to 13% off! You can buy PXL with USD anytime, and the more PXL you hold, the higher your tier and benefits. ${isAuthenticated ? "Would you like to purchase some PXL now?" : "Create an account to start earning PXL benefits!"}`;
      
    case "giftcard":
      return `We offer giftcards from major brands like Amazon, Apple, Google Play, Netflix, and many more! All cards are delivered instantly to your email. ${userTier && userTier !== 'starter' ? `With your ${userTier} status, you save ${userTier === 'rising' ? '5%' : userTier === 'pro' ? '8%' : userTier === 'pixlbeast' ? '10%' : '13%'} on every purchase!` : ''} Which brand are you interested in?`;
      
    case "account":
      if (!isAuthenticated) {
        return "To access account features, you'll need to sign in or create an account. Would you like me to guide you through the registration process? It's quick and unlocks exclusive benefits!";
      }
      return `I can help with account-related questions! Common topics include:\n• Profile updates\n• Password reset\n• KYC verification\n• Email/username changes\n\nWhat specific account help do you need?`;
      
    case "technical":
      return "I’m sorry you’re experiencing issues. I can help troubleshoot or create a support ticket for our team. Could you share more details about what happened?";
      
    default:
      return `${greeting} I’m here to help with:\n• Giftcard purchases and pricing\n• PXL currency and benefits\n• Tier system and progression\n• Account management\n• Technical support\n\nWhat would you like to know more about?`;
  }
}

/**
 * Determine if a support ticket should be created based on the query
 */
export function shouldCreateTicket(message: string): boolean {
  const ticketKeywords = [
    "human", "agent", "support", "help me", "ticket", "complaint", 
    "refund", "broken", "not working", "error", "failed", "urgent"
  ];
  
  const lowerMessage = message.toLowerCase();
  return ticketKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Extract key information from chat for ticket creation
 */
export function extractTicketInfo(messages: any[]): {
  summary: string;
  priority: "low" | "medium" | "high" | "urgent";
} {
  const lastMessages = messages.slice(-5); // Last 5 messages
  const userMessages = lastMessages.filter(m => m.sender === "user");
  
  // Determine priority based on keywords
  const urgentKeywords = ["urgent", "asap", "immediately", "critical"];
  const highKeywords = ["broken", "error", "failed", "can't", "won't"];
  
  const allUserText = userMessages.map(m => m.content).join(" ").toLowerCase();
  
  let priority: "low" | "medium" | "high" | "urgent" = "medium";
  if (urgentKeywords.some(k => allUserText.includes(k))) {
    priority = "urgent";
  } else if (highKeywords.some(k => allUserText.includes(k))) {
    priority = "high";
  }
  
  // Create summary from last user message
  const summary = userMessages[userMessages.length - 1]?.content || "Support request";
  
  return { summary, priority };
}
