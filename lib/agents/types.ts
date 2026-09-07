export type TxnStatus =
  | "PENDING"
  | "AUTO_POSTED"
  | "CONFIRMED"
  | "RECODED"
  | "FLAGGED"
  | "ESCALATED";

export interface AgentTransaction {
  id: string;
  vendorName: string;
  amount: number;
  txnDate: string;
  suggestedCategory: string;
  confidence: number; // 0-100
  reasoning: string;
  status: TxnStatus;
  autoPosted: boolean;
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
