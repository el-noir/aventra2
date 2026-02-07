import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('organization/:organizationId')
  async findByOrganization(@Param('organizationId') organizationId: string) {
    return this.contactsService.findByOrganization(+organizationId);
  }

  @Get('account/:accountId')
  async findByAccount(@Param('accountId') accountId: string) {
    return this.contactsService.findByAccount(+accountId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactsService.findById(+id);
  }

  @Post()
  async create(
    @Body()
    body: {
      organizationId: number;
      email?: string;
      name?: string;
      accountId?: number;
    },
  ) {
    return this.contactsService.create(body);
  }
}
