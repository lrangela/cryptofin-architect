import { setResponseStatus, type H3Event } from 'h3';

export function jsonError<TErrorCode extends string>(
  event: H3Event,
  statusCode: number,
  errorCode: TErrorCode,
  message: string,
): { errorCode: TErrorCode; message: string } {
  setResponseStatus(event, statusCode);

  return {
    errorCode,
    message,
  };
}
