import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentSimulatorService } from './simulator/payment-simulator.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentSimulatorService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
