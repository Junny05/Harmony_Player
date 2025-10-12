
import React, { useState, useEffect } from 'react';
import { Search, Play, Pause, Music, Home, Clock, Users, SkipForward, List, Sparkles, Heart, Zap, Coffee, Smile, Brain } from 'lucide-react';
import { youtubeService } from './youtube/service';
import YouTubePlayer from './components/YouTubePlayer';

// Last.fm API Configuration
const LASTFM_API_KEY = process.env.REACT_APP_LASTFM_API_KEY;
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// API Helper Functions
const lastFmApi = {
  search: async (query, type = 'artist') => {
    const method = type === 'artist' ? 'artist.search' : type === 'album' ? 'album.search' : 'track.search';
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=${method}&${type}=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
    );
    const data = await response.json();

    // If searching for tracks, get additional info for each track
    if (type === 'track' && data.results?.trackmatches?.track) {
      const tracks = Array.isArray(data.results.trackmatches.track) 
        ? data.results.trackmatches.track 
        : [data.results.trackmatches.track];

      // Get detailed info for each track including album art
      const tracksWithInfo = await Promise.all(tracks.map(async track => {
        try {
          const trackInfo = await lastFmApi.getTrackInfo(track.artist, track.name);
          return {
            ...track,
            image: trackInfo.track?.album?.image || track.image,
            album: trackInfo.track?.album?.title
          };
        } catch (error) {
          return track;
        }
      }));
      
      data.results.trackmatches.track = tracksWithInfo;
    }
    
    return data;
  },
  
  getArtistInfo: async (artist) => {
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json`
    );
    return response.json();
  },
  
  getTopTracks: async (artist) => {
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
    );
    return response.json();
  },
  
  getSimilarArtists: async (artist) => {
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`
    );
    return response.json();
  },
  
  getSimilarTracks: async (artist, track) => {
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${LASTFM_API_KEY}&format=json&limit=20`
    );
    return response.json();
  },
  
  getTrackInfo: async (artist, track) => {
    const response = await fetch(
      `${LASTFM_BASE_URL}?method=track.getinfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${LASTFM_API_KEY}&format=json`
    );
    const data = await response.json();
    
    // If no album info, try to get it from artist's top albums
    if (!data.track?.album?.image && data.track?.artist?.name) {
      try {
        const albumsResponse = await fetch(
          `${LASTFM_BASE_URL}?method=artist.gettopalbums&artist=${encodeURIComponent(data.track.artist.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
        );
        const albumsData = await albumsResponse.json();
        if (albumsData.topalbums?.album?.[0]?.image) {
          data.track.album = data.track.album || {};
          data.track.album.image = albumsData.topalbums.album[0].image;
        }
      } catch (error) {
        console.error('Error fetching album art:', error);
      }
    }
    
    return data;
  }
};

// Storage Helper
const storage = {
  recentTracks: [],
  
  addTrack: function(track) {
    this.recentTracks = [track, ...this.recentTracks.filter(t => 
      !(t.name === track.name && t.artist === track.artist)
    )].slice(0, 20);
  },
  
  getRecentTracks: function() {
    return this.recentTracks;
  }
};

// Enhanced Audio Visualizer
const AudioVisualizer = ({ isPlaying }) => {
  const [bars, setBars] = useState(Array(24).fill(0));
  
  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(24).fill(0));
      return;
    }
    
    const interval = setInterval(() => {
      setBars(Array(24).fill(0).map(() => Math.random() * 0.8 + 0.2));
    }, 80);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  return (
    <div className="flex items-end justify-center gap-1 h-20">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-2 bg-gradient-to-t from-purple-500 via-pink-500 to-purple-400 rounded-t transition-all duration-75 shadow-lg"
          style={{ 
            height: `${height * 100}%`,
            opacity: isPlaying ? 1 : 0.3
          }}
        />
      ))}
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ isPlaying, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const duration = 180; // 3 minutes simulation
  
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return;
    }
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / duration);
        if (newProgress >= 100) {
          clearInterval(interval);
          onComplete();
          return 100;
        }
        return newProgress;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, onComplete]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const currentTime = Math.floor((progress / 100) * duration);
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// AI Playlist Queue Component
const PlaylistQueue = ({ queue, currentIndex, onTrackSelect, theme }) => {
  if (queue.length === 0) return null;
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <List className="w-5 h-5" />
        AI Playlist Queue
        <span className="text-sm font-normal text-gray-500">({queue.length} tracks)</span>
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {queue.map((track, idx) => (
          <div
            key={idx}
            onClick={() => onTrackSelect(idx)}
            className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
              idx === currentIndex 
                ? 'bg-purple-500 text-white' 
                : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <span className={`font-semibold w-6 ${idx === currentIndex ? 'text-white' : 'text-gray-400'}`}>
              {idx + 1}
            </span>
            <img
              src={track.image || 'https://via.placeholder.com/40?text=No+Image'}
              alt={track.name}
              className="w-10 h-10 rounded object-cover"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=No+Image'; }}
            />
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${idx === currentIndex ? 'text-white' : ''}`}>
                {track.name}
              </p>
              <p className={`text-sm truncate ${idx === currentIndex ? 'text-purple-100' : 'text-gray-500'}`}>
                {track.artist}
              </p>
            </div>
            {idx === currentIndex && (
              <Music className="w-5 h-5 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Now Playing Component
const NowPlaying = ({ track, isPlaying, onPlayPause, onNext, theme, showQueue, youtubeVideo, onPlayerReady, onPlayerStateChange }) => {
  if (!track) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 text-center border border-white/10">
        <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No track playing</p>
      </div>
    );
  }
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
          {/* Hidden YouTube player for audio */}
      {youtubeVideo && (
        <YouTubePlayer
          videoId={youtubeVideo.id.videoId}
          onStateChange={onPlayerStateChange}
          onReady={onPlayerReady}
        />
      )}
      <h3 className="text-sm font-semibold mb-4 text-gray-500 uppercase tracking-wide flex items-center gap-2">
        <Music className="w-4 h-4" />
        Now Playing
      </h3>
      <div className="flex gap-6">
        <div className="relative group">
          <img
            src={track.image || 'https://via.placeholder.com/300?text=No+Image'}
            alt={track.name}
            className="w-48 h-48 rounded-lg object-cover shadow-lg transition-transform transform group-hover:scale-105"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=No+Image'; }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg"></div>
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{track.name}</h2>
            <p className="text-lg text-gray-500">{track.artist}</p>
            {track.album && <p className="text-sm text-gray-400 mt-1">{track.album}</p>}
          </div>
          <div>
            <ProgressBar isPlaying={isPlaying} onComplete={onNext} />
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={onPlayPause}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:shadow-lg transition-all transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
              </button>
              <button
                onClick={onNext}
                className={`p-3 rounded-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-all`}
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <div className="flex-1" />
              {showQueue && (
                <div className="flex items-center gap-2 text-sm text-purple-500">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Playlist Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isPlaying && (
        <div className="mt-6">
          <AudioVisualizer isPlaying={isPlaying} />
        </div>
      )}
    </div>
  );
};

// Search Component
const SearchBar = ({ onSearch, theme }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('artist');
  
  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query, searchType);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for artists, albums, or tracks..."
          className="w-full pl-10 pr-4 py-4 rounded-lg bg-white/10 backdrop-blur-lg text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-200/60"
        />
      </div>
      <select
        value={searchType}
        onChange={(e) => setSearchType(e.target.value)}
        className={`px-4 py-3 rounded-lg ${
          theme === 'dark' 
            ? 'bg-gray-800 text-white border-gray-700' 
            : 'bg-white text-gray-900 border-gray-300'
        } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
      >
        <option value="artist">Artist</option>
        <option value="album">Album</option>
        <option value="track">Track</option>
      </select>
      <button
        onClick={handleSubmit}
        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105"
      >
        Search
      </button>
    </div>
  );
};

// Artist Info Component
const ArtistInfo = ({ artist, onTrackSelect, onLoadSimilar, theme }) => {
  const [topTracks, setTopTracks] = useState([]);
  const [similarArtists, setSimilarArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (artist) {
      loadArtistData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist]);
  
  const loadArtistData = async () => {
    setLoading(true);
    try {
      const [tracksData, similarData] = await Promise.all([
        lastFmApi.getTopTracks(artist.name),
        lastFmApi.getSimilarArtists(artist.name)
      ]);
      
      setTopTracks(tracksData.toptracks?.track || []);
      setSimilarArtists(similarData.similarartists?.artist || []);
    } catch (error) {
      console.error('Error loading artist data:', error);
    }
    setLoading(false);
  };
  
  if (!artist) return null;
  
  const getImageUrl = (images) => {
    if (!images || !Array.isArray(images)) return 'https://via.placeholder.com/200?text=No+Image';
    const largeImage = images.find(img => img.size === 'extralarge' || img.size === 'large');
    const url = largeImage?.['#text'] || images[images.length - 1]?.['#text'];
    return url || 'https://via.placeholder.com/200?text=No+Image';
  };
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <div className="flex gap-6 mb-6">
        <img
          src={getImageUrl(artist.image)}
          alt={artist.name}
          className="w-48 h-48 rounded-lg object-cover shadow-md"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=No+Image'; }}
        />
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-2">{artist.name}</h2>
          {artist.bio?.summary && (
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {artist.bio.summary.replace(/<a[^>]*>.*?<\/a>/g, '').substring(0, 300)}...
            </p>
          )}
          {artist.stats && (
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-2xl font-bold text-purple-500">{parseInt(artist.stats.listeners).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Listeners</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-500">{parseInt(artist.stats.playcount).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Plays</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Top Tracks
            </h3>
            <div className="space-y-2">
              {topTracks.slice(0, 10).map((track, idx) => (
                <div
                  key={idx}
                  onClick={() => onTrackSelect({
                    name: track.name,
                    artist: artist.name,
                    image: getImageUrl(track.image),
                    playcount: track.playcount
                  })}
                  className={`${
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  } p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-semibold w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium">{track.name}</p>
                      <p className="text-sm text-gray-500">{parseInt(track.playcount).toLocaleString()} plays</p>
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
          
          {similarArtists.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Similar Artists
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {similarArtists.map((similar, idx) => (
                  <div
                    key={idx}
                    onClick={() => onLoadSimilar(similar.name)}
                    className={`${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } p-4 rounded-lg cursor-pointer transition-all transform hover:scale-105`}
                  >
                    <img
                      src={getImageUrl(similar.image)}
                      alt={similar.name}
                      className="w-full aspect-square rounded-lg object-cover mb-2"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Image'; }}
                    />
                    <p className="font-medium text-center truncate">{similar.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Recent Tracks Component
const RecentTracks = ({ tracks, onTrackSelect, theme }) => {
  if (tracks.length === 0) return null;
  
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Recently Played
      </h3>
      <div className="space-y-2">
        {tracks.map((track, idx) => (
          <div
            key={idx}
            onClick={() => onTrackSelect(track)}
            className={`${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            } p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3`}
          >
            <img
              src={track.image || 'https://via.placeholder.com/50?text=No+Image'}
              alt={track.name}
              className="w-12 h-12 rounded object-cover"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=No+Image'; }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.name}</p>
              <p className="text-sm text-gray-500 truncate">{track.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [theme, setTheme] = useState('dark');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [recentTracks, setRecentTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [generatingPlaylist, setGeneratingPlaylist] = useState(false);
  const [youtubeVideo, setYoutubeVideo] = useState(null);
  const [player, setPlayer] = useState(null);
  
  const generateAIPlaylist = async (track) => {
    setGeneratingPlaylist(true);
    try {
      // Get similar tracks using Last.fm's recommendation algorithm
      const similarData = await lastFmApi.getSimilarTracks(track.artist, track.name);
      const similarTracks = similarData.similartracks?.track || [];
      
      // Filter out invalid tracks and format for playlist
      const validSimilarTracks = similarTracks
        .filter(t => t && t.name && (t.artist?.name || t.artist))
        .slice(0, 19) // Get 19 tracks to make 20 total with current track
        .map(t => ({
          name: t.name,
          artist: t.artist?.name || t.artist,
          image: t.image?.find(img => img.size === 'large')?.['#text'] || 
                t.image?.find(img => img.size === 'extralarge')?.['#text'] ||
                'https://via.placeholder.com/150?text=No+Image',
          playcount: t.playcount,
          match: t.match // Similarity score from Last.fm
        }));
      
      // If we got fewer tracks, try to get more from the artist's top tracks
      if (validSimilarTracks.length < 10) {
        try {
          const topTracksData = await lastFmApi.getTopTracks(track.artist);
          const topTracks = topTracksData.toptracks?.track || [];
          
          const additionalTracks = topTracks
            .filter(t => t.name !== track.name) // Don't duplicate current track
            .slice(0, 20 - validSimilarTracks.length)
            .map(t => ({
              name: t.name,
              artist: track.artist,
              image: t.image?.find(img => img.size === 'large')?.['#text'] || 
                    'https://via.placeholder.com/150?text=No+Image',
              playcount: t.playcount
            }));
          
          validSimilarTracks.push(...additionalTracks);
        } catch (error) {
          console.error('Error fetching additional tracks:', error);
        }
      }
      
      // Format tracks for playlist, starting with current track
      const playlistTracks = [
        track, // Start with current track
        ...validSimilarTracks
      ];
      
      setPlaylist(playlistTracks);
      setCurrentPlaylistIndex(0);
      console.log(`Generated playlist with ${playlistTracks.length} tracks`);
    } catch (error) {
      console.error('Error generating playlist:', error);
      // Fallback: create a single-track playlist
      setPlaylist([track]);
      setCurrentPlaylistIndex(0);
    }
    setGeneratingPlaylist(false);
  };
  
  const handleSearch = async (query, type) => {
    setLoading(true);
    try {
      const data = await lastFmApi.search(query, type);
      
      if (type === 'artist' && data.results?.artistmatches?.artist) {
        const artists = Array.isArray(data.results.artistmatches.artist) 
          ? data.results.artistmatches.artist 
          : [data.results.artistmatches.artist];
        
        if (artists.length > 0) {
          const artistInfo = await lastFmApi.getArtistInfo(artists[0].name);
          setSelectedArtist(artistInfo.artist);
        }
      } else if (type === 'track' && data.results?.trackmatches?.track) {
        const tracks = Array.isArray(data.results.trackmatches.track)
          ? data.results.trackmatches.track
          : [data.results.trackmatches.track];
        
        if (tracks.length > 0) {
          const trackInfo = await lastFmApi.getTrackInfo(tracks[0].artist, tracks[0].name);
          const track = {
            name: tracks[0].name,
            artist: tracks[0].artist,
            album: trackInfo.track?.album?.title,
            image: trackInfo.track?.album?.image?.[3]?.['#text'] || // Extralarge
                   trackInfo.track?.album?.image?.[2]?.['#text'] || // Large
                   tracks[0].image?.find(img => img.size === 'large')?.['#text']
          };
          handleTrackSelect(track);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };
  
  const handleTrackSelect = async (track) => {
    // Get detailed track info including album art
    try {
      const trackInfo = await lastFmApi.getTrackInfo(track.artist, track.name);
      const updatedTrack = {
        ...track,
        album: trackInfo.track?.album?.title,
        image: trackInfo.track?.album?.image?.[3]?.['#text'] || // Extralarge
               trackInfo.track?.album?.image?.[2]?.['#text'] || // Large
               trackInfo.track?.album?.image?.[1]?.['#text'] || // Medium
               track.image || 'https://via.placeholder.com/300?text=No+Image'
      };
      
      setCurrentTrack(updatedTrack);
      storage.addTrack(updatedTrack);
      setRecentTracks(storage.getRecentTracks());
      
      // Search for the track on YouTube
      const searchQuery = `${track.name} ${track.artist} official audio`;
      const videos = await youtubeService.searchVideo(searchQuery);
      
      if (videos && videos.length > 0) {
        setYoutubeVideo(videos[0]);
        setIsPlaying(true);
      } else {
        console.log('Track not found on YouTube');
        setIsPlaying(false);
      }
      
      // Generate AI playlist based on this track
      await generateAIPlaylist(updatedTrack);
    } catch (error) {
      console.error('Error getting track info:', error);
      setCurrentTrack(track);
      storage.addTrack(track);
      setRecentTracks(storage.getRecentTracks());
    }
  };
  
  const handlePlayerReady = (event) => {
    setPlayer(event.target);
  };

  const handlePlayerStateChange = (event) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsPlaying(true);
        break;
      case window.YT.PlayerState.PAUSED:
        setIsPlaying(false);
        break;
      case window.YT.PlayerState.ENDED:
        handleNext();
        break;
      default:
        break;
    }
  };

  const handlePlayPause = async () => {
    if (!player || !youtubeVideo) return;
    
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleNext = () => {
    if (playlist.length > 0) {
      if (currentPlaylistIndex < playlist.length - 1) {
        // Move to next track in playlist
        const nextIndex = currentPlaylistIndex + 1;
        setCurrentPlaylistIndex(nextIndex);
        setCurrentTrack(playlist[nextIndex]);
        setIsPlaying(true);
        storage.addTrack(playlist[nextIndex]);
        setRecentTracks(storage.getRecentTracks());
      } else {
        // At end of playlist, generate new playlist from last track
        generateAIPlaylist(playlist[playlist.length - 1]);
      }
    } else if (currentTrack) {
      // No playlist exists, generate one from current track
      generateAIPlaylist(currentTrack);
    }
  };
  
  const handlePlaylistTrackSelect = async (index) => {
    const track = playlist[index];
    setCurrentPlaylistIndex(index);
    await handleTrackSelect(track); // This will get album art and handle everything else
  };
  
  const handleLoadSimilar = async (artistName) => {
    setLoading(true);
    try {
      const artistInfo = await lastFmApi.getArtistInfo(artistName);
      setSelectedArtist(artistInfo.artist);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading similar artist:', error);
    }
    setLoading(false);
  };
  


  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [currentMood, setCurrentMood] = useState('');

  const handleMoodPlaylist = async (mood) => {
    setShowMoodPrompt(false);
    setLoading(true);
    try {
      // Predefined mood to genre mappings
      const moodGenres = {
        happy: ['pop', 'dance', 'electronic'],
        sad: ['acoustic', 'indie', 'ambient'],
        energetic: ['rock', 'hiphop', 'metal'],
        relaxed: ['jazz', 'classical', 'lofi'],
        romantic: ['rnb', 'soul', 'love songs'],
        focused: ['ambient', 'instrumental', 'study']
      };
      
      let searchQuery;
      
      if (moodGenres[mood]) {
        // For predefined moods, use genre-based search
        const genres = moodGenres[mood];
        const genre = genres[Math.floor(Math.random() * genres.length)];
        searchQuery = genre;
      } else {
        // For custom mood/description, use it directly as search query
        // This allows more natural language searches like "rainy day coffee shop vibes"
        searchQuery = mood;
      }
      
      // Search for tracks using the query
      const data = await lastFmApi.search(searchQuery, 'track');
      if (data.results?.trackmatches?.track) {
        const tracks = Array.isArray(data.results.trackmatches.track)
          ? data.results.trackmatches.track
          : [data.results.trackmatches.track];
        
        if (tracks.length > 0) {
          // Select a track that seems most relevant
          const randomIndex = Math.floor(Math.random() * Math.min(5, tracks.length));
          const selectedTrack = tracks[randomIndex];
          
          // Use this track to start a playlist
          handleTrackSelect({
            name: selectedTrack.name,
            artist: selectedTrack.artist,
            image: selectedTrack.image?.find(img => img.size === 'large')?.['#text']
          });
        }
      }
    } catch (error) {
      console.error('Error generating mood playlist:', error);
    }
    setLoading(false);
  };

  // Mood Selection Modal
  const MoodPrompt = ({ onSelect, onClose }) => {
    const [customMood, setCustomMood] = useState('');
    const moods = [
      { name: 'happy', icon: Smile, color: 'bg-yellow-500', text: 'Happy & Upbeat' },
      { name: 'relaxed', icon: Coffee, color: 'bg-green-500', text: 'Calm & Relaxed' },
      { name: 'energetic', icon: Zap, color: 'bg-red-500', text: 'Energetic & Pumped' },
      { name: 'romantic', icon: Heart, color: 'bg-pink-500', text: 'Romantic & Smooth' },
      { name: 'focused', icon: Brain, color: 'bg-purple-500', text: 'Focused & Inspired' }
    ];

    const handleCustomMoodSubmit = (e) => {
      e.preventDefault();
      if (customMood.trim()) {
        onSelect(customMood.trim());
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-white mb-4">How are you feeling?</h2>
          <p className="text-blue-200 mb-6">Let AI create the perfect playlist for your mood</p>
          
          <form onSubmit={handleCustomMoodSubmit} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={customMood}
                onChange={(e) => setCustomMood(e.target.value)}
                placeholder="Describe your mood or the vibe you want..."
                className="w-full p-4 pr-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                disabled={!customMood.trim()}
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-blue-200 bg-[#0f172a]">or choose a mood</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {moods.map(mood => (
              <button
                key={mood.name}
                onClick={() => onSelect(mood.name)}
                className={`flex items-center gap-4 p-4 rounded-lg ${mood.color} hover:opacity-90 transition-all w-full group`}
              >
                <mood.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">{mood.text}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={onClose}
            className="mt-6 text-blue-200 hover:text-white transition-colors w-full text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-white">
      <div className="container mx-auto px-6 py-6 max-w-[1400px]">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between bg-blue-800/30 backdrop-blur-sm rounded-2xl p-4 mb-8 border border-blue-700/30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-700/50 hover:bg-blue-600/50 rounded-xl p-3 transition-all"
            >
              <Home className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Harmony <span className="text-blue-400">Player</span>
              </h1>
              <p className="text-blue-200 text-sm">Your AI-Powered Music Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMoodPrompt(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all font-medium text-sm group"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-spin" />
              <span>AI Mood Playlist</span>
            </button>
          </div>
        </nav>
        {showMoodPrompt && (
          <MoodPrompt 
            onSelect={handleMoodPlaylist}
            onClose={() => setShowMoodPrompt(false)}
          />
        )}
        
        <div className="mb-8">
          <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Search Music
            </h2>
            <SearchBar onSearch={handleSearch} theme="dark" />
          </div>
        </div>
        
        {loading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="text-blue-200 mt-4 text-center">Loading...</p>
            </div>
          </div>
        )}
        
        {generatingPlaylist && (
          <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-4 mb-8 flex items-center gap-3 border border-blue-700/30">
            <Sparkles className="w-5 h-5 text-blue-400 animate-ping" />
            <span>Creating your personalized AI playlist...</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content - 8 columns */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
              <NowPlaying 
                track={currentTrack} 
                isPlaying={isPlaying} 
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                theme="dark"
                showQueue={playlist.length > 0}
                youtubeVideo={youtubeVideo}
                onPlayerReady={handlePlayerReady}
                onPlayerStateChange={handlePlayerStateChange}
              />
            </div>
            
            {selectedArtist && (
              <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
                <ArtistInfo 
                  artist={selectedArtist} 
                  onTrackSelect={handleTrackSelect}
                  onLoadSimilar={handleLoadSimilar}
                  theme="dark"
                />
              </div>
            )}
          </div>
          
          {/* Sidebar - 4 columns */}
          <div className="lg:col-span-4 space-y-8">
            {playlist.length > 0 && (
              <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  AI Playlist
                </h2>
                <PlaylistQueue
                  queue={playlist}
                  currentIndex={currentPlaylistIndex}
                  onTrackSelect={handlePlaylistTrackSelect}
                  theme="dark"
                />
              </div>
            )}
            
            <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-700/30">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Recent Plays
              </h2>
              <RecentTracks 
                tracks={recentTracks} 
                onTrackSelect={handleTrackSelect}
                theme="dark"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;