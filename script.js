import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve __dirname and download path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const downloadDir = '/Users/khavari/Downloads/AI_IMG';

// Ensure download directory exists
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// Save screenshot and prompt content
async function saveImageAndPrompts(page, promptName, index) {
  const timestamp = Date.now();
  const baseName = `${promptName}_${index}_${timestamp}`;

  const imagePath = path.join(downloadDir, `${baseName}.png`);
  const userPromptPath = path.join(downloadDir, `${baseName}_user_prompt.txt`);
  const reconstructedPromptPath = path.join(downloadDir, `${baseName}_reconstructed_prompt.txt`);

  try {
    console.log('📸 Waiting for image generation...');
    await page.waitForTimeout(25000);

    // Try to save user prompt
    try {
      const userPrompt = await page.locator('[data-testid="text-input"]').inputValue();
      fs.writeFileSync(userPromptPath, userPrompt);
      console.log(`📝 User prompt saved: ${userPromptPath}`);
    } catch (e) {
      console.warn(`⚠️ Could not get user prompt: ${e.message}`);
    }

    // Try to extract reconstructed prompt
    try {
      const reconstructed = await page.locator('pre').filter({ hasText: '"prompt":' }).first().textContent();
      if (reconstructed) {
        fs.writeFileSync(reconstructedPromptPath, reconstructed);
        console.log(`🧠 Reconstructed prompt saved: ${reconstructedPromptPath}`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not get reconstructed prompt: ${e.message}`);
    }

    // Try to find a generated image
    const images = await page.$$('img');
    let saved = false;

    for (const img of images) {
      const box = await img.boundingBox();
      if (box && box.width > 300 && box.height > 300) {
        await img.screenshot({ path: imagePath });
        console.log(`✅ Image saved: ${imagePath}`);
        saved = true;
        break;
      }
    }

    if (!saved) {
      await page.screenshot({ path: imagePath, fullPage: true });
      console.log(`📄 Full-page fallback screenshot saved: ${imagePath}`);
    }
  } catch (err) {
    console.error(`❌ Failed to save outputs: ${err.message}`);
  }
}

async function runAutomation() {
  console.log('🚀 Starting automation...');

  const userDataDir = path.join(__dirname, 'stanford_user_data');

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://aiplayground-prod.stanford.edu/login', { waitUntil: 'domcontentloaded' });

    // Wait for manual login or reuse existing session
    console.log('🔐 Waiting for login... If needed, log in manually in the browser.');
    await page.waitForURL('https://aiplayground-prod.stanford.edu/', { timeout: 60000 });

    // Go to main app page
    await page.goto('https://aiplayground-prod.stanford.edu/');
    await page.waitForLoadState('networkidle');

    // Select DALL·E 3 from the plugin menu
    try {
      await page.locator('button:has-text("Select Azure OpenAI")').click();
      await page.locator('text=PluginsNew chat').click();
      await page.locator('button:has-text("None selected")').click();
      await page.locator('div:has-text("DALL-E-3")').nth(1).click();
      console.log('✅ DALL·E-3 selected.');
    } catch (e) {
      console.error('❌ Plugin selection failed:', e.message);
    }

    // Open prompt sidebar
    try {
      await page.locator('button[aria-label="toggle-controls-nav"]').click();
      await page.locator('button:has-text("Prompts")').click();
    } catch (e) {
      console.warn('⚠️ Could not open prompts sidebar.');
    }

    // Prompt buttons to click
    const promptButtons = [
      { name: 'IMG 3 V2 prompts-menu-trigger', description: 'IMG_3_V2' },
      { name: 'IMG 3 prompts-menu-trigger A', description: 'IMG_3_A' },
      { name: 'IMG 2 V2 prompts-menu-trigger', description: 'IMG_2_V2' },
      { name: 'IMG 2 prompts-menu-trigger', description: 'IMG_2' },
      { name: 'IMG 1 V2 prompts-menu-trigger', description: 'IMG_1_V2' },
    ];

    for (let i = 0; i < promptButtons.length; i++) {
      const { name, description } = promptButtons[i];
      console.log(`\n🎨 [${i + 1}] Running: ${description}`);

      try {
        const button = page.locator(`button[aria-label="${name}"]`);
        await button.waitFor({ timeout: 10000 });
        await button.click();

        await saveImageAndPrompts(page, description, i + 1);

        // Reset for next iteration
        if (i < promptButtons.length - 1) {
          await page.locator('[data-testid="nav-new-chat"]').click();
          await page.waitForTimeout(3000);
        }
      } catch (err) {
        console.error(`❌ Error with ${description}: ${err.message}`);
        await page.screenshot({
          path: path.join(downloadDir, `error_${description}_${Date.now()}.png`),
          fullPage: true,
        });
      }
    }

    console.log('\n✅ All prompts completed!');
    console.log(`📂 Files saved in: ${downloadDir}`);
  } catch (err) {
    console.error('💥 Automation failed:', err.message);
  } finally {
    console.log('🕵️ Leaving browser open for inspection.');
  }
}

runAutomation();
