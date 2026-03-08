import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Initialize Sentry (no-op if SENTRY_DSN is not set)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Activer CORS pour localhost, 127.0.0.1 et les origines configurées via ALLOWED_ORIGINS
  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => callback(null, true), // Reflection origin
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,Bypass-Tunnel-Reminder',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Events & Wedding Marketplace API')
    .setDescription(
      "API complète pour la marketplace d'événements et de mariage",
    )
    .setVersion('1.0')
    .addTag('users')
    .addTag('categories')
    .addTag('providers')
    .addTag('services')
    .addTag('events')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Écouter sur toutes les interfaces
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
