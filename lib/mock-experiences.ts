export type MockExperience = {
  id: string;
  hostEmail: string;
  title: string;
  category?: string;
  createdAt: number;
};

const STORAGE_KEY = "gozuru.mock_experiences_v1";

function safeParseList(raw: string | null): MockExperience[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Be permissive; this is mock storage.
    return parsed.filter((x) => x && typeof x === "object") as MockExperience[];
  } catch {
    return [];
  }
}

export function loadMockExperiences(): MockExperience[] {
  if (typeof window === "undefined") return [];
  return safeParseList(window.localStorage.getItem(STORAGE_KEY));
}

export function addMockExperience(exp: Omit<MockExperience, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const list = loadMockExperiences();
  const id = `exp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const experience: MockExperience = { ...exp, id, createdAt: Date.now() };
  list.unshift(experience);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

