import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CustomerioConnector implements OnModuleInit {
  private readonly logger = new Logger(CustomerioConnector.name);
  private client: AxiosInstance;
  private isConnected = false;
  private region: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    const siteId = this.configService.get<string>('CUSTOMERIO_SITE_ID');
    const apiKey = this.configService.get<string>('CUSTOMERIO_API_KEY');
    const region = this.configService.get<string>('CUSTOMERIO_REGION') || 'us';

    if (!siteId || !apiKey) {
      this.logger.warn('Customer.io credentials not configured');
      return;
    }

    // Create Basic Auth token
    const authToken = Buffer.from(`${siteId}:${apiKey}`).toString('base64');

    // Set base URL based on region
    const baseURL = region === 'eu' 
      ? 'https://track-eu.customer.io' 
      : 'https://track.customer.io';

    this.region = region;

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.logger.log(`Customer.io initialized with ${region.toUpperCase()} region (${baseURL})`);
    await this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      this.logger.log('Verifying Customer.io connection...');

      // Simple verification - try to access the region endpoint
      const response = await this.client.get('/api/v1/accounts/region');

      if (response.data && response.status === 200) {
        this.logger.log(
          `Customer.io connection verified - Region: ${this.region.toUpperCase()}`,
        );
        this.logger.log(
          `Environment ID: ${response.data.environment_id || 'N/A'}`,
        );
        this.isConnected = true;
      }
    } catch (error) {
      this.isConnected = false;
      if (error.response) {
        this.logger.error(
          `Customer.io connection failed: ${error.response.status} - ${error.response.statusText}`,
        );
        this.logger.error(
          `Response: ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.request) {
        this.logger.error(
          'Customer.io connection failed: No response received',
        );
      } else {
        this.logger.error(
          `Customer.io connection failed: ${error.message}`,
        );
      }
    }
  }

  getClient(): AxiosInstance {
    if (!this.client) {
      throw new Error('Customer.io client not initialized');
    }
    return this.client;
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }

  getRegion(): string {
    return this.region || 'unknown';
  }

  async reconnect(): Promise<void> {
    this.logger.log('Attempting to reconnect to Customer.io...');
    await this.initialize();
  }
}
