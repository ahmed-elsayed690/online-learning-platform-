const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

class PaymentService {
  // Stripe payment processing
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Stripe payment intent creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create customer
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        success: true,
        customerId: customer.id
      };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process refund
  async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment history for customer
  async getPaymentHistory(customerId, limit = 10) {
    try {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit
      });

      const payments = paymentIntents.data.map(payment => ({
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        created: new Date(payment.created * 1000),
        metadata: payment.metadata
      }));

      return {
        success: true,
        payments
      };
    } catch (error) {
      console.error('Payment history retrieval error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook handler for Stripe events
  async handleWebhook(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, error: error.message };
    }
  }

  async handlePaymentSuccess(paymentIntent) {
    // Update enrollment status, send confirmation email, etc.
    console.log('Payment succeeded:', paymentIntent.id);
    
    const Enrollment = require('../models/Enrollment');
    const User = require('../models/User');
    
    if (paymentIntent.metadata.courseId && paymentIntent.metadata.userId) {
      await Enrollment.create({
        user: paymentIntent.metadata.userId,
        course: paymentIntent.metadata.courseId,
        paymentInfo: {
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          paymentMethod: 'stripe',
          paymentDate: new Date()
        }
      });
    }
  }

  async handlePaymentFailure(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    // Handle payment failure logic
  }

  async handleSubscriptionCreated(subscription) {
    console.log('Subscription created:', subscription.id);
    // Handle subscription creation logic
  }

  async handleSubscriptionCanceled(subscription) {
    console.log('Subscription canceled:', subscription.id);
    // Handle subscription cancellation logic
  }
}

// Weather API integration (example external API)
class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getCurrentWeather(city) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        success: true,
        data: {
          city: response.data.name,
          country: response.data.sys.country,
          temperature: response.data.main.temp,
          description: response.data.weather[0].description,
          humidity: response.data.main.humidity,
          windSpeed: response.data.wind.speed,
          icon: response.data.weather[0].icon
        }
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return {
        success: false,
        error: 'Failed to fetch weather data'
      };
    }
  }

  async getWeatherForecast(city, days = 5) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          cnt: days * 8 // 8 forecasts per day (every 3 hours)
        }
      });

      const forecast = response.data.list.map(item => ({
        date: new Date(item.dt * 1000),
        temperature: item.main.temp,
        description: item.weather[0].description,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        icon: item.weather[0].icon
      }));

      return {
        success: true,
        data: {
          city: response.data.city.name,
          country: response.data.city.country,
          forecast
        }
      };
    } catch (error) {
      console.error('Weather forecast API error:', error);
      return {
        success: false,
        error: 'Failed to fetch weather forecast'
      };
    }
  }
}

module.exports = {
  PaymentService: new PaymentService(),
  WeatherService: new WeatherService()
};