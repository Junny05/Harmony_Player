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
    if (!hash) {
      console.log('No hash found in URL');
      return null;
    }

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (accessToken) {
      console.log('Access token obtained');
      this.accessToken = accessToken;
      window.location.hash = '';
      return accessToken;
    }
    console.log('No access token found in URL');
    return null;
  }

  loadSpotifySDK() {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      
      script.onload = () => {
        if (window.Spotify) {
          resolve();
        } else {
          window.onSpotifyWebPlaybackSDKReady = resolve;
        }
      };
      
      script.onerror = (error) => {
        reject(new Error('Failed to load Spotify SDK'));
      };
      
      document.body.appendChild(script);
    });
  }

  async initializePlayer() {
    try {
      if (!this.accessToken) {
        console.log('No access token available');
        return null;
      }

      console.log('Loading Spotify SDK...');
      await this.loadSpotifySDK();
      console.log('Spotify SDK loaded successfully');

      return new Promise((resolve) => {
        this.initPlayer(resolve);
      });
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
      return null;
    }
  }

  async initPlayer(resolve) {
    try {
      if (!window.Spotify) {
        throw new Error('Spotify SDK not loaded');
      }

      const player = new window.Spotify.Player({
        name: 'Last.fm Music Player',
        getOAuthToken: cb => { 
          console.log('Getting OAuth token...');
          cb(this.accessToken); 
        }
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
        player.disconnect();
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
        this.accessToken = null;
        window.localStorage.removeItem('spotify_token');
        player.disconnect();
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account:', message);
        player.disconnect();
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Failed to perform playback:', message);
      });

      // Playback status updates
      player.addListener('player_state_changed', state => {
        console.log('Playback state changed:', state);
        if (state) {
          this.currentState = state;
        }
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player Ready with Device ID:', device_id);
        this.deviceId = device_id;
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline:', device_id);
      });

      console.log('Connecting to Spotify player...');
      const connected = await player.connect();
      
      if (connected) {
        console.log('Successfully connected to Spotify player');
        this.player = player;
        resolve(player);
      } else {
        throw new Error('Failed to connect to Spotify player');
      }
    } catch (error) {
      console.error('Error in initPlayer:', error);
      resolve(null);
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
    if (!this.player || !this.accessToken || !this.deviceId) {
      console.error('Cannot play track:', {
        hasPlayer: !!this.player,
        hasToken: !!this.accessToken,
        deviceId: this.deviceId
      });
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [spotifyUri],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Spotify play error:', error);
        return;
      }

      await this.player.resume();
      console.log('Track playback started:', spotifyUri);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }

  async pausePlayback() {
    if (!this.player || !this.accessToken) {
      console.error('Cannot pause playback:', {
        hasPlayer: !!this.player,
        hasToken: !!this.accessToken
      });
      return;
    }

    try {
      await this.player.pause();
      console.log('Playback paused');
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  }


}

export const spotifyService = new SpotifyService();
