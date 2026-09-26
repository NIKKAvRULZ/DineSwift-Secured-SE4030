import axios from '../api/http';

const API_URL = 'http://localhost:5003/api';

const cartService = {
  getCart: async () => {
    try {

      const response = await axios.get(`${API_URL}/cart`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch cart' };
    }
  },

  addToCart: async (itemData) => {
    try {

      const response = await axios.post(`${API_URL}/cart/items`, itemData, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add item to cart' };
    }
  },

  updateCartItem: async (itemId, quantity) => {
    try {

      const response = await axios.put(
        `${API_URL}/cart/items/${itemId}`,
        { quantity },
        {
          headers: { }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update cart item' };
    }
  },

  removeFromCart: async (itemId) => {
    try {

      const response = await axios.delete(`${API_URL}/cart/items/${itemId}`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to remove item from cart' };
    }
  },

  clearCart: async () => {
    try {

      const response = await axios.delete(`${API_URL}/cart`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to clear cart' };
    }
  }
};

export default cartService; 