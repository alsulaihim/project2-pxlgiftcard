"use client";

import { db } from "@/lib/firebase-config";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  fromAdmin?: boolean;
}

export async function createTicket(userId: string, subject: string, userEmail?: string): Promise<SupportTicket> {
  const ref = await addDoc(collection(db, "support-tickets"), {
    userId,
    userEmail: userEmail || null,
    subject,
    status: "open",
    priority: "medium",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as Omit<SupportTicket, "id">) };
}

export async function listUserTickets(userId: string): Promise<SupportTicket[]> {
  const q = query(collection(db, "support-tickets"), where("userId", "==", userId), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, "id">) }));
}

export function subscribeTicketMessages(ticketId: string, onData: (messages: SupportMessage[]) => void): () => void {
  const q = query(collection(db, "support-tickets", ticketId, "messages"), orderBy("timestamp", "asc"), limit(200));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportMessage, "id">) }));
    onData(msgs);
  });
}

export async function sendSupportMessage(ticketId: string, senderId: string, text: string, fromAdmin = false): Promise<void> {
  await addDoc(collection(db, "support-tickets", ticketId, "messages"), {
    senderId,
    text,
    fromAdmin,
    timestamp: serverTimestamp(),
  });
  await setDoc(
    doc(db, "support-tickets", ticketId),
    { updatedAt: serverTimestamp() },
    { merge: true }
  );
}


