import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:3010/account/experiences/create", { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.evaluate(() => localStorage.setItem("theme", "dark"));
await page.goto("http://localhost:3010/account/experiences/create", { waitUntil: "load" });
await page.waitForSelector("text=Create an Experience on Gozuru", { timeout: 30000 }).catch(() => console.log("intro text not found"));
console.log("URL:", page.url());
console.log("title:", await page.title());

const startBtn = page.locator("button", { hasText: "Get started" }).first();
if (await startBtn.count()) {
  await startBtn.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: "/tmp/claude-1000/-home-dev-karanja-Programs-Top-View-Logo-1-READTRIPS-GOZURU-gozuru/a0622132-95ec-4bc0-84ef-8bc21405d486/scratchpad/create-dark-step1.png", fullPage: true });
console.log("Console errors:", JSON.stringify(errors, null, 2));
await browser.close();
