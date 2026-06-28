console.log('Starting app...');

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { buildValidationException } from './common/utils/validation.util';

async function bootstrap() {
  console.log('Inside bootstrap');
  try {
    const app = await NestFactory.create(AppModule);
    console.log('App created');
    const configService = app.get(ConfigService);

    app.enableCors({
      origin: configService.get<string>('app.frontendUrl'),
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: buildValidationException,
      }),
    );
    app.useGlobalFilters(new AppExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Doctor Booking Management API')
      .setDescription('Production-ready backend APIs for the doctor booking management system.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(configService.get<string>('app.swaggerPath') ?? 'docs', app, document);
    const port = configService.get<number>('app.port') ?? 4000;
    console.log('Listening on port', port);
    await app.listen(port);
    console.log('Server started');
  } catch (e) {
    console.error('Error:', e);
  }
}
bootstrap().catch(e => console.error('Bootstrap error:', e));
