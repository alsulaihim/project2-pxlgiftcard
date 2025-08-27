"use client";

/**
 * RocketChatClient (scaffold)
 * Minimal client-side wrapper that checks environment config and exposes no-op methods
 * until the actual SDK and OAuth wiring are provided. Prevents build errors.
 */
export type RocketRoom = { id: string; name: string };
export type RocketMessage = { id: string; text: string; ts: number; sender?: string };

export class RocketChatClient {
  private configured: boolean;

  constructor() {
    this.configured = Boolean(process.env.NEXT_PUBLIC_ROCKETCHAT_HOST);
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async initialize(): Promise<void> {
    if (!this.configured) return;
    // TODO: Wire SDK connect/login with OAuth when backend endpoints are ready
  }

  async listChannels(): Promise<RocketRoom[]> {
    if (!this.configured) return [];
    return [
      { id: "general", name: "General" },
    ];
  }

  async listTierChannels(tier?: string): Promise<RocketRoom[]> {
    if (!this.configured) return [];
    const map: Record<string, RocketRoom> = {
      rising: { id: "rising-lounge", name: "Rising Lounge" },
      pro: { id: "pro-club", name: "Pro Club" },
      pixlbeast: { id: "beast-den", name: "Beast Den" },
      pixlionaire: { id: "pixl-penthouse", name: "Pixl Penthouse" },
    };
    return tier && map[tier] ? [map[tier]] : [];
  }

  async fetchMessages(_roomId: string): Promise<RocketMessage[]> {
    if (!this.configured) return [];
    return [];
  }

  async sendMessage(_roomId: string, _text: string): Promise<void> {
    if (!this.configured) return;
  }
}

export const rocketChatClient = new RocketChatClient();


