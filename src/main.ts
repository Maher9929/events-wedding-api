import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
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

  // Security: HTTP headers (XSS, clickjacking, MIME sniffing)
  app.use(helmet());

  // CORS: only allow known origins (localhost dev + configured domains)
  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    ...extraOrigins,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,Bypass-Tunnel-Reminder',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger configuration — disabled in production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Doha Events — Wedding & Events Marketplace API')
      .setDescription(
        'Full API for the events & wedding marketplace',
      )
      .setVersion('1.0')
      .addTag('users')
      .addTag('categories')
      .addTag('providers')
      .addTag('services')
      .addTag('events')
      .addTag('bookings')
      .addTag('reviews')
      .addTag('quotes')
      .addTag('messages')
      .addTag('disputes')
      .addTag('notifications')
      .addTag('payments')
      .addTag('moderation')
      .addTag('provider-analytics')
      .addTag('storage')
      .addTag('admin')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Listen on all network interfaces
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
