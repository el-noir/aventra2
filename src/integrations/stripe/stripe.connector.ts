import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class StripeConnector implements OnModuleInit {
  private readonly logger = new Logger(StripeConnector.name);
  private client: AxiosInstance;
  private apiKey: string | undefined;
  private apiUrl: string;
  private isConnected: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize Stripe connection
   */
  private async initialize() {
    this.apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.apiUrl = this.configService.get<string>(
      'STRIPE_API_URL',
      'https://api.stripe.com',
    );

    if (!this.apiKey) {
      this.logger.warn('⚠️  STRIPE_SECRET_KEY is not configured');
      return;
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    await this.verifyConnection();
  }

  /**
   * Verify connection to Stripe API
   */
  private async verifyConnection() {
    try {
      // Test connection by retrieving account balance
      const response = await this.client.get('/v1/balance');
      this.isConnected = true;
      this.logger.log('✅ Stripe connection established successfully');
      if (response.data.livemode !== undefined) {
        this.logger.log(`Mode: ${response.data.livemode ? 'Live' : 'Test'}`);
      }
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`❌ Failed to connect to Stripe: ${error.message}`);
      if (error.response) {
        this.logger.error(
          `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`,
        );
      }
    }
  }

  /**
   * Get the axios client instance
   */
  getClient(): AxiosInstance {
    if (!this.client) {
      throw new Error('Stripe client is not initialized');
    }
    return this.client;
  }

  /**
   * Check if connection is active
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect to Stripe API
   */
  async reconnect() {
    this.logger.log('Attempting to reconnect to Stripe...');
    await this.initialize();
  }
}
