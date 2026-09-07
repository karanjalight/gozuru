import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ hostId: string }>;
};

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default async function LegacyHostProfileRedirect({ params }: PageProps) {
  const { hostId } = await params;
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("host_profiles")
    .select("slug")
    .eq("user_id", hostId)
    .maybeSingle();

  if (!data?.slug) {
    notFound();
  }

  permanentRedirect(`/experts/${data.slug}`);
}
