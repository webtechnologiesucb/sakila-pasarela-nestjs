import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { PaymentSimulatorService } from '../payments/simulator/payment-simulator.service';

@Module({
  controllers: [RefundsController],
  providers: [RefundsService, PaymentSimulatorService],
  exports: [RefundsService],
})
export class RefundsModule {}
