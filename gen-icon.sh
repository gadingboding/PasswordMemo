#!/usr/bin/bash

# 确保你已经进入了正确的目录
cd password-memo-browser/icons

# 1. 生成标准的 16px, 32px, 和 48px 图标
#    这些图标的内容会填满整个画布
echo "Generating standard size icons..."
for size in 16 32 48; do
  convert icon.svg \
    -background transparent \
    -density 300 \
    -resize ${size}x${size} \
    -trim \
    -gravity center \
    -extent ${size}x${size} \
    icon-${size}.png
done

# 2. 特殊处理 128px 图标 (核心内容为 96x96)
#    -resize 96x96: 将SVG内容缩放到96x96
#    -extent 128x128: 将96x96的内容放置在128x128的透明画布中央
echo "Generating 128px icon with required padding..."
convert icon.svg \
  -background transparent \
  -density 300 \
  -resize 96x96 \
  -trim \
  -gravity center \
  -extent 128x128 \
  icon-128.png

echo "All icons generated successfully!"