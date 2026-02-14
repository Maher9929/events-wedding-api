import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
