import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class HubspotConnector implements OnModuleInit {
  private readonly logger = new Logger(HubspotConnector.name);
  private client: AxiosInstance;
  private apiKey: string | undefined;
  private apiUrl: string;
  private isConnected: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize HubSpot connection
   */
  private async initialize() {
    this.apiKey = this.configService.get<string>('HUBSPOT_API_KEY');
    this.apiUrl = this.configService.get<string>(
      'HUBSPOT_API_URL',
      'https://api.hubapi.com',
    );

    if (!this.apiKey) {
      this.logger.warn('HUBSPOT_API_KEY is not configured');
      return;
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    await this.verifyConnection();
  }

  /**
   * Verify connection to HubSpot API
   */
  private async verifyConnection() {
    try {
      await this.client.get('/crm/v3/objects/contacts', {
        params: { limit: 1 },
      });
      this.isConnected = true;
      this.logger.log('✅ HubSpot connection established successfully');
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`❌ Failed to connect to HubSpot: ${error.message}`);
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
      throw new Error('HubSpot client is not initialized');
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
   * Reconnect to HubSpot API
   */
  async reconnect() {
    this.logger.log('Attempting to reconnect to HubSpot...');
    await this.initialize();
  }
}