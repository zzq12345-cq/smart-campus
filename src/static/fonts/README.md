# Iconfont Generation Instructions

## Prerequisites

- iconfont.cn account (free)
- List of 30 Material Symbols icons (see docs/icon-mapping.md)

## Steps

### 1. Create Iconfont Project

1. Visit https://www.iconfont.cn/
2. Log in or create account
3. Click "Resources" → "My Projects"
4. Click "New Project"
5. Name: "UniSmart-Icons"
6. FontClass prefix: "icon-"
7. Click "Create"

### 2. Add Icons to Project

Search and add these 30 icons (outlined style):
- home
- school
- psychology
- person
- smart_toy
- calendar_today
- restaurant
- shopping_cart
- work
- favorite
- settings
- help
- search
- notifications
- spa
- headset_mic
- forest
- quiz
- mood
- forum
- chat_bubble
- menu_book
- coffee
- shopping_bag
- sports_esports
- published_with_changes
- local_fire_department
- visibility
- book_2
- bookmark

### 3. Generate Font File

1. Go to project page
2. Click "Font Link" tab
3. Click "Generate Code"
4. Select "WOFF2" format
5. Click "Download"

### 4. Install Font

1. Extract downloaded ZIP
2. Find `iconfont.woff2` file
3. Copy to `src/static/fonts/iconfont.woff2`
4. Expected file size: ~20KB

## Verification

Run verification command:
```bash
ls -lh src/static/fonts/iconfont.woff2
```

Expected output: File size around 20KB

## Alternative: Offline Generation

If iconfont.cn is unavailable, use alternative:
1. Download Material Symbols variable font from Google Fonts
2. Use fonttools to subset to 30 icons
3. Convert to WOFF2 format

## Troubleshooting

- **Missing icons**: Some Material Symbols may not have exact matches in iconfont. Choose visually similar alternatives or upload custom SVG.
- **File too large**: Reduce to essential icons only, target 20KB for 30 icons.
- **WeChat compatibility**: Ensure WOFF2 format, test in WeChat DevTools.
