import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions, type QueryKey, useInfiniteQuery, UseSuspenseQueryOptions, useSuspenseQuery } from '@tanstack/react-query'
// import { useMutation, useSuspenseQuery, type UseMutationOptions, type UseSuspenseQueryOptions, type QueryKey } from '@tanstack/react-query'
import { apiInstance } from '@shared/api/base'
import type { AxiosError } from 'axios'
import { UseApiOptions } from './useApi'

export type ApiError = {
  message: string
  status?: number
  data?: any
}

export const useApiQuery = <TData>(
  queryKey: QueryKey,
  endpoint: string | (() => string),
  options?: UseQueryOptions<TData, ApiError>
) => {
  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      const url = typeof endpoint === "function" ? endpoint() : endpoint;
      const response = await apiInstance.get<TData>(url);
      return response
    },
    ...options,
  })
}

export const useApiSuspenseQuery = <TData>(
  queryKey: QueryKey,
  endpoint: string | (() => string),
  options?: UseSuspenseQueryOptions<TData, ApiError>
) => {
  return useSuspenseQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      const url = typeof endpoint === "function" ? endpoint() : endpoint;
      const response = await apiInstance.get<TData>(url);
      return response
    },
    ...options,
  })
}

export const useApiMutation = <TData, TVariables>(
  url: string,
  method: string,
  options?: {
    urlTransform?: (variables: TVariables) => string;
    onMutate?: (variables: TVariables) => Promise<any>;
    onError?: (error: any, variables: TVariables, context: any) => void;
  }
) => {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables) => {
      const transformedUrl = options?.urlTransform 
        ? options.urlTransform(variables) 
        : url;
      const response = await apiInstance[method]<TData>(transformedUrl, variables)
      return response
    },
    throwOnError: true
  });
};


export const useApiInfiniteQuery = <TData>(
  queryKey: QueryKey,
  endpoint: string | (() => string),
  getNextPageParam: (lastPage: any, allPages: any) => number | null
) => {
  return useInfiniteQuery<TData>({
    queryKey,
    queryFn: async ({ pageParam = null}) => {
      const url = typeof endpoint === "function" ? endpoint() : endpoint;
      const response =  pageParam 
        ? await apiInstance.get<TData>(`${url}&cursor=${pageParam}`) 
        : await apiInstance.get<TData>(`${url}`);
      return response;
    },
    throwOnError: true,
    getNextPageParam,
    initialPageParam: null,
  });
};