import { Controller, Get, Param, Post, ParseIntPipe } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';

@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  /**
   * Evaluate lifecycle for a single account
   */
  @Post('evaluate/account/:accountId')
  async evaluateAccount(@Param('accountId', ParseIntPipe) accountId: number) {
    const evaluation = await this.lifecycleService.evaluateAccount(accountId);
    return {
      success: true,
      evaluation,
    };
  }

  /**
   * Evaluate all accounts in an organization
   */
  @Post('evaluate/organization/:organizationId')
  async evaluateOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    const evaluations = await this.lifecycleService.evaluateAll(organizationId);
    const updated = evaluations.filter((e) => e.shouldUpdate).length;

    return {
      success: true,
      total: evaluations.length,
      updated,
      evaluations,
    };
  }

  /**
   * Get lifecycle stats
   */
  @Get('stats/:organizationId')
  async getStats(@Param('organizationId', ParseIntPipe) organizationId: number) {
    // TODO: Implement stats endpoint
    return {
      message: 'Lifecycle stats endpoint - coming soon',
    };
  }
}
