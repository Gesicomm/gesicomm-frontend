import { chromium } from 'playwright';

async function testGooglebot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Simular Googlebot
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');

  try {
    // Cargar desde dist local
    await page.goto('file:///Users/mertin/Proyectos/proyectos/Gesicomm/gesicomm-frontend/dist/index.html', { 
      waitUntil: 'networkidle' 
    });

    // Esperar a que React renderice
    await page.waitForTimeout(3000);

    // Verificar elementos críticos
    const title = await page.title();
    const description = await page.getAttribute('meta[name="description"]', 'content');
    const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
    const h1s = await page.locator('h1').all();
    const h1Count = h1s.length;
    const firstH1 = h1Count > 0 ? await h1s[0].textContent() : 'N/A';
    
    console.log('=== VERIFICACIÓN GOOGLEBOT ===');
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Canonical:', canonical);
    console.log('H1s encontrados:', h1Count);
    if (h1Count > 0) console.log('Primer H1:', firstH1);
    
    // Verificar estructura de headings
    const h2Count = (await page.locator('h2').all()).length;
    const h3Count = (await page.locator('h3').all()).length;
    console.log('H2s:', h2Count, 'H3s:', h3Count);
    
    // Verificar que hay contenido
    const bodyText = await page.content();
    const hasContent = bodyText.length > 5000;
    console.log('Contenido renderizado:', hasContent ? '✅ SÍ' : '❌ NO');
    console.log('Tamaño HTML:', bodyText.length, 'bytes');
    
    // Verificar Open Graph
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
    console.log('\nOpen Graph:');
    console.log('og:title:', ogTitle);
    console.log('og:image:', ogImage);
    
    // Verificar JSON-LD
    const schemaScripts = await page.locator('script[type="application/ld+json"]').all();
    console.log('\nJSON-LD schemas encontrados:', schemaScripts.length);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testGooglebot();
