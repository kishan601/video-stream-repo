# How to Upload Your HLS Video

## Step 1: Convert Your Video Online
Use any online video-to-HLS converter:
- **CloudConvert** (cloudconvert.com)
- **Zamzar** (zamzar.com)
- **Online-Convert** (online-convert.com)
- Search "mp4 to hls online converter"

Choose your video → Select HLS format → Download the files

## Step 2: You'll Get These Files
After conversion, you'll have:
```
playlist.m3u8          ← Main playlist file
segment-0.ts           ← Video chunk 1
segment-1.ts           ← Video chunk 2
segment-2.ts           ← Video chunk 3
... (more segments)
```

## Step 3: Upload to Replit
Upload all files to this folder:
```
client/public/streams/my-video/
```

**In Replit:**
1. Click "Files" on left sidebar
2. Navigate to: `client/public/streams/my-video/`
3. Upload all `.m3u8` and `.ts` files there

## Step 4: Test Locally
The dashboard will automatically use:
```
Stream 2 = /streams/my-video/playlist.m3u8
```

Just refresh the page → Stream 2 should show your video!

## Step 5: Deploy to GitHub
```bash
git add .
git commit -m "Add local HLS video"
git push origin main
```

Render auto-deploys → Your video streams live!

---

**That's it!** No coding needed. Just upload files and go.
