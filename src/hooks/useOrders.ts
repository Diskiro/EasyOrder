import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface OrderItem {
    id: number
    product_id: number
    quantity: number
    unit_price: number
    notes: string
    product: {
        name: string
    }
}

export interface Order {
    id: number
    table_id: number
    status: 'pending' | 'cooking' | 'ready' | 'delivered' | 'completed' | 'cancelled'
    total_amount: number
    created_at: string
    table: {
        number: string
    }
    items: OrderItem[]
}

export function useActiveOrders() {
    return useQuery({
        queryKey: ['orders', 'active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
          *,
          table:tables(number),
          items:order_items(
            *,
            product:products(name)
          )
        `)
                .in('status', ['pending', 'cooking', 'ready'])
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as any[] // Supabase types are complex with joins, casting to any for simplicity temporarily
        },
        refetchInterval: 5000 // Poll every 5 seconds for new orders
    })
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
            const { data, error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', orderId)
                .select()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })
}
