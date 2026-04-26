import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        // Handle ValidationPipe array messages
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          validationErrors = resp.message;
        } else {
          message = resp.message || exception.message;
        }
      }
    } else if (exception instanceof Error) {
      // In production, hide raw error details for non-HTTP exceptions
      message = this.isProduction ? 'Internal server error' : exception.message;
    }

    // Log the full error (always, regardless of environment)
    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Report non-HTTP 5xx errors to Sentry
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('statusCode', status);
        scope.setExtra('body', request.body);
        Sentry.captureException(exception);
      });
    }

    const body: Record<string, any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    // Include validation details for 4xx errors
    if (validationErrors) {
      body.errors = validationErrors;
    }

    // Include stack trace only in development for debugging
    if (!this.isProduction && exception instanceof Error) {
      body.stack = exception.stack;
    }

    response.status(status).json(body);
  }
}
