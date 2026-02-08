import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [MeController],
})
export class MeModule {}
