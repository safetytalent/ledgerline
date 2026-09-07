export type ReviewStatus =
  | "AUTO_POSTED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface AgentTransaction {
  id: string;
  vendorName: string;
  amount: number;
  txnDate: string;
  suggestedCategory: string;
  confidence: number; // 0-100
  reasoning: string;
  reviewStatus: ReviewStatus;
  escalatedToClient: boolean;
}

export interface CorrectionMemoryEntry {
  clientId: string;
  vendorName: string;
  correctCategory: string;
  jobOrCostCode?: string;
  timesConfirmed: number;
}

export interface AgentActivityEvent {
  id: string;
  type: "learned" | "flag" | "review";
  text: string;
  timestamp: string;
}
