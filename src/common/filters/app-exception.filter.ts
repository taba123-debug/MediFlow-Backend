import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const payload = this.buildPrismaErrorPayload(exception);
      response.status(payload.statusCode).json(payload);
      return;
    }

    if (exception instanceof HttpException) {
      const payload = this.buildHttpErrorPayload(exception);
      response.status(payload.statusCode).json(payload);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  private buildHttpErrorPayload(exception: HttpException) {
    const statusCode = exception.getStatus();
    const rawResponse = exception.getResponse();

    if (typeof rawResponse === 'string') {
      return {
        statusCode,
        message: rawResponse,
      };
    }

    if (this.isObject(rawResponse)) {
      const responseObject = rawResponse as Record<string, unknown>;
      const message = this.normalizeMessage(responseObject.message, statusCode);
      const errors = this.isObject(responseObject.errors)
        ? (responseObject.errors as Record<string, string[]>)
        : undefined;

      return {
        statusCode,
        message,
        ...(errors ? { errors } : {}),
      };
    }

    return {
      statusCode,
      message: this.defaultMessageForStatus(statusCode),
    };
  }

  private buildPrismaErrorPayload(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = Array.isArray(exception.meta?.target)
          ? (exception.meta?.target as string[])
          : [];
        const field = target[0];

        if (field) {
          return {
            statusCode: HttpStatus.CONFLICT,
            message: `${this.toLabel(field)} already exists`,
            errors: {
              [field]: [`${this.toLabel(field)} already exists`],
            },
          };
        }

        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with the same value already exists',
        };
      }

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Requested record was not found',
        };

      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database request failed',
        };
    }
  }

  private normalizeMessage(message: unknown, statusCode: number) {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return this.defaultMessageForStatus(statusCode);
  }

  private defaultMessageForStatus(statusCode: number) {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Request failed';
    }
  }

  private toLabel(value: string) {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .toLowerCase();
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
