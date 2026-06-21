import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{ status: (status: number) => { send: (body: unknown) => void } }>();
    const isHttp = error instanceof HttpException;
    const status = isHttp ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? error.getResponse() : { message: 'Internal server error' };

    response.status(status).send({
      statusCode: status,
      ...(typeof payload === 'object' ? payload : { message: payload }),
    });
  }
}
