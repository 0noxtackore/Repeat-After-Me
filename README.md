# Repeat After Me
<img src="/src/assets/cover.png" alt="image 1" width="100%">
Minimal, multi-profile YouTube playback app focused on smooth continuous looping, with optional Google OAuth (YouTube Data API) per profile.
<img src="/src/assets/cover2.png" alt="image 1" width="100%">
## Key Features

- **Multi-profile sidebar**
  - Create up to 10 profiles.
  - Profiles are persisted in `localStorage`.
- **Simultaneous playback**
  - All profile players remain mounted; switching profiles toggles visibility to keep playback running.
- **Infinite loop playback**
  - Each profile stores its own YouTube URL.
  - The embedded player is configured to loop.
- **Google OAuth + YouTube channel info (optional)**
  - Connect a Google account and fetch the profile’s YouTube channel title via YouTube Data API v3.
- **Theme switcher**
  - Dark/Light mode with persistence.
  - Logo + favicon automatically switch between `logo.png` (dark) and `logo2.png` (light).

## Tech Stack

- **React** (Vite)
- **Google Identity Services (GIS)** for OAuth token flow (client-side)
- **YouTube Data API v3** for reading the signed-in user channel (`channels?mine=true`)

## Project Structure

```text
repeat_video_youtube/
  index.html
  package.json
  .env
  .env.example
  install.bat
  run.bat
  install.sh
  run.sh
  public/
  src/
    App.jsx
    App.css
    index.css
    main.jsx
    assets/
      logo.png
      logo2.png
```

## Getting Started

### 1) Prerequisites

- **Node.js** (LTS recommended)
- **npm** (comes with Node)

### 2) Configure environment variables

Create a `.env` file in the project root (or copy `.env.example`) and set:

```bash
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
```

You can create the OAuth Client ID in Google Cloud Console:

- APIs & Services
- Credentials
- Create Credentials
- OAuth client ID
- Application type: **Web application**

Make sure you add the correct **Authorized JavaScript origins**, e.g.:

```text
http://localhost:5173
```

### 3) Install dependencies

#### Windows

```bat
install.bat
```

#### macOS/Linux

```sh
chmod +x install.sh
./install.sh
```

### 4) Run the dev server

#### Windows

```bat
run.bat
```

#### macOS/Linux

```sh
chmod +x run.sh
./run.sh
```

Vite will print the local URL (usually `http://localhost:5173`).

## Usage

1) Click **Add account** to create a profile.
2) Paste a YouTube URL into the **YouTube URL** field.
3) Switch profiles from the left sidebar.
4) (Optional) Click **Connect YouTube** to fetch the YouTube channel title for that profile.

## OAuth / YouTube Data API Notes

This app uses a client-side OAuth token flow via **Google Identity Services** and requests the scope:

```text
https://www.googleapis.com/auth/youtube.readonly
```

You must also enable **YouTube Data API v3** in the Google Cloud project.

If your OAuth consent screen is in **Testing**, you must add your Google account as a **Test user**.

## Troubleshooting

### “Google has not verified this app”

Expected when the consent screen is in **Testing**. You should still be able to proceed if you are a configured **Test user**.

### “YouTube: error al leer canal (403/401/…)”

Common reasons:

- YouTube Data API v3 is not enabled in the selected Google Cloud project.
- OAuth consent screen is misconfigured (Testing without adding your user).
- Wrong OAuth Client ID / wrong project.

## License

Private / internal project.
