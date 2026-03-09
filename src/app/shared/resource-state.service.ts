import { signal, computed, Signal } from '@angular/core';

/**
 * Tipos de estado para recursos asíncronos
 */
export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'refreshing'; data: T }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; data?: T };

/**
 * Opciones para crear el estado
 */
export interface ResourceStateOptions {
  /** Mensaje de error por defecto */
  defaultError?: string;
  /** Datos iniciales opcionales */
  initialData?: unknown;
}

/**
 * Servicio de estado estructural para manejar estados de loading, error y empty
 * usando Signals de Angular.
 * 
 * @example
 * ```typescript
 * readonly state = createResourceState();
 * 
 * // Actualizar estado
 * this.state.setLoading();
 * this.state.setSuccess(data);
 * this.state.setError('Error al cargar');
 * 
 * // Leer estado
 * @if (state.isIdle()) { ... }
 * @if (state.isLoading()) { ... }
 * @if (state.isSuccess()) { ... }
 * @if (state.isError()) { ... }
 * ```
 */
export function createResourceState<T = unknown>(
  options: ResourceStateOptions = {}
): ResourceStateService<T> {
  const state = signal<ResourceState<T>>({ status: 'idle' });

  const isIdle = computed(() => state().status === 'idle');
  const isLoading = computed(() => state().status === 'loading');
  const isRefreshing = computed(() => state().status === 'refreshing');
  const isSuccess = computed(() => state().status === 'success');
  const isError = computed(() => state().status === 'error');
  const hasData = computed(() => {
    const s = state();
    return (s.status === 'success' || s.status === 'refreshing' || s.status === 'error') && 
           s.data !== undefined;
  });
  const isEmpty = computed(() => {
    const s = state();
    if (s.status === 'success' || s.status === 'refreshing') {
      const data = s.data as T;
      if (Array.isArray(data)) {
        return data.length === 0;
      }
      return data === null || data === undefined;
    }
    return false;
  });
  const data = computed(() => {
    const s = state();
    if (s.status === 'success' || s.status === 'refreshing' || s.status === 'error') {
      return s.data;
    }
    return undefined;
  });
  const error = computed(() => {
    const s = state();
    if (s.status === 'error') {
      return s.error;
    }
    return null;
  });

  return {
    state: state.asReadonly(),
    isIdle,
    isLoading,
    isRefreshing,
    isSuccess,
    isError,
    hasData,
    isEmpty,
    data,
    error,
    
    setIdle: () => state.set({ status: 'idle' }),
    
    setLoading: () => {
      const current = state();
      if (current.status === 'success' || current.status === 'refreshing') {
        state.set({ status: 'refreshing', data: current.data } as ResourceState<T>);
      } else {
        state.set({ status: 'loading' });
      }
    },
    
    setSuccess: (data: T) => state.set({ status: 'success', data }),
    
    setError: (error: string, existingData?: T) => {
      const currentState = state();
      state.set({
        status: 'error',
        error: error || options.defaultError || 'Error desconocido',
        ...(existingData ?? currentState.status === 'success' || currentState.status === 'refreshing' 
          ? { data: (currentState as any).data } 
          : {})
      } as ResourceState<T>);
    },
    
    setEmpty: () => {
      const emptyData = Array.isArray(options.initialData) ? [] : null;
      state.set({ status: 'success', data: emptyData as T });
    },
    
    reset: () => state.set({ status: 'idle' }),
  };
}

/**
 * Interfaz del servicio de estado
 */
export interface ResourceStateService<T> {
  /** Signal de solo lectura del estado completo */
  readonly state: Signal<ResourceState<T>>;
  
  /** Computados de estado */
  readonly isIdle: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly isRefreshing: Signal<boolean>;
  readonly isSuccess: Signal<boolean>;
  readonly isError: Signal<boolean>;
  readonly hasData: Signal<boolean>;
  readonly isEmpty: Signal<boolean>;
  
  /** Datos y error */
  readonly data: Signal<T | undefined>;
  readonly error: Signal<string | null>;
  
  /** Métodos para actualizar el estado */
  setIdle: () => void;
  setLoading: () => void;
  setSuccess: (data: T) => void;
  setError: (error: string, existingData?: T) => void;
  setEmpty: () => void;
  reset: () => void;
}
