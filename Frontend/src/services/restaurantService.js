import axios from '../api/http';

const API_URL = 'http://localhost:5002/api/restaurants';

const restaurantService = {
  getAllRestaurants: async (filters = {}) => {
    try {

      const response = await axios.get(`${API_URL}/restaurants`, {
        headers: { },
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch restaurants' };
    }
  },

  getRestaurantById: async (id) => {
    try {

      const response = await axios.get(`${API_URL}/restaurants/${id}`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch restaurant' };
    }
  },

  getRestaurantMenu: async (restaurantId) => {
    try {

      const response = await axios.get(`${API_URL}/restaurants/${restaurantId}/menu`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch menu' };
    }
  },

  searchRestaurants: async (searchTerm, filters = {}) => {
    try {

      const response = await axios.get(`${API_URL}/restaurants/search`, {
        headers: { },
        params: { q: searchTerm, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Search failed' };
    }
  }
};

export default restaurantService; 