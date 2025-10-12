export const SPOTIFY_CLIENT_ID = '87a491ee4998497c854dfff0069c1b81'; // Your Spotify Client ID
// Using loopback IP address as per Spotify's security requirements
export const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3000/callback';
export const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'app-remote-control',
  'user-read-currently-playing',
  'user-read-recently-played'
].join(' ');
