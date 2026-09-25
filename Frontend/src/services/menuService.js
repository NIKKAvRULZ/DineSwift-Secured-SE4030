import axios from 'axios';

const API_BASE_URL = 'http://localhost:5002/api';

function authConfig() {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined') throw new Error('Please sign in to submit a review');
  return { headers: { Authorization: `Bearer ${token}` } };
}

const menuService = {
  // Get restaurant menu items
  getMenuItems: async (restaurantId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants/${restaurantId}/menu-items`);
      return response.data;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  },

  // Get restaurant details
  getRestaurant: async (restaurantId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants/${restaurantId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      throw error;
    }
  },

  // Submit a rating for a menu item
  submitRating: async (restaurantId, menuItemId, rating) => {
    try {
      console.log('Submitting rating:', { restaurantId, menuItemId, rating });
      const response = await axios.post(
        `${API_BASE_URL}/restaurants/${restaurantId}/menu-items/${menuItemId}/rate`,
        { rating },
        authConfig()
      );
      
      console.log('Rating submitted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error.response?.data || { message: error.message || 'Failed to submit rating' };
    }
  },

  // Add a comment to a menu item
  addComment: async (restaurantId, menuItemId, comment) => {
    try {
      console.log('Adding comment:', { restaurantId, menuItemId, comment });
      const response = await axios.post(
        `${API_BASE_URL}/restaurants/${restaurantId}/menu-items/${menuItemId}/comments`,
        { text: comment.text },
        authConfig()
      );
      console.log('Comment added successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error.response?.data || { message: error.message || 'Failed to add comment' };
    }
  },

  // Get comments for a menu item
  getComments: async (restaurantId, menuItemId) => {
    try {
      console.log('Fetching comments:', { restaurantId, menuItemId });
      const response = await axios.get(
        `${API_BASE_URL}/restaurants/${restaurantId}/menu-items/${menuItemId}/comments`
      );
      console.log('Comments fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error.response?.data || { message: 'Failed to fetch comments' };
    }
  }
};

export default menuService;
