const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
  console.log('Starting console error check...');

  const browser = await puppeteer.launch({
    headless: true, // Run headless for automated testing
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Collect console messages
  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    console.log('CONSOLE:', msg.type(), text);
    consoleMessages.push({
      type: msg.type(),
      text: text,
      timestamp: new Date().toISOString()
    });

    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a bit for the app to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to navigate to different pages to trigger more console messages
    console.log('Checking dashboard...');
    try {
      await page.goto('http://localhost:3000/#/dashboard', { waitUntil: 'networkidle0', timeout: 10000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Dashboard navigation failed:', e.message);
    }

    console.log('Checking workflows...');
    try {
      await page.goto('http://localhost:3000/#/workflows', { waitUntil: 'networkidle0', timeout: 10000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Workflows navigation failed:', e.message);
    }

    console.log('Checking workflow creation...');
    try {
      await page.goto('http://localhost:3000/#/workflows/new', { waitUntil: 'networkidle0', timeout: 10000 });
      await page.waitForTimeout(5000);
    } catch (e) {
      console.log('Workflow creation navigation failed:', e.message);
    }

  } catch (error) {
    console.log('Navigation error:', error.message);
  }

  console.log('\n=== CONSOLE ERRORS SUMMARY ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Total errors: ${consoleErrors.length}`);

  if (consoleErrors.length > 0) {
    console.log('\nERRORS FOUND:');
    consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  } else {
    console.log('✅ No console errors detected!');
  }

  console.log('\n=== ALL CONSOLE MESSAGES ===');
  consoleMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
  });

  await browser.close();

  return {
    totalMessages: consoleMessages.length,
    totalErrors: consoleErrors.length,
    errors: consoleErrors,
    allMessages: consoleMessages
  };
}

// Run the test
checkConsoleErrors().then(result => {
  console.log('\n=== TEST COMPLETE ===');
  console.log(`Result: ${result.totalErrors === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(result.totalErrors === 0 ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});