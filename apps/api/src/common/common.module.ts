import { Module, Global } from '@nestjs/common';
import { AdminConfigurationController } from './admin-configuration.controller.js';

/**
 * CommonModule — shared providers, guards, interceptors, filters, pipes.
 * Marked @Global so common utilities are available throughout the app.
 * Add shared services here as the project grows.
 */
@Global()
@Module({
  controllers: [AdminConfigurationController],
  providers: [],
  exports: [],
})
export class CommonModule {}
