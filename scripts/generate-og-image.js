#!/usr/bin/env node
/**
 * Converts public/og-image.svg into og-image.png (1200x630) for social sharing.
 * Runs at build time.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

async function main() {
  const svgPath = resolve('public/og-image.svg')
  const pngPath = resolve('public/og-image.png')

  if (!existsSync(svgPath)) {
    console.warn('[og-image] og-image.svg not found, skipping')
    return
  }

  const svg = readFileSync(svgPath)
  const png = await sharp(svg)
    .resize(1200, 630, { fit: 'contain', background: { r: 30, g: 58, b: 95 } })
    .png()
    .toBuffer()

  writeFileSync(pngPath, png)
  console.log(`[og-image] Generated: og-image.png (${(png.length / 1024).toFixed(1)} KB)`)
}

main().catch((e) => {
  console.error('[og-image] failed:', e)
  // Don't fail build if OG gen breaks — SVG still works as fallback
  process.exit(0)
})
