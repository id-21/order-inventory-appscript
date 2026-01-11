# Notification Sound Setup

## Required File

Place a notification sound file at:
```
next-js-demo/public/notification.mp3
```

## Recommendations

### Sound Characteristics
- **Duration:** 0.5-2 seconds (short and non-intrusive)
- **Volume:** Medium (will be played at 50% volume in code)
- **Format:** MP3 or OGG for broad browser support
- **File Size:** < 50KB for fast loading

### Where to Get Sounds

**Free Resources:**
1. **Notification Sounds** - https://notificationsounds.com/
2. **Freesound** - https://freesound.org/browse/tags/notification/
3. **Zapsplat** - https://www.zapsplat.com/sound-effect-category/notification-sounds/

**Create Your Own:**
- Use tools like Audacity (free) or GarageBand (Mac)
- Keep it simple: single chime, bell, or beep
- Export as MP3, 128kbps quality

### Example Using System Sounds

If you want to use a built-in system sound temporarily:

**macOS:**
```bash
cp /System/Library/Sounds/Glass.aiff public/notification-temp.aiff
# Then convert to MP3 using online converter or ffmpeg
```

**Convert with ffmpeg:**
```bash
ffmpeg -i /System/Library/Sounds/Glass.aiff -acodec libmp3lame public/notification.mp3
```

## Testing

After adding the file, test it works:
1. Open browser console
2. Run: `new Audio('/notification.mp3').play()`
3. Should hear the sound

## Optional: Disable Sound

If you don't want notification sounds, remove or comment out this code in `OrderNotificationListener.tsx`:

```typescript
// Optional: Play notification sound
try {
  const audio = new Audio('/notification.mp3')
  audio.volume = 0.5
  audio.play().catch((err) => {
    console.log('[OrderNotificationListener] Audio play failed:', err)
  })
} catch (err) {
  console.log('[OrderNotificationListener] Audio not available:', err)
}
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 16.4+)
- Requires user interaction before first play (browser security)
