import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(30000);

await page.goto("http://localhost:3010/account/experiences/create", { waitUntil: "load" });
await page.waitForTimeout(1000);
await page.evaluate(() => localStorage.setItem("theme", "dark"));
await page.goto("http://localhost:3010/account/experiences/create", { waitUntil: "load" });
await page.waitForSelector("text=Create an Experience on Gozuru", { timeout: 30000 });

const startBtn = page.locator("button", { hasText: "Get started" }).first();
if (await startBtn.count()) {
  await startBtn.click();
}
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/claude-1000/-home-dev-karanja-Programs-Top-View-Logo-1-READTRIPS-GOZURU-gozuru/a0622132-95ec-4bc0-84ef-8bc21405d486/scratchpad/debug-step2.png", fullPage: true });
console.log(await page.locator("button").allTextContents());
await browser.close();
