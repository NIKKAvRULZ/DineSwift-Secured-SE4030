import axios from '../api/http';

const API_URL = 'http://localhost:5001/api';

const userService = {
  getProfile: async () => {
    try {

      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  },

  updateProfile: async (userData) => {
    try {

      const response = await axios.put(
        `${API_URL}/users/profile`,
        userData,
        {
          headers: { }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  updatePassword: async (passwordData) => {
    try {

      const response = await axios.put(
        `${API_URL}/users/password`,
        passwordData,
        {
          headers: { }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update password' };
    }
  },

  deleteAccount: async () => {
    try {

      const response = await axios.delete(`${API_URL}/users/account`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete account' };
    }
  },

  getAddresses: async () => {
    try {

      const response = await axios.get(`${API_URL}/users/addresses`, {
        headers: { }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch addresses' };
    }
  },

  addAddress: async (addressData) => {
    try {

      const response = await axios.post(
        `${API_URL}/users/addresses`,
        addressData,
        {
          headers: { }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add address' };
    }
  }
};

export default userService; 