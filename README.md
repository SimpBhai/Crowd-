# RHA-volunteers — Real-Time GPS Radar, Volunteer Tracking & Dispatch Network

A full-stack, real-time spatial coordination platform and Progressive Web App (PWA) engineered for Robin Hood Army food drives, volunteer safety marshals, field coordinators, emergency response, and logistics dispatch.

---

## 📋 Table of Contents
1. [Core Features & System Capabilities](#-core-features--system-capabilities)
2. [Roles & Login Credentials Matrix](#-roles--login-credentials-matrix)
3. [Local Development & Testing](#-local-development--testing)
4. [Where to Host It Now? (Step-by-Step Hosting Guide)](#-where-to-host-it-now-step-by-step-hosting-guide)
   - [Important: SSL / HTTPS Requirement](#️-important-ssl--https-requirement-for-gps--mic)
   - [Option 1: Render.com (Easiest & Free/Low Cost)](#option-1-rendercom-recommended---easiest--instant-https)
   - [Option 2: Railway.app (1-Click Deployment)](#option-2-railwayapp-fast--zero-config)
   - [Option 3: Self-Hosted VPS (Ubuntu + Nginx + SSL + PM2)](#option-3-self-hosted-vps-digitalocean-linode-aws-hetzner)
   - [Option 4: Google Cloud Run](#option-4-google-cloud-run-serverless-containers)
   - [Option 5: Docker & Docker Compose](#option-5-docker--docker-compose)
5. [How to Make It as a Mobile App](#-how-to-make-it-as-a-mobile-app)
   - [Method 1: Instant PWA Home Screen Install (Zero Store Approval)](#method-1-instant-pwa-install-android--ios---easiest)
   - [Method 2: Standalone Android APK / Google Play (Bubblewrap TWA)](#method-2-standalone-android-apk--play-store-via-bubblewrap)
   - [Method 3: Native iOS & Android App via Capacitor](#method-3-native-ios--android-build-via-capacitor)
6. [Security & Anti-Tamper Hardening](#-security--anti-tamper-hardening)
7. [Environment Variables Reference](#-environment-variables-reference)

---

## 🌟 Core Features & System Capabilities

### 1. 🗺️ High-Precision Live Satellite GPS & Radar Map
- **Multiple Map Layers**: Switch seamlessly between **Google Satellite Hybrid** (high-res aerial imagery + street labels), **OpenStreetMap Standard**, **CartoDB Dark Voyager** (night operations), and **OpenTopoMap** (elevation & terrain).
- **Real-Time GPS Telemetry**: Streams real latitude, longitude, altitude, accuracy radius, heading direction, and real-time movement velocity in km/h (`navigator.geolocation.watchPosition` with high accuracy).
- **Live Movement Interpolation**: Smooth CSS transitions (`0.6s cubic-bezier`) eliminate jumpy markers, providing fluid visual tracking as devices move.
- **Turn-by-Turn Route Navigation**: Walking and vehicle route calculation via OSRM with total distance (km), estimated time of arrival (ETA), and polyline guidance to any rally point or assignment post.
- **Persistent Menus**: Navigation header and bottom bar remain permanently anchored and visible, immune to page scrolls on smartphone devices.

### 2. 🎯 Tactical Map Long-Hold Dispatcher
Long-press anywhere on the map (450ms touch on smartphone, mouse click-hold on desktop, or right-click) to open the **Tactical Dispatcher Hub**:
- **Main Assembly Point**: Move or set the primary rally point with custom perimeter radius, target convergence time, and instructions.
- **Multiple Inspection Points**: Deploy, move, or remove checkpoints, medical aid stations, observation posts, and safe emergency corridors.
- **User & Squad Waypoint Pins**: Select any field user or entire squad/group and pin an exact destination waypoint with tactical instructions and optional automatic member assignment.

### 3. 📞 Zero-Number Voice Calling & Squad Intercom
- **Direct & Squad Voice Calls**: Instant audio communication over the internet without sharing telephone numbers.
- **Audio Dispatch Mode Prompt**: Every call offers two transmission modes:
  - ⚡ **Tactical Auto-Pickup (Intercom)**: Automatically answers on the recipient's phone without requiring manual approval, opening the microphone for emergency marshal orders.
  - 📞 **Direct Ring (Standard Call)**: Chimes and rings the recipient device with caller details, requiring manual acceptance.
- **Squad Audio Broadcast**: Call entire squads or teams simultaneously with real-time audio packet relay.

### 4. 💬 Real-Time Field Communications & Geo-Tagged Chat
- **Public & Targeted Dispatch Channels**: Broadcast updates to all attendees, squad channels, or 1-on-1 direct messages.
- **Location-Attached Messages**: Send chat messages with one-tap attached GPS coordinates; clicking any coordinate chip flies the map directly to that point.
- **Emergency SOS Distress Beacon**: One-tap emergency alert that broadcasts coordinates to all dispatchers, triggers audible sirens, and places an urgent pulsating beacon on the map.

---

## 👥 Roles & Login Credentials Matrix

| Role | Username | Default Password | Permissions & Visibility |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `superadmin123` | **Full Authority**: Global assembly beacons, custom tags, user bans, full audit logs, 100% map visibility. |
| **Admin** | `admin` | `adminpassword123` | **Tactical Dispatch**: 100% field oversight, direct audio calls, waypoint post assignments, squad management. |
| **Dispatcher** | `dispatcher` | `dispatcher123` | **Communications Hub**: Broadcast dispatches, coordinate squads, direct calling with marshals & medics. |
| **Volunteer / Medic** | `medic1` / `marshal1` | `userpassword123` | **Field Responder**: Tagged as Medical/Marshal/Legal, receives direct waypoint tasks, direct line to Dispatch. |
| **Participant** | `user` | `userpassword123` | **Privacy Shielded**: Sees moving anonymous crowd dots & assembly beacon. Cannot contact other attendees or view attendee profiles. |

---

## 💻 Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (Frontend + Backend on port 3000)
npm run dev

# 3. Open browser
http://localhost:3000
```

To run a production test build locally:
```bash
npm run build
npm start
```

---

## 🌐 Where to Host It Now? (Step-by-Step Hosting Guide)

### ⚠️ Important: SSL / HTTPS Requirement for GPS & Mic
Modern web browsers (Chrome, Safari, Firefox, Edge, Android, iOS) **strictly enforce** that:
1. `navigator.geolocation` (GPS Location Tracking)
2. `navigator.mediaDevices.getUserMedia` (Voice Call Microphone)

**ONLY work over secure HTTPS** (or `localhost`). If you host on unencrypted HTTP, browsers will block GPS access and audio calling! All recommended platforms below provide **free automated HTTPS / SSL certificates**.

---

### Option 1: Render.com (Recommended - Easiest & Instant HTTPS)
Render provides free/low-cost Web Services with automated HTTPS and native WebSocket support.

1. Create a free account at [render.com](https://render.com).
2. Push your project code to a GitHub or GitLab repository.
3. In the Render Dashboard, click **New +** ➔ **Web Service**.
4. Connect your GitHub/GitLab repository.
5. Configure the service settings:
   - **Name**: `crowd-gps-radar`
   - **Region**: Choose the region closest to your users (e.g., Frankfurt, Oregon, Singapore).
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` or `Starter` ($7/mo for always-on WebSockets without sleeping).
6. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `SUPERADMIN_USERNAME` = `superadmin`
   - `SUPERADMIN_PASSWORD` = `<your-secure-password>`
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `<your-secure-password>`
   - `SESSION_SECRET` = `<any-random-32-char-string>`
7. Click **Create Web Service**.
8. Within 2–3 minutes, Render deploys your app with a public URL: `https://crowd-gps-radar.onrender.com` (full HTTPS and WebSockets ready!).

---

### Option 2: Railway.app (Fast & Zero-Config)
Railway supports full Docker/Node runtime with zero setup.

1. Sign up at [railway.app](https://railway.app).
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the `Dockerfile` or `package.json`.
5. Go to **Variables** and add:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
   - `SUPERADMIN_PASSWORD` = `<your-secure-password>`
   - `ADMIN_PASSWORD` = `<your-secure-password>`
6. Go to **Settings** ➔ **Networking** ➔ Click **Generate Domain**.
7. Your app is live at `https://your-app.up.railway.app`.

#### 💡 Can I Host BOTH the Website & Native App on Railway?
**YES, 100%!** In fact, this is the modern industry-standard architecture:
```
                      ┌────────────────────────────────────────┐
                      │      RAILWAY.APP (Single Host)         │
                      │  https://your-app.up.railway.app       │
                      │                                        │
                      │  - Serves Website (HTML/CSS/JS)        │
                      │  - REST API (/api/*)                   │
                      │  - WebSocket Telemetry Server (/ws)    │
                      │  - WebRTC Audio Signaling              │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
      [ 🌐 Website Users ]                            [ 📱 Native App Users ]
   - Opens in Chrome / Safari                       - Installed Android APK
   - Desktop & Laptop Browsers                      - Google Play / iOS App
   - Direct live GPS tracking                       - Hardware GPS & Background mic
   
         ▶ Both website and native mobile apps connect to the SAME Railway server.
         ▶ A desktop coordinator on the website and a field marshal on the mobile app
           see each other on the live map, join the same squads, and talk over voice in real time!
```

##### How the Native App Connects to Railway:
- **Approach 1 (Capacitor Live URL — Recommended):**
  In `capacitor.config.json`, configure:
  ```json
  "server": {
    "url": "https://your-app.up.railway.app",
    "cleartext": false
  }
  ```
  This loads the live website inside the native Android/iOS shell. Whenever you deploy changes to Railway, the native app updates **instantly** without users needing to update from Google Play!
- **Approach 2 (Packaged Offline Bundle):**
  Build static assets into the APK with `VITE_API_URL=https://your-app.up.railway.app npm run build`. The bundled app connects all REST APIs and WebSockets directly to your Railway domain. CORS is pre-configured on Railway to allow all native app requests (`capacitor://localhost`, `http://localhost`).

---

### Option 3: Self-Hosted VPS (DigitalOcean, Linode, AWS, Hetzner)
For full privacy, dedicated hardware, and unrestricted bandwidth:

#### 1. Provision an Ubuntu 22.04 or 24.04 Server
Connect via SSH:
```bash
ssh root@your_server_ip
```

#### 2. Install Node.js 20, Git & PM2
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Install PM2 process manager
sudo npm install -g pm2
```

#### 3. Clone & Build the Application
```bash
cd /var/www
git clone <your-repo-url> crowdradar
cd crowdradar

# Install dependencies and build
npm install
npm run build

# Start with PM2
pm2 start dist/server.cjs --name "crowdradar"
pm2 save
pm2 startup
```

#### 4. Configure Nginx with WebSocket Reverse Proxy
Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/crowdradar
```

Paste the following block (replace `yourdomain.com` with your domain):
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Crucial headers for WebSockets and live GPS streaming
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout protection
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/crowdradar /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Install Free SSL with Let's Encrypt (Certbot)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot automatically provisions an SSL certificate and enables HTTPS!

---

### Option 4: Google Cloud Run (Serverless Containers)
Cloud Run provides automatic scaling and built-in HTTPS.

```bash
# 1. Build and push image to Google Artifact Registry / Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/crowd-radar

# 2. Deploy to Cloud Run
gcloud run deploy crowd-radar \
  --image gcr.io/YOUR_PROJECT_ID/crowd-radar \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --session-affinity
```
*(Session affinity is enabled to ensure persistent WebSocket connections).*

---

### Option 5: Docker & Docker Compose

#### Using Single Container:
```bash
docker build -t crowd-radar .
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e SUPERADMIN_PASSWORD="MySuperSecretPassword123!" \
  --name crowd-radar crowd-radar
```

#### Using Docker Compose (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SUPERADMIN_USERNAME=superadmin
      - SUPERADMIN_PASSWORD=change_this_password
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=change_this_password
    restart: always
```
Run with:
```bash
docker compose up -d
```

---

## 📱 How to Make It as a Mobile App

### 🚀 Zero Experience & No Laptop? (Do Everything on Your Phone in 2 Minutes)

If you **literally do not have a laptop or computer**, you can still build and install the native Android APK directly from your smartphone for free!

---

#### 🌟 Option 1: Microsoft PWABuilder (Cloud APK Generator — 100% Free on Phone)
Microsoft provides a free cloud build service that takes your live web URL and compiles a real native Android `.apk` package in the cloud without needing any laptop:

1. **Copy your live app URL**:
   - For example, your live Railway URL (`https://your-app.up.railway.app`) or current live preview URL.
2. **Open your phone browser** (Chrome / Safari / Firefox):
   - Go to [https://www.pwabuilder.com](https://www.pwabuilder.com).
3. **Paste your app URL** and tap **"Start"**.
   - PWABuilder scans your site (our manifest, high-res icons, and service worker are already 100% configured).
4. Tap the blue button: **"Package for Stores"** ➔ Select **"Android"**.
5. Tap **"Generate APK"** or **"Download Package"**.
   - Microsoft's cloud servers compile your Android app package in ~30 seconds.
6. **Download the `.apk` file** directly to your phone's "Downloads" folder.
7. Tap the downloaded file ➔ Tap **"Install"** (enable "Install unknown apps" if prompted).
8. **Done!** It is now installed on your phone as a real native Android app with hardware GPS access!

---

#### ⚡ Option 2: 1-Tap Chrome "Install App" (Instant WebAPK with Zero Downloads)
On modern Android phones, Google Chrome can generate and install a native **WebAPK** with one tap:

1. Open your live HTTPS website in **Chrome on Android**.
2. Tap the **3 vertical dots menu (⋮)** in the top-right corner.
3. Tap **"Install app"** (or **"Add to Home Screen"**).
4. Chrome and Google Play Services will automatically compile and install a full native app shell onto your phone.
5. The app appears in your **Android App Drawer and Home Screen** with its own icon, runs full-screen without any browser address bar, and has direct hardware access to GPS, camera, and microphone.

---

#### 🤖 Option 3: GitHub Actions Cloud Build (Free Automated APK from Your Phone)
Because you don't have a laptop, GitHub's free cloud computers can build your real `.apk` file for you directly from your smartphone browser:

1. **Deploy to Railway First**:
   - Make sure your app is deployed on Railway (e.g. `https://crowdradar-production.up.railway.app`). Copy this URL.
2. **Open GitHub on Your Phone**:
   - Open Chrome on your phone and go to your GitHub repository (or use the free GitHub Mobile app).
3. **Open the "Actions" Tab**:
   - Near the top of your repository page, tap on the **"Actions"** tab (you'll see an icon that looks like a play button).
4. **Select the Workflow**:
   - Under "All workflows" on the left, tap **"Build Android APK (No Laptop Needed)"**.
5. **Tap "Run workflow"**:
   - Tap the blue/gray **"Run workflow"** button.
   - A small box will appear asking for your **Live Railway URL**.
   - Paste your Railway link (e.g. `https://your-app.up.railway.app`) and tap the green **"Run workflow"** button.
6. **Wait 2 to 3 Minutes**:
   - GitHub's cloud server will spin up, install Java & Android SDK, configure your app with continuous GPS delegation, and package the signed `.apk`.
   - The job will turn to a green checkmark (`✔`).
7. **Download Your APK**:
   - Tap on the completed build run.
   - Scroll down to the bottom where it says **"Artifacts"**.
   - Tap **"CrowdRadar-Live-Android-APK"** — your phone will download the ZIP / APK immediately to your Downloads folder!
8. **Install on Your Phone**:
   - Open your phone's "Files" or "Downloads" app, tap the downloaded `.apk` file, tap **"Install"** (enable "Install unknown apps" if prompted), and open your new app!
   - It will automatically connect directly to your Railway server and database out of the box!

---

### ⚡ 3 Phone Settings to Maximize GPS Tracking & Prevent Pauses

Mobile operating systems (especially Android and iOS) will aggressively throttle GPS or pause apps when your screen turns off to save battery. To ensure your GPS transmits continuous 1-second updates even while walking:

1. **Location Permission to "Allow all the time"**:
   - Go to phone **Settings ➔ Apps ➔ CrowdRadar (or Chrome) ➔ Permissions ➔ Location**.
   - Select **"Allow all the time"** (instead of "Only while using app").
   - Turn **ON** the switch for **"Use precise location"**.
2. **Turn Off Battery Optimization / Sleep Limits**:
   - Go to phone **Settings ➔ Apps ➔ CrowdRadar (or Chrome) ➔ Battery**.
   - Change battery setting from "Optimized" to **"Unrestricted"**.
   - This prevents Android from killing the GPS tracking process when the phone goes into your pocket.
3. **Screen Wake Lock**:
   - The CrowdRadar app has a built-in Web Screen Wake Lock that automatically keeps your phone screen illuminated while tracking, preventing the phone from sleeping during active field movements.

---

### 💻 Developer Methods (If You Ever Have a Laptop or Computer)

#### Method A: Google Bubblewrap TWA CLI
Google's official **Bubblewrap** tool packages your Progressive Web App into a real, installable Android APK and `.aab` file for Google Play Store submission:

```bash
# 1. Install Bubblewrap globally
npm install -g @bubblewrap/cli

# 2. Initialize project from your live HTTPS manifest URL
bubblewrap init --manifest="https://yourdomain.com/manifest.json"

# 3. Build the signed Android package
bubblewrap build
```

#### Method B: Native iOS & Android Build via Capacitor
If you want native device compilation with Xcode and Android Studio:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/geolocation
npx cap init "CrowdRadar" "com.crowdradar.app" --web-dir="dist"
npm install @capacitor/android @capacitor/ios
npx cap add android
npm run build
npx cap sync
npx cap open android
```

---

## 🔒 Security & Anti-Tamper Hardening

The application backend (`server.ts`) is fortified with multi-layered defenses:
1. **Sliding-Window Rate Limiters**:
   - `/api/auth/*`: 15 requests/min per IP (prevents brute-force dictionary attacks).
   - `/api/messages`: 40 requests/min per IP (prevents spam flooding).
   - `/api/users/sos`: 8 requests/min per IP (prevents SOS beacon abuse).
2. **WebSocket Protection**:
   - 64 KB maximum payload size per WebSocket frame.
   - Message rate limit (40 messages / 10 sec) with automatic disconnect on abuse.
3. **Strict Input Sanitization**:
   - Strips `<script>`, `<iframe>`, `javascript:`, and HTML tags from all inputs.
   - Clamps GPS coordinates to valid geographic limits (`-90 <= lat <= 90`, `-180 <= lng <= 180`).
4. **Cryptographic Sessions**:
   - 256-bit entropy bearer tokens (`crypto.randomBytes(32)`).
   - Automatic 24-hour token expiration with memory cleanup.
5. **Anti-Tamper Role Hierarchy**:
   - Admins cannot promote users to Super Admin.
   - Nobody can ban a Super Administrator.
   - Banned accounts are severed from WebSockets immediately.

---

## ⚙️ Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP and WebSocket server. |
| `NODE_ENV` | `development` | Set to `production` in live environments. |
| `SUPERADMIN_USERNAME` | `superadmin` | Master login username. |
| `SUPERADMIN_PASSWORD` | `superadmin123` | **Change in production** for administrative security. |
| `ADMIN_USERNAME` | `admin` | Secondary coordinator login. |
| `ADMIN_PASSWORD` | `adminpassword123` | **Change in production**. |
| `USER_USERNAME` | `user` | Default participant login. |
| `USER_PASSWORD` | `userpassword123` | **Change in production**. |
| `SESSION_SECRET` | `crowd_secret_token_session` | Secret seed for session token generation. |
| `APP_URL` | Auto-detected | Canonical URL of the application. |

---

## 📄 License
MIT License. Built for community safety, peaceful coordination, and field logistics.
