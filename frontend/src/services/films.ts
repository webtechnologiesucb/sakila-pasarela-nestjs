import { api } from '../api/client';
import type { Category, Film, Paginated } from '../types';
import { unwrap } from './utils';

export interface FilmFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
}

export const filmsService = {
  async list(filters: FilmFilters = {}): Promise<Paginated<Film>> {
    const response = await api.get('/films', { params: filters });
    return response.data as Paginated<Film>;
  },

  async get(id: number): Promise<Film> {
    const response = await api.get(`/films/${id}`);
    return unwrap<Film>(response);
  },

  async categories(): Promise<Category[]> {
    const response = await api.get('/films/categories');
    return unwrap<Category[]>(response);
  },
};
