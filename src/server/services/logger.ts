/**
 * Logger proactivo para el servidor Nitro
 * 
 * Proporciona logging estructurado para:
 * - Tiempos de respuesta de proveedores externos
 * - Errores con contexto
 * - Métricas de rendimiento
 */

export interface LogContext {
  endpoint?: string;
  provider?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_PREFIX = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  debug: '[DEBUG]',
} as const;

const isDevelopment = process.env['NODE_ENV'] !== 'production';

/**
 * Genera un timestamp ISO para los logs
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formatea el mensaje del log con contexto estructurado
 */
function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const prefix = LOG_PREFIX[level];
  const timestamp = getTimestamp();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  
  return `${timestamp} ${prefix} ${message}${contextStr}`;
}

/**
 * Logger base
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  // En producción, solo logueamos warn y error
  if (!isDevelopment && (level === 'info' || level === 'debug')) {
    return;
  }

  const formattedMessage = formatMessage(level, message, context);

  switch (level) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'info':
    case 'debug':
      console.log(formattedMessage);
      break;
  }
}

/**
 * Logger para inicio de petición de proveedor externo
 */
export function logProviderStart(
  provider: string,
  endpoint: string,
  params?: Record<string, unknown>,
): void {
  log('info', `Provider request started: ${provider}`, {
    provider,
    endpoint,
    ...params,
  });
}

/**
 * Logger para finalización de petición de proveedor externo
 */
export function logProviderSuccess(
  provider: string,
  endpoint: string,
  duration: number,
  itemCount?: number,
): void {
  const context: LogContext = {
    provider,
    endpoint,
    duration: `${duration}ms`,
  };

  if (itemCount !== undefined) {
    context.itemCount = itemCount;
  }

  // Loguear como warn si la duración es mayor a 1 segundo
  const level: LogLevel = duration > 1000 ? 'warn' : 'info';
  
  log(level, `Provider request completed: ${provider}`, {
    ...context,
    status: 'success',
  });
}

/**
 * Logger para error de proveedor externo
 */
export function logProviderError(
  provider: string,
  endpoint: string,
  error: unknown,
  duration: number,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error && 'code' in error ? error.code : null;

  log('error', `Provider request failed: ${provider}`, {
    provider,
    endpoint,
    duration: `${duration}ms`,
    error: errorMessage,
    errorCode,
    status: 'error',
  });
}

/**
 * Logger para errores de API
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  statusCode: number,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  log('error', `API error: ${endpoint}`, {
    endpoint,
    statusCode,
    error: errorMessage,
  });

  // Loguear stack trace en desarrollo
  if (isDevelopment && stack) {
    console.error(stack);
  }
}

/**
 * Logger para métricas de rendimiento
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: string = 'ms',
  context?: LogContext,
): void {
  const level: LogLevel = value > 1000 ? 'warn' : 'info';
  
  log(level, `Performance metric: ${metric}`, {
    metric,
    value: `${value}${unit}`,
    ...context,
  });
}

/**
 * Middleware para medir tiempo de respuesta
 */
export function createTimingMiddleware() {
  return {
    start: (): number => Date.now(),
    
    end: (
      startTime: number,
      provider: string,
      endpoint: string,
      success: boolean,
      error?: unknown,
      itemCount?: number,
    ): number => {
      const duration = Date.now() - startTime;
      
      if (success) {
        logProviderSuccess(provider, endpoint, duration, itemCount);
      } else if (error) {
        logProviderError(provider, endpoint, error, duration);
      }
      
      return duration;
    },
  };
}

/**
 * Logger para caché
 */
export function logCache(
  action: 'hit' | 'miss' | 'set',
  cacheKey: string,
  cacheName: string,
): void {
  log('debug', `Cache ${action}: ${cacheName}`, {
    action,
    cacheKey,
    cacheName,
  });
}

/**
 * Logger para eventos del servidor
 */
export function logServerEvent(
  event: string,
  details?: Record<string, unknown>,
): void {
  log('info', `Server event: ${event}`, details);
}
