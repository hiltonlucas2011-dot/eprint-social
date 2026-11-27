#!/usr/bin/env node
// Gera a arte PNG (1080x1350, 4:5 — serve para Instagram e LinkedIn) a partir de um post.json.
// Uso: node scripts/render.js posts/<id>/post.json [mais arquivos...]
// Saída: post.png na mesma pasta do JSON.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('Uso: node scripts/render.js posts/<id>/post.json'); process.exit(1); }
  const template = 'file://' + path.resolve(__dirname, '../templates/post.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const f of files) {
    const post = JSON.parse(fs.readFileSync(f, 'utf8'));
    await page.goto(template);
    await page.evaluate(p => window.renderPost(p), post);
    // Confere se algum texto estourou a arte
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('.post');
      const footer = el.querySelector('footer').getBoundingClientRect();
      const blocks = [...el.querySelectorAll('h1, .sub, ul, .num, .cta')];
      return blocks.some(b => b.getBoundingClientRect().bottom > footer.top + 1) || el.scrollHeight > 1350;
    });
    const out = path.join(path.dirname(f), 'post.png');
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    console.log((overflow ? 'ATENÇÃO, texto estourando: ' : 'ok: ') + out);
    if (overflow) process.exitCode = 2;
  }
  await browser.close();
})();
