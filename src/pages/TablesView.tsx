
import React, { useState, useMemo } from 'react'
import { useUI } from '../context/UIContext'
import { useTables, useCategories, useProducts, useOrderMutation, useActiveOrders, useUpdateOrderItems, useReservationMutations, useTableMutations, type Product, type Reservation, type Table } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { Search, ShoppingCart, Plus, Minus, CheckCircle, LayoutGrid, List as ListIcon, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { Button, Stack, ButtonGroup } from '@mui/material'
import { useLocation } from 'react-router-dom'

// Cart Item Type
interface CartItem extends Product {
    quantity: number
}

export default function TablesView() {
    const { showAlert, showConfirm } = useUI()
    const { user } = useAuth()
    const location = useLocation()
    const { data: tables, isLoading: loadingTables } = useTables()
    const { data: categories, isLoading: loadingCats } = useCategories()
    const { data: products, isLoading: loadingProds } = useProducts()

    // Fetch active orders to find if selected table has one
    const { data: activeOrders } = useActiveOrders()

    const createOrder = useOrderMutation()
    const updateOrderItems = useUpdateOrderItems() // New mutation

    const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
    const selectedTable = tables?.find(t => t.id === selectedTableId)
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isCartOpen, setIsCartOpen] = useState(false)

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null)

    const { updateReservation } = useReservationMutations()
    const { updateTable } = useTableMutations()

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return []
        let result = products
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p => p.name.toLowerCase().includes(query))
        }
        return result
    }, [products, searchQuery])

    // Derived state: Is there an active order for the selected table?
    const activeOrder = useMemo(() => {
        if (!selectedTableId || !activeOrders) return null
        return activeOrders.find(o => o.table_id === selectedTableId && o.status !== 'completed' && o.status !== 'cancelled')
    }, [selectedTableId, activeOrders])

    // Effect: Handle navigation from OrdersView (Edit Order) or ReservationsView (Assign Table)
    React.useEffect(() => {
        if (location.state) {
            const state = location.state as any
            if (state.tableId) {
                setSelectedTableId(Number(state.tableId))
            }
            if (state.assignReservation) {
                setAssigningReservation(state.assignReservation)
            }
        }
    }, [location.state])

    // Effect: Load active order into cart when selecting a table
    React.useEffect(() => {
        if (activeOrder && products) {
            // Map existing order items to CartItem format
            const existingItems: CartItem[] = activeOrder.order_items?.map(item => {
                const product = products.find(p => p.id === item.product_id)
                if (!product) return null
                return {
                    ...product,
                    quantity: item.quantity
                }
            }).filter(Boolean) as CartItem[] || []

            setCart(existingItems)
        } else if (!activeOrder) {
            // Reset cart if no active order (New Order mode)
            setCart([])
        }
    }, [activeOrder, products])

    // Check permissions
    const { role } = useAuth()
    const isEditing = !!activeOrder
    const canEdit = !isEditing || (isEditing && role === 'admin') // Only admins can edit active orders

    const handleAddToOrder = (product: Product) => {
        if (!canEdit) return // Block adding items if restricted
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    const handleUpdateQuantity = (itemId: number, delta: number) => {
        if (!canEdit) return // Block updating quantity if restricted
        setCart(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQuantity = Math.max(0, item.quantity + delta)
                return { ...item, quantity: newQuantity }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
    }, [cart])

    const handleSubmitOrder = async () => {
        if (!selectedTableId || !user) return
        if (!canEdit) return

        if (cart.length === 0) {
            showAlert('No se puede crear una orden vacía. Agrega productos.', 'warning')
            return
        }

        try {
            if (activeOrder) {
                await updateOrderItems.mutateAsync({
                    orderId: activeOrder.id,
                    items: cart.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                })
                showAlert('Orden actualizada con éxito!', 'success')
            } else {
                await createOrder.mutateAsync({
                    tableId: selectedTableId,
                    serverId: user.id,
                    items: cart.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                })
                showAlert('Orden creada con éxito!', 'success')
            }

            setCart([])
            setSelectedTableId(null)
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar la orden', 'error')
        }
    }

    const handleTableClick = async (table: Table) => {
        if (assigningReservation) {
            if (table.status === 'occupied') {
                showAlert('Esta mesa está ocupada. Selecciona una libre.', 'warning')
                return
            }

            const confirmed = await showConfirm('Confirmar Asignación', `¿Asignar a ${assigningReservation.customer_name} a la mesa ${table.number}?`)

            if (confirmed) {
                try {
                    await updateTable.mutateAsync({ id: table.id, updates: { status: 'occupied' } })
                    await updateReservation.mutateAsync({
                        id: assigningReservation.id,
                        updates: {
                            status: 'completed',
                            table_id: table.id
                        }
                    })
                    setAssigningReservation(null)
                    showAlert('Cliente asignado correctamente', 'success')
                    setSelectedTableId(table.id)
                } catch (error) {
                    console.error(error)
                    showAlert('Error al asignar mesa', 'error')
                }
            }
        } else {
            setSelectedTableId(table.id)
        }
    }

    const cancelAssigning = () => {
        setAssigningReservation(null)
    }

    // Calculate total items for badge
    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])

    // Reusable Cart UI
    const renderCart = (isMobile: boolean = false) => (
        <div className={clsx(
            "bg-[#1F2329] border border-gray-800 flex flex-col shadow-2xl",
            isMobile ? "fixed inset-0 z-50 w-full h-full" : "w-80 rounded-2xl h-full"
        )}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1F2329] shrink-0"
                style={isMobile ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : { borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                <h3 className="font-bold text-white flex items-center gap-2">
                    {isMobile && (
                        <Button onClick={() => setIsCartOpen(false)} sx={{ color: 'gray', minWidth: 'auto', p: 1, mr: 1 }}>
                            <ChevronLeft size={24} />
                        </Button>
                    )}
                    <ShoppingCart size={18} />
                    {activeOrder ? `Orden #${activeOrder.id} ` : 'Orden Actual'}
                </h3>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{totalItems} art.</span>
            </div>

            {/* Warning Banner */}
            {!canEdit && (
                <div className="bg-red-500/20 text-red-200 px-4 py-2 text-xs font-bold border-b border-red-500/20 flex items-center justify-center shrink-0">
                    <div className="mr-2">Solo Lectura</div>
                    Requiere acceso de administrador
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 && (
                    <div className="text-center text-gray-500 mt-10 p-4">
                        <p className="mb-2">El carrito está vacío</p>
                        <p className="text-xs">Selecciona productos del menú para agregar.</p>
                    </div>
                )}
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[#141619] p-3 rounded-lg border border-gray-800">
                        <div className="flex-1 min-w-0 mr-2">
                            <div className="text-sm font-bold text-gray-300 truncate">{item.name}</div>
                            <div className="text-xs text-[#FBBF24]">${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center bg-gray-800 rounded">
                            <Button size="small" disabled={!canEdit} onClick={() => handleUpdateQuantity(item.id, -1)} sx={{ minWidth: 32, p: 0.5, color: 'gray' }}><Minus size={12} /></Button>
                            <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                            <Button size="small" disabled={!canEdit} onClick={() => handleUpdateQuantity(item.id, 1)} sx={{ minWidth: 32, p: 0.5, color: 'gray' }}><Plus size={12} /></Button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-[#141619] border-t border-gray-800 shrink-0"
                style={isMobile ? { paddingBottom: '2rem' } : { borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}>
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-400 text-sm">Total a pagar</span>
                    <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmitOrder}
                    disabled={createOrder.isPending || updateOrderItems.isPending || !canEdit || cart.length === 0}
                    sx={{ color: 'black', fontWeight: 'bold' }}
                >
                    {createOrder.isPending || updateOrderItems.isPending
                        ? 'Procesando...'
                        : !canEdit
                            ? 'SOLO LECTURA'
                            : (activeOrder ? 'ACTUALIZAR ORDEN' : 'CONFIRMAR PEDIDO')}
                </Button>
            </div>
        </div>
    )

    if (loadingTables || loadingCats || loadingProds) return <div className="p-8 text-white">Cargando datos...</div>

    return (
        <div className="flex flex-col h-full bg-[#111315] font-sans text-gray-200 overflow-hidden relative">

            {/* Assignment Overlay Banner */}
            {assigningReservation && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white z-50 p-4 shadow-xl flex justify-between items-center animate-bounce-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={20} className="animate-pulse" />
                        <span className="font-bold">MODO ASIGNACIÓN: Selecciona una mesa para {assigningReservation.customer_name} ({assigningReservation.pax} Pax)</span>
                    </div>
                    <Button variant="contained" color="inherit" size="small" onClick={cancelAssigning} sx={{ color: 'blue', bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' } }}>
                        Cancelar
                    </Button>
                </div>
            )}


            {/* RIGHT PANEL */}
            <div className="flex-1 flex flex-col bg-[#111315] relative min-h-0">

                {/* Top Bar */}
                <header className="h-16 border-b border-gray-800 flex justify-between items-center px-4 md:px-6 bg-[#141619] shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">RESTAURANTE</h1>
                    </div>

                    <div className="flex-1 max-w-md mx-4 hidden md:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar mesa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1F2329] border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#FBBF24] transition-colors text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex bg-[#1F2329] rounded-lg p-1">
                            {/* Toggle View Mode using MUI Buttons */}
                            <ButtonGroup variant="text" color="inherit" size="small">
                                <Button onClick={() => setViewMode('grid')} sx={{ color: viewMode === 'grid' ? 'white' : 'gray', minWidth: 40 }}><LayoutGrid size={18} /></Button>
                                <Button onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? 'white' : 'gray', minWidth: 40 }}><ListIcon size={18} /></Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8 relative">

                    {!selectedTableId ? (
                        <>
                            {viewMode === 'grid' ? (
                                /* TABLE MAP GRID */
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
                                    {tables?.map(table => (
                                        <button
                                            key={table.id}
                                            onClick={() => handleTableClick(table)} // Changed handler to support assignment
                                            className={clsx(
                                                "aspect-square rounded-2xl relative group transition-all duration-300 hover:scale-[1.02]",
                                                "bg-[#1F2329]"
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute inset-2 md:inset-4 rounded-xl flex flex-col items-center justify-center border-2 transition-all shadow-xl",
                                                table.status === 'occupied'
                                                    ? "border-pink-500/50 bg-pink-500/10"
                                                    : assigningReservation ? "border-blue-500/50 bg-blue-500/10 cursor-alias animate-pulse" : "border-green-500/50 bg-green-500/10"
                                            )}>
                                                <div className={clsx(
                                                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1 md:mb-2 shadow-lg",
                                                    table.status === 'occupied' ? "bg-pink-500 text-white" : assigningReservation ? "bg-blue-500 text-white" : "bg-green-500 text-white"
                                                )}>
                                                    <span className="text-lg md:text-xl font-bold">{table.number}</span>
                                                </div>
                                                <span className={clsx("text-[10px] md:text-xs font-bold uppercase", table.status === 'occupied' ? "text-pink-400" : assigningReservation ? "text-blue-400" : "text-green-400")}>
                                                    {table.status === 'occupied' ? 'Ocupada' : assigningReservation ? 'Asignar' : 'Disponible'}
                                                </span>
                                            </div>
                                            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded">{table.capacity} Pax</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* LIST VIEW (Alternative to Grid) */
                                <div className="bg-[#1F2329] rounded-2xl p-6 border border-gray-800">
                                    <h2 className="text-xl font-bold text-white mb-4">Vista de Lista</h2>
                                    <div className="grid gap-4">
                                        {tables?.map(table => (
                                            <div key={table.id} onClick={() => handleTableClick(table)} className="flex items-center justify-between p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-600 cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                                        table.status === 'occupied' ? "bg-pink-500 text-white" : "bg-green-500 text-white"
                                                    )}>
                                                        {table.number}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-200">Mesa {table.number}</div>
                                                        <div className="text-sm text-gray-500">{table.capacity} Personas</div>
                                                    </div>
                                                </div>
                                                <div className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase", table.status === 'occupied' ? "bg-pink-500/20 text-pink-400" : "bg-green-500/20 text-green-400")}>
                                                    {table.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* ORDER VIEW */
                        <div className="flex h-full gap-6 animate-fade-in relative">
                            {/* Product List */}
                            <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sticky top-0 bg-[#111315] z-20 py-4 -mt-4 border-b border-gray-800/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Button onClick={() => setSelectedTableId(null)} sx={{ color: 'gray', minWidth: 40, borderRadius: '50%' }}>
                                            <ChevronLeft size={24} />
                                        </Button>
                                        <h2 className="text-2xl font-bold text-white whitespace-nowrap">
                                            Mesa {selectedTable?.number}
                                        </h2>
                                        {selectedTable?.status === 'occupied' && !activeOrder && (
                                            <Button
                                                variant="outlined"
                                                color="warning"
                                                size="small"
                                                onClick={async () => {
                                                    if (await showConfirm('¿Liberar mesa?', 'Esta mesa está marcada como ocupada pero no tiene órdenes activas. ¿Liberarla ahora?')) {
                                                        await updateTable.mutateAsync({ id: selectedTable!.id, updates: { status: 'available' } })
                                                        showAlert('Mesa liberada', 'success')
                                                        setSelectedTableId(null)
                                                    }
                                                }}
                                                className="ml-auto"
                                            >
                                                Liberar Mesa
                                            </Button>
                                        )}
                                    </div>

                                    <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                                        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content', px: 0.5 }}>
                                            <Button
                                                variant={selectedCategory === null ? "contained" : "outlined"}
                                                color="primary"
                                                onClick={() => setSelectedCategory(null)}
                                                sx={{ borderRadius: 8, whiteSpace: 'nowrap', color: selectedCategory === null ? 'black' : 'gray', borderColor: 'gray', minWidth: 'auto', px: 3 }}
                                            >
                                                Todas
                                            </Button>
                                            {categories?.map(c => (
                                                <Button
                                                    key={c.id}
                                                    variant={selectedCategory === c.id ? "contained" : "outlined"}
                                                    color="primary"
                                                    onClick={() => setSelectedCategory(c.id)}
                                                    sx={{ borderRadius: 8, whiteSpace: 'nowrap', color: selectedCategory === c.id ? 'black' : 'gray', borderColor: 'gray', minWidth: 'auto', px: 3 }}
                                                >
                                                    {c.name}
                                                </Button>
                                            ))}
                                        </Stack>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {(selectedCategory
                                        ? categories?.filter(c => c.id === selectedCategory)
                                        : categories
                                    )?.map(category => {
                                        const categoryProducts = filteredProducts.filter(p => p.category_id === category.id)

                                        if (categoryProducts.length === 0) return null

                                        return (
                                            <div key={category.id} className="mb-6">
                                                <h3 className="text-lg font-bold text-[#FBBF24] mb-3 sticky top-0 bg-[#111315] py-2 z-10 border-b border-gray-800">
                                                    {category.name}
                                                </h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {categoryProducts.map(product => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => handleAddToOrder(product)}
                                                            disabled={!canEdit} // Disable if restricted
                                                            className={clsx(
                                                                "group text-left bg-[#1F2329] p-4 rounded-xl border border-transparent transition-all relative overflow-hidden",
                                                                canEdit
                                                                    ? "hover:border-[#FBBF24]/50 hover:bg-[#252a30] cursor-pointer"
                                                                    : "opacity-50 cursor-not-allowed grayscale"
                                                            )}
                                                        >
                                                            {canEdit && (
                                                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="bg-[#FBBF24] text-black p-1 rounded-full"><Plus size={14} /></div>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h3 className="font-bold text-gray-200 line-clamp-1 mr-2">{product.name}</h3>
                                                                <span className="text-[#FBBF24] font-mono font-bold text-sm">${product.price}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mb-0 line-clamp-2 h-8">{product.description}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Desktop static Cart */}
                            <div className="hidden lg:flex w-80 h-full">
                                {renderCart(false)}
                            </div>

                            {/* Mobile Cart Modal/Drawer */}
                            {isCartOpen && (
                                <div className="lg:hidden fixed inset-0 z-50 flex flex-col animate-slide-in-right">
                                    {renderCart(true)}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Mobile Cart Toggle Button (Floating) - Outside scroll area */}
                {selectedTableId && (
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-[#141619] border-t border-gray-800 z-30">
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => setIsCartOpen(true)}
                            sx={{ color: 'black', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', px: 3 }}
                        >
                            <span className="flex items-center gap-2 text-black">
                                <ShoppingCart size={20} className="text-black" />
                                <span className="text-black">Ver Orden ({totalItems})</span>
                            </span>
                            <span className="text-black">${cartTotal.toFixed(2)}</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
