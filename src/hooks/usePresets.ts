import { useQuery } from '@tanstack/react-query'
import { getPresets } from '@/lib/presets'

export function usePresets(userId: string | undefined) {
  return useQuery({
    queryKey: ['presets', userId],
    queryFn: () => getPresets(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
