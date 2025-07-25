# Rep Tracker 🏋️‍♂️

A personal trainer mobile web app that uses your camera to track exercises and count reps automatically.

## Features

- **Real-time exercise tracking** using MediaPipe pose detection
- **Automatic rep counting** for push-ups and squats
- **Mobile-responsive design** optimized for phones and tablets
- **Visual pose overlay** showing detected body landmarks
- **Live feedback** with exercise state and rep counts

## How to Use

1. **Open the app** in your web browser
2. **Allow camera access** when prompted
3. **Select an exercise** (Push-ups or Squats)
4. **Click "Start Workout"** to begin tracking
5. **Perform your exercise** - reps will be counted automatically
6. **Watch the debug info** to see real-time position data

## Exercises Supported

### Push-ups
- Position yourself so your upper body is visible to the camera
- The app tracks wrist position relative to shoulders
- Complete full range of motion for accurate counting

### Squats
- Stand facing the camera with full body visible
- The app tracks hip position relative to knees
- Squat down until thighs are parallel to floor

## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- Uses MediaPipe Pose for real-time pose detection
- Implements state machine logic to prevent false counts
- 500ms cooldown between state changes for accuracy

## Browser Requirements

- Modern web browser with camera support
- HTTPS connection (required for camera access)
- Stable internet connection (for MediaPipe CDN)

## Development

To run locally:
1. Clone this repository
2. Serve files over HTTPS (required for camera)
3. Open `index.html` in your browser

## Privacy

- All processing happens locally in your browser
- No video data is sent to external servers
- Camera feed is not recorded or stored

---

Built with ❤️ for fitness enthusiasts who want to track their workouts!