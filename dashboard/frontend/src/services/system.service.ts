import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { livenessSchema, readinessSchema } from '@/schemas/system.schema';

export const systemService = {
  async getLiveness() {
    const { data } = await api.get(endpoints.health.live, { schema: livenessSchema });
    return data;
  },
  async getReadiness() {
    const { data } = await api.get(endpoints.health.ready, { schema: readinessSchema });
    return data;
  },
};
