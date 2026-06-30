// Seed (or repair) a Gozuru admin account.
//
//   node scripts/seed-admin.mjs
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Secret!123' node scripts/seed-admin.mjs
//
// Strategy:
//   1. If SUPABASE_SERVICE_ROLE_KEY is set, use the Admin API (creates a
//      pre-confirmed user) — the robust path.
//   2. Otherwise fall back to a normal GoTrue signup with the anon key.
//   In both cases it then upserts a profiles row and a user_roles 'admin' row
//   (RLS is disabled in this project, so the writes go through).
//
// Never prints secrets — only status, the user id, and the email.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
let envText = "";
try {
  envText = readFileSync(join(here, "..", ".env.local"), "utf8");
} catch {
  /* fall back to process.env only */
}
const envGet = (k) => {
  if (process.env[k]) return process.env[k];
  const m = envText.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};

const SUPABASE_URL = envGet("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = envGet("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = envGet("SUPABASE_SERVICE_ROLE_KEY");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@gozuru.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Gozuru!Admin2026";
const FIRST = process.env.ADMIN_FIRST || "Gozuru";
const LAST = process.env.ADMIN_LAST || "Admin";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const finalizeSql = `-- Run in the Supabase SQL editor to finish setup:
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = '${ADMIN_EMAIL}';

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users where email = '${ADMIN_EMAIL}'
on conflict (user_id, role) do nothing;`;

async function ensureRoleAndProfile(client, userId) {
  const { error: profErr } = await client.from("profiles").upsert(
    { user_id: userId, email: ADMIN_EMAIL, first_name: FIRST, last_name: LAST },
    { onConflict: "user_id" },
  );
  if (profErr) console.warn("  • profile upsert warning:", profErr.message);
  else console.log("  • profile row ready");

  const { error: roleErr } = await client.from("user_roles").upsert(
    { user_id: userId, role: "admin" },
    { onConflict: "user_id,role" },
  );
  if (roleErr) {
    console.warn("  • could not grant admin role via API:", roleErr.message);
    return false;
  }
  console.log("  • admin role granted");
  return true;
}

async function main() {
  if (SERVICE_KEY) {
    console.log("Using service-role Admin API…");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let userId;
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: FIRST, last_name: LAST, role: "admin" },
    });
    if (error) {
      // already exists → find + reset password
      let found = null;
      for (let page = 1; page <= 25 && !found; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        found = (list?.users || []).find((u) => (u.email || "").toLowerCase() === ADMIN_EMAIL);
        if (!list || list.users.length < 200) break;
      }
      if (!found) {
        console.error("✗ createUser failed and user not found:", error.message);
        process.exit(1);
      }
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { ...found.user_metadata, first_name: FIRST, last_name: LAST, role: "admin" },
      });
      console.log("  • existing user found — password reset, email confirmed");
    } else {
      userId = data.user.id;
      console.log("  • auth user created (email pre-confirmed)");
    }
    const ok = await ensureRoleAndProfile(admin, userId);
    report(userId, true, ok);
    return;
  }

  console.log("No service-role key found — using public signup flow with the anon key…");
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await anon.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    options: { data: { first_name: FIRST, last_name: LAST, role: "admin" } },
  });

  if (error) {
    console.error("✗ signup failed:", error.message);
    console.log("\nIf the account already exists, just run this SQL and then log in:\n");
    console.log(finalizeSql);
    process.exit(1);
  }

  const userId = data.user?.id;
  const hasSession = Boolean(data.session);
  console.log(`  • signup ok (user id ${userId ?? "unknown"})`);
  console.log(`  • immediate session: ${hasSession ? "yes (email confirmation is OFF)" : "no (email confirmation is ON)"}`);

  let roleOk = false;
  if (userId) {
    // With a session we're 'authenticated'; otherwise still try as anon (RLS is off).
    roleOk = await ensureRoleAndProfile(anon, userId);
  }
  report(userId, hasSession, roleOk);
}

function report(userId, loginReady, roleOk) {
  console.log("\n──────────────────────────────────────────────");
  console.log("Admin seed summary");
  console.log("  email   :", ADMIN_EMAIL);
  console.log("  user_id :", userId ?? "(unknown)");
  console.log("  login   :", loginReady ? "READY" : "needs email confirmation");
  console.log("  admin   :", roleOk ? "granted" : "NOT granted via API");
  if (!loginReady || !roleOk) {
    console.log("\nFinish in the Supabase SQL editor:\n");
    console.log(finalizeSql);
  } else {
    console.log("\n✓ You can log in now with the email above and the password you set.");
  }
  console.log("──────────────────────────────────────────────");
}

main().catch((e) => {
  console.error("✗ Unexpected error:", e?.message || e);
  console.log("\nFallback — run this SQL in Supabase, then log in:\n");
  console.log(finalizeSql);
  process.exit(1);
});
