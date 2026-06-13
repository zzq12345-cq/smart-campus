# iconfont.woff2 Placeholder

This is a placeholder file. The actual iconfont.woff2 font file must be generated from iconfont.cn.

## Generation Instructions

See `src/static/fonts/README.md` for detailed steps to generate the iconfont.woff2 file.

## Expected File

- **File**: iconfont.woff2
- **Size**: ~20KB (30 Material Symbols icons)
- **Format**: WOFF2
- **Location**: src/static/fonts/iconfont.woff2

## Quick Steps

1. Visit https://www.iconfont.cn/
2. Create project "UniSmart-Icons"
3. Add 30 icons (see docs/icon-mapping.md)
4. Generate font → Download WOFF2
5. Place file here as `iconfont.woff2`

## Verification

```bash
ls -lh src/static/fonts/iconfont.woff2
# Expected: ~20KB file
```
