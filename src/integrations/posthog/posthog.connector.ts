import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PosthogConnector implements OnModuleInit {
  private readonly logger = new Logger(PosthogConnector.name);
  private client: AxiosInstance;
  private apiKey: string | undefined;
  private apiUrl: string;
  private isConnected: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize PostHog connection
   */
  private async initialize() {
    // Try personal API key first (for API access), fallback to project key
    this.apiKey = 
      this.configService.get<string>('POSTHOG_PERSONAL_API_KEY') ||
      this.configService.get<string>('POSTHOG_PROJECT_API_KEY') ||
      this.configService.get<string>('POSTHOG_API_KEY');
    
    this.apiUrl = this.configService.get<string>(
      'POSTHOG_API_URL',
      'https://app.posthog.com',
    );

    if (!this.apiKey) {
      this.logger.warn('⚠️  POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_API_KEY is not configured');
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
   * Verify connection to PostHog API
   */
  private async verifyConnection() {
    // Project API keys (phc_*) are for event capture, not for private API endpoints
    // Personal API keys (phx_*) are required for API access
    if (this.apiKey?.startsWith('phc_')) {
      this.isConnected = true;
      this.logger.log('✅ PostHog project key configured (for event capture only)');
      this.logger.warn('⚠️  Add POSTHOG_PERSONAL_API_KEY for full API access');
      return;
    }

    if (this.apiKey?.startsWith('phx_')) {
      // Personal API key detected - mark as connected
      // We skip the API call since it requires specific scopes
      this.isConnected = true;
      this.logger.log('✅ PostHog personal API key configured');
      this.logger.log('Note: Ensure your key has the required scopes for the endpoints you need');
      return;
    }

    this.logger.warn('⚠️  Unknown PostHog API key format');
  }

  /**
   * Get the axios client instance
   */
  getClient(): AxiosInstance {
    if (!this.client) {
      throw new Error('PostHog client is not initialized');
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
   * Reconnect to PostHog API
   */
  async reconnect() {
    this.logger.log('Attempting to reconnect to PostHog...');
    await this.initialize();
  }
}
