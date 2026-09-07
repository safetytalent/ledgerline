import { redirect } from "next/navigation";

// Client Books is the real front door — you open the app, you see
// your clients, you click into one to see everything about them.
// Review Queue moved to its own URL as a cross-client work list,
// not the landing page.
export default function DashboardRootPage() {
  redirect("/dashboard/clients");
}
