import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in expected format (e.g. paginated response), return as is
        if (data && data.data && data.total !== undefined) {
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            message: 'Success',
            ...data,
          };
        }

        // If data is Auth response (access_token), return as is or wrap?
        // Let's wrap standard responses
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: 'Success',
          data: data,
        };
      }),
    );
  }
}
