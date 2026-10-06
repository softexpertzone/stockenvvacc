import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, adjustStock } from '@/api/inventory/inventoryApi';

export const useInventory = () => {
    const queryClient = useQueryClient();

    // 1. Standard Inventory Query
    const inventoryQuery = useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory,
    });

    // 2. NEW: Detailed Hierarchical Inventory Query
    const detailedInventoryQuery = useQuery({
        queryKey: ['inventory', 'detailed'],
        queryFn: async () => {
            const res = await fetch('http://localhost:5000/api/inventory/detailed');
            if (!res.ok) throw new Error('Failed to fetch detailed inventory');
            const json = await res.json();
            return json.data;
        },
    });

    // 3. Mutation (Auto-refreshes both queries on success)
    const mutation = useMutation({
        mutationFn: adjustStock,
        onSuccess: () => {
            queryClient.invalidateQueries(['inventory']);
        },
    });

    return {
        ...inventoryQuery,
        detailedInventory: detailedInventoryQuery.data,
        isDetailedLoading: detailedInventoryQuery.isLoading,
        moveStock: mutation.mutate,
        isMoving: mutation.isPending
    };
};