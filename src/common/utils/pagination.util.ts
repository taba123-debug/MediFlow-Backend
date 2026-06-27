import { PaginationQueryDto } from '../dto/pagination-query.dto';

export const buildPagination = (query: PaginationQueryDto) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

export const buildPaginatedResponse = <T>(data: T[], total: number, query: PaginationQueryDto) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
