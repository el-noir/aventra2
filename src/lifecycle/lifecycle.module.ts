import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';
import { Account } from '../accounts/entities/account.entity';
import { Signal } from '../signals/entities/signal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Signal])],
  controllers: [LifecycleController],
  providers: [LifecycleService],
  exports: [LifecycleService],
})
export class LifecycleModule {}
