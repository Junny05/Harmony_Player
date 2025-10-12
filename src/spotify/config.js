export const SPOTIFY_CLIENT_ID = '1234567890abcdef1234567890abcdef'; // Replace this with your actual Client ID from Spotify Dashboard
export const SPOTIFY_REDIRECT_URI = 'http://localhost:3000';
export const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');
