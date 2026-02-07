import { Controller, Get, Query, Param } from '@nestjs/common';
import { SignalsService } from './signals.service';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  async getRecent(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.signalsService.findRecent(limitNumber);
  }

  @Get('stats')
  async getStats() {
    return this.signalsService.getStats();
  }

  @Get('unknown')
  async getUnknownEvents(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.signalsService.findUnknownEvents(limitNumber);
  }

  @Get('source/:source')
  async getBySource(
    @Param('source') source: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.signalsService.findBySource(source, limitNumber);
  }

  @Get('account/:accountId')
  async getByAccount(@Param('accountId') accountId: string) {
    return this.signalsService.findByAccount(+accountId);
  }
}
