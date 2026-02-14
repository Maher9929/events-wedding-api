import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activer CORS pour localhost
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Events & Wedding Marketplace API')
    .setDescription('API complète pour la marketplace d\'événements et de mariage')
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
