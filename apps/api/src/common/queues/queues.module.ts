import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

/**
 * All Bull queues are registered here, once. Each `registerQueue()` call brings
 * its own processor explorer, so registering queues in several modules makes
 * every processor bind twice ("Cannot define the same handler twice").
 */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'verification' }, { name: 'imports' }, { name: 'readiness' })],
  exports: [BullModule],
})
export class QueuesModule {}
