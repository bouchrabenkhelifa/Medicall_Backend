import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    PrescriptionsModule,
  ],
})
export class AppModule {}
