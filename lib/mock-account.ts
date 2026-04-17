import { loadMockExperiences, type MockExperience } from "./mock-experiences";

export type PaymentRow = {
  id: string;
  experienceTitle: string;
  amount: string;
  status: "Paid" | "Pending";
  dateLabel: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function getMockAppliedExperiences(userEmail: string): MockExperience[] {
  return loadMockExperiences().filter((e) => e.hostEmail === userEmail);
}

export function getAppliedStatus(index: number): string {
  if (index % 3 === 0) return "Approved";
  if (index % 3 === 1) return "In review";
  return "Submitted";
}

export function buildMockPayments(experiences: MockExperience[]): PaymentRow[] {
  const rows: PaymentRow[] = [];
  const limited = experiences.slice(0, 4);

  limited.forEach((exp, idx) => {
    const amount = 45 + idx * 65;
    rows.push({
      id: `pay_${exp.id}`,
      experienceTitle: exp.title,
      amount: formatCurrency(amount),
      status: idx % 2 === 0 ? "Paid" : "Pending",
      dateLabel: formatDateLabel(exp.createdAt + 1000 * 60 * 60 * 24 * (idx + 2)),
    });
  });

  return rows;
}

