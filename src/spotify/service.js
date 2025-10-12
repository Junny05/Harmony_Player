import {
  SPOTIFY_AUTH_ENDPOINT,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_SCOPES,
} from './config';

class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.player = null;
  }

  getLoginUrl() {
    return `${SPOTIFY_AUTH_ENDPOINT}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      SPOTIFY_REDIRECT_URI
    )}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}&response_type=token&show_dialog=true`;
  }

  handleRedirect() {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      this.accessToken = accessToken;
      window.location.hash = '';
      return accessToken;
    }
    return null;
  }

  async initializePlayer() {
    if (!this.accessToken) return null;

    return new Promise((resolve) => {
      if (window.Spotify) {
        this.initPlayer(resolve);
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          this.initPlayer(resolve);
        };
      }
    });
  }

  async initPlayer(resolve) {
    const player = new window.Spotify.Player({
      name: 'Last.fm Music Player',
      getOAuthToken: cb => { cb(this.accessToken); }
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
      if (state) {
        this.currentState = state;
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      this.deviceId = device_id;
    });

    // Connect to the player
    const connected = await player.connect();
    if (connected) {
      this.player = player;
      resolve(player);
    }
  }

  async searchTrack(artist, track) {
    if (!this.accessToken) return null;

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        `${track} artist:${artist}`
      )}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.tracks?.items[0] || null;
  }

  async playTrack(spotifyUri) {
    if (!this.player || !this.accessToken || !this.deviceId) return;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [spotifyUri],
      }),
    });

    this.player.resume();
  }

  async pausePlayback() {
    if (!this.player || !this.accessToken) return;

    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }
}

export const spotifyService = new SpotifyService();
