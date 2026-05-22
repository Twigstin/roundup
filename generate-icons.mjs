import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'

const sizes = [192, 512]

mkdirSync('public/icons', { recursive: true })

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Black rounded background
  const radius = size * 0.22
  ctx.fillStyle = '#111111'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.arcTo(size, 0, size, radius, radius)
  ctx.lineTo(size, size - radius)
  ctx.arcTo(size, size, size - radius, size, radius)
  ctx.lineTo(radius, size)
  ctx.arcTo(0, size, 0, size - radius, radius)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
  ctx.fill()

  // White R
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.55}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('R', size / 2, size / 2 + size * 0.03)

  writeFileSync(`public/icons/icon-${size}.png`, canvas.toBuffer('image/png'))
  console.log(`Generated icon-${size}.png`)
}