import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusMap: Record<string, number> = {
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
    };

    const status = statusMap[exception.code] ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      errorCode: exception.code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
