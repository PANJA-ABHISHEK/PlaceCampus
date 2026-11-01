import { Module, Global } from '@nestjs/common';

/**
 * CommonModule — shared providers, guards, interceptors, filters, pipes.
 * Marked @Global so common utilities are available throughout the app.
 * Add shared services here as the project grows.
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class CommonModule {}
