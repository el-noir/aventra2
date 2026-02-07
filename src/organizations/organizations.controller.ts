import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(+id);
  }

  @Post()
  async create(@Body() body: { name: string; plan?: string }) {
    return this.organizationsService.create(body);
  }

  @Patch(':id/plan')
  async updatePlan(@Param('id') id: string, @Body() body: { plan: string }) {
    return this.organizationsService.updatePlan(+id, body.plan);
  }
}
