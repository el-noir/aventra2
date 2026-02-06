import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HubspotConnector {
  private readonly logger = new Logger(HubspotConnector.name);

  constructor(private readonly configService: ConfigService) {}
  /**
   * Test connection to HubSpot API
   */
  async testConnection() {
    const apiKey = this.configService.get<string>('HUBSPOT_API_KEY');
    const apiUrl = this.configService.get<string>('HUBSPOT_API_URL', 'https://api.hubapi.com');

    if (!apiKey) {
      return { success: false, error: 'HUBSPOT_API_KEY is not configured' };
    }

    try {
      const response = await axios.get(`${apiUrl}/crm/v3/objects/contacts`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { limit: 1 },
      });

      return {
        success: true,
        message: 'HubSpot API connection successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
        status: error.response?.status || null,
      };
    }
  }
}