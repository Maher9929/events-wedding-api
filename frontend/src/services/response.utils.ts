export type ListResponse<T> = T[] | { data?: T[]; total?: number } | null | undefined;

export const unwrapList = <T>(response: ListResponse<T>): T[] => {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? [];
};

export const unwrapTotal = <T>(response: ListResponse<T>): number => {
  if (Array.isArray(response)) {
    return response.length;
  }

  return response?.total ?? response?.data?.length ?? 0;
};
