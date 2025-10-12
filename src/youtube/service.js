import { YOUTUBE_API_KEY, YOUTUBE_API_BASE_URL } from './config';

class YouTubeService {
  async searchVideo(query) {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search YouTube');
      }
      
      return data.items;
    } catch (error) {
      console.error('Error searching YouTube:', error);
      return [];
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get video details');
      }
      
      return data.items[0];
    } catch (error) {
      console.error('Error getting video details:', error);
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();
