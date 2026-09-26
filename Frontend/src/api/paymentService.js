import axios from './http';

const BASE_URL = "http://localhost:5005/api/";

const paymentService = {

  createStripeCheckoutSession: async (stripeData) => {
    try {
      const response = await axios.post(`${BASE_URL}payment/stripe/create-checkout-session`, stripeData, {
        headers: {
          'Content-Type': 'application/json',
          }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create Stripe checkout session');
    }
  }

};

export default paymentService;
