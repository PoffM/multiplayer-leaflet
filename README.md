# Multiplayer Leaflet

Peer-to-peer shared leaflet map that you can draw on.

[![Demo video](https://img.youtube.com/vi/LkqONRcBqaE/maxresdefault.jpg)](https://www.youtube.com/watch?v=LkqONRcBqaE)

## Features

* Panning and zooming are shared across users.
* Users see each other's cursors and names.
* Draw on the map with the colored pen tool.

## Stack

- [SolidJS](https://www.solidjs.com/) (UI framework)
- [Solid Start](https://start.solidjs.com/) (SolidJS-based web application framework)
- [Leaflet](https://leafletjs.com/) (Javascript-based interactive maps)
- [yjs](https://docs.yjs.dev/) (Collaboratively replicated data library)
- [Tailwind](https://tailwindcss.com/) (CSS utility framework)
- [DaisyUI](https://daisyui.com/) (Tailwind-based UI component library)

## Environment variables for deployment

```bash
# Comma-separated list of WebRTC signaling servers:
VITE_SIGNALING=wss://signaling.yjs.dev,wss://y-webrtc-signaling-eu.herokuapp.com,wss://y-webrtc-signaling-us.herokuapp.com
```
