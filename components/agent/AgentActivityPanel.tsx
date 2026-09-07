import { AgentActivityEvent } from "@/lib/agents/types";

const TAG_STYLES: Record<AgentActivityEvent["type"], string> = {
  learned: "bg-tealSoft text-teal",
  flag: "bg-rustSoft text-rust",
  review: "bg-brassSoft text-brass",
};
const TAG_LABEL: Record<AgentActivityEvent["type"], string> = {
  learned: "Learned",
  flag: "Flagged",
  review: "Escalated",
};

// Phase 1: replace with a real query against an `agent_events` log table,
// written to every time the categorization agent makes a decision worth
// surfacing (a new correction saved, a duplicate-payment flag, etc.)
const SAMPLE_EVENTS: AgentActivityEvent[] = [
  {
    id: "1",
    type: "learned",
    text: 'Corrected coding for "Gulf Coast Equipment Rental" → will auto-post to Job 4412 next time without asking, based on your correction on Aug 14.',
    timestamp: "2 min ago",
  },
  {
    id: "2",
    type: "flag",
    text: 'Duplicate payment risk: two ACH payments to "Metro Supply Co." within 48 hours, same amount. Held both from auto-post.',
    timestamp: "26 min ago",
  },
  {
    id: "3",
    type: "review",
    text: "IRS notice received for Infinite Field Services — compared against filed return, drafted a summary for your review. Not answering on its own.",
    timestamp: "1 hr ago",
  },
];

export default function AgentActivityPanel() {
  return (
    <div className="bg-[#fdfcf9] p-5 h-full overflow-y-auto">
      <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-0.5">
        <span className="w-[7px] h-[7px] bg-teal rounded-full shadow-[0_0_0_3px_#DCE9E5]" />
        Agent Activity
      </h3>
      <div className="text-[11.5px] text-[#6B675E] mb-4">Live feed — what it did and why</div>

      {SAMPLE_EVENTS.map((e) => (
        <div key={e.id} className="py-2.5 border-b border-line last:border-none">
          <span className={`font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm inline-block mb-1.5 ${TAG_STYLES[e.type]}`}>
            {TAG_LABEL[e.type]}
          </span>
          <div className="text-[12.5px] leading-relaxed">{e.text}</div>
          <div className="text-[11px] text-[#6B675E] mt-1">{e.timestamp}</div>
        </div>
      ))}

      <div className="mt-5 p-3.5 bg-ink text-white rounded-sm">
        <div className="font-mono text-[24px]">1,204</div>
        <div className="text-[11.5px] text-[#B7C0DC] mt-0.5">
          transactions auto-cleared this week without a human touch
        </div>
      </div>
    </div>
  );
}
