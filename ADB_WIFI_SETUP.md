# Connect Tablet to ADB via WiFi

## Prerequisites

1. **ADB installed** on your computer (part of Android SDK)
   ```bash
   which adb
   # If not found, install Android SDK Platform Tools
   ```

2. **Tablet and Computer on same WiFi network**

3. **Tablet with USB Debugging enabled**

---

## Steps to Connect

### Step 1: Enable USB Debugging on Tablet

1. Go to **Settings** → **About tablet**
2. Tap **Build number** 7 times (until "Developer mode enabled" message appears)
3. Go back to **Settings** → **Developer options**
4. Enable **USB Debugging**
5. Enable **ADB over Network** (or **WiFi Debugging** depending on Android version)

### Step 2: Connect via USB First (Initial Setup)

```bash
# Connect tablet to computer via USB cable

# Verify connection
adb devices

# You should see:
# List of attached devices
# <device_serial>    device
```

### Step 3: Find Tablet IP Address

**Option A: From tablet settings**
1. Go to **Settings** → **About tablet** → **IP address**
2. Note down the IP address (e.g., 192.168.1.100)

**Option B: Using ADB**
```bash
adb shell ip addr show wlan0
# Look for inet address (e.g., 192.168.1.100)
```

### Step 4: Connect via WiFi

```bash
# Set tablet to listen on port 5555 (default ADB port)
adb tcpip 5555

# You should see:
# restarting in TCP mode port: 5555

# Now connect via WiFi using the IP address
adb connect <TABLET_IP>:5555

# Example:
adb connect 192.168.1.100:5555

# You should see:
# connected to 192.168.1.100:5555
```

### Step 5: Verify Connection

```bash
# Disconnect USB cable (optional - connection is now via WiFi)
# List connected devices
adb devices

# You should see both USB devices and network devices:
# List of attached devices
# <device_serial>    device
# 192.168.1.100:5555    device
```

### Step 6: Use ADB Commands

Now you can use any ADB command:

```bash
# Install APK
adb -s 192.168.1.100:5555 install -r app-debug.apk

# Launch app
adb -s 192.168.1.100:5555 shell am start -n com.visitormanagement.app/.ui.main.MainActivity

# View logs
adb -s 192.168.1.100:5555 logcat

# Push file to tablet
adb -s 192.168.1.100:5555 push <local_file> /sdcard/

# Pull file from tablet
adb -s 192.168.1.100:5555 pull /sdcard/<file> <local_path>
```

---

## Quick Commands for Your Project

### Build and Deploy Visitor Management App

```bash
# Build debug APK
cd android
./gradlew assembleDebug

# Get tablet IP (if not known)
adb shell ip addr show wlan0

# Connect via WiFi (replace with your IP)
adb connect 192.168.1.100:5555

# Install APK
adb -s 192.168.1.100:5555 install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb -s 192.168.1.100:5555 shell am start -n com.visitormanagement.app/.ui.main.MainActivity

# View logs in real-time
adb -s 192.168.1.100:5555 logcat | grep -i visitor
```

---

## Troubleshooting

### ❌ "Command 'adb tcpip' not working"
**Solution**: Tablet might not support ADB over Network
- Try enabling "WiFi Debugging" in Developer options instead
- Or try: `adb connect <IP>:5555` directly

### ❌ "Connection refused"
**Solution**:
```bash
# Ensure tablet is on same WiFi network
# Try these commands:

# Check if tablet is reachable
ping 192.168.1.100

# Restart ADB daemon
adb kill-server
adb start-server

# Try connecting again
adb connect 192.168.1.100:5555
```

### ❌ "Unable to connect to 192.168.1.100:5555"
**Solutions**:
1. Verify IP address is correct
2. Check both devices are on same WiFi network
3. Disable firewall temporarily for testing
4. Restart tablet's WiFi
5. Reconnect via USB and re-run `adb tcpip 5555`

### ❌ "Device not authorized"
**Solution**:
1. Disconnect and reconnect via USB
2. Check tablet for "Allow USB debugging from this computer?" dialog
3. Tap "Always allow"
4. Reconnect via WiFi

### ❌ Multiple Devices Connected
```bash
# If you have multiple devices, specify which one to use:
adb -s <DEVICE_ID_OR_IP:PORT> install app.apk

# Example with multiple devices:
adb devices
# List of attached devices
# emulator-5554    device
# 192.168.1.100:5555    device

# Deploy to specific device
adb -s 192.168.1.100:5555 install -r app-debug.apk
```

---

## Disconnect WiFi Connection

```bash
# Stop WiFi debugging and revert to USB only
adb disconnect 192.168.1.100:5555

# Or kill all ADB connections
adb disconnect
```

---

## Advanced: Alias for Easier Commands

Add this to your `~/.bash_profile` or `~/.zshrc`:

```bash
# Tablet WiFi alias
alias tablet-install='adb -s 192.168.1.100:5555 install -r'
alias tablet-launch='adb -s 192.168.1.100:5555 shell am start -n com.visitormanagement.app/.ui.main.MainActivity'
alias tablet-logs='adb -s 192.168.1.100:5555 logcat'
alias tablet-connect='adb connect 192.168.1.100:5555'
alias tablet-disconnect='adb disconnect 192.168.1.100:5555'
```

Then reload:
```bash
source ~/.bash_profile
# or
source ~/.zshrc
```

Now use:
```bash
tablet-connect
tablet-install app/build/outputs/apk/debug/app-debug.apk
tablet-launch
tablet-logs
```

---

## One-Liner Setup Script

Save this as `connect-tablet.sh`:

```bash
#!/bin/bash

TABLET_IP="${1:-192.168.1.100}"
PORT="5555"

echo "🔗 Connecting to tablet at $TABLET_IP:$PORT..."
adb connect "$TABLET_IP:$PORT"

echo "📱 Listing connected devices..."
adb devices

echo "✅ Done! Your tablet is now connected via WiFi"
echo ""
echo "Next steps:"
echo "  1. Build APK: cd android && ./gradlew assembleDebug"
echo "  2. Install: adb -s $TABLET_IP:$PORT install -r app/build/outputs/apk/debug/app-debug.apk"
echo "  3. Launch: adb -s $TABLET_IP:$PORT shell am start -n com.visitormanagement.app/.ui.main.MainActivity"
```

Usage:
```bash
chmod +x connect-tablet.sh
./connect-tablet.sh 192.168.1.100
```

---

## Common ADB WiFi Commands Reference

| Command | Purpose |
|---------|---------|
| `adb tcpip 5555` | Enable WiFi debugging on connected device |
| `adb connect <IP>:5555` | Connect to device via WiFi |
| `adb devices` | List all connected devices |
| `adb disconnect` | Disconnect WiFi connection |
| `adb -s <DEVICE> install <APK>` | Install APK on specific device |
| `adb -s <DEVICE> logcat` | View device logs |
| `adb -s <DEVICE> shell am start <ACTIVITY>` | Launch app on device |

---

## Safety Tips

1. **Same Network**: Both devices must be on the same WiFi network
2. **No Public WiFi**: Don't use public WiFi for development (security risk)
3. **Firewall**: If connection fails, temporarily disable firewall for testing
4. **Port 5555**: Make sure this port isn't blocked by your network
5. **Battery**: Keep tablet plugged in during development sessions

