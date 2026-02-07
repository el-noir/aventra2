import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { LifecycleStage } from './entities/account.entity';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.accountsService.findById(+id);
  }

  @Get('stage/:stage')
  async findByStage(@Param('stage') stage: LifecycleStage) {
    return this.accountsService.findByStage(stage);
  }

  @Post()
  async create(@Body() body: { organizationId: number; name: string; domain?: string }) {
    return this.accountsService.create(body);
  }
}
