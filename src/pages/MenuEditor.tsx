import React, { useState } from 'react'
import { useProducts, useCategories, useProductMutations, useCategoryMutations, type Product, type Category } from '../hooks/useData'
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search } from 'lucide-react'
import clsx from 'clsx'
import { Button, IconButton, Stack, TextField, Box, InputLabel, FormControl, NativeSelect, Grid } from '@mui/material'
import { useUI } from '../context/UIContext'

export default function MenuEditor() {
    const { showAlert, showConfirm } = useUI()
    const { data: products, isLoading: productsLoading } = useProducts()
    const { data: categories, isLoading: categoriesLoading } = useCategories()
    const { createProduct, updateProduct, deleteProduct } = useProductMutations()
    const { createCategory, updateCategory, deleteCategory } = useCategoryMutations()

    // Product State
    const [isEditing, setIsEditing] = useState<Product | null>(null)
    const [isCreating, setIsCreating] = useState(false) // For Products
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)

    // Category Management State
    const [isManagingCategories, setIsManagingCategories] = useState(false)
    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({ name: '', sort_order: 0, type: 'food' })
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    // Product Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        description: '',
        price: 0,
        category_id: 0,
        image_url: '',
        is_active: true
    })

    // --- Product Handlers ---

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: 0,
            category_id: categories?.[0]?.id || 0,
            image_url: '',
            is_active: true
        })
        setIsEditing(null)
        setIsCreating(false)
    }

    const handleEdit = (product: Product) => {
        // Ensure we close Category Manager if open
        setIsManagingCategories(false)
        setFormData(product)
        setIsEditing(product)
        setIsCreating(false)
    }

    const handleCreate = () => {
        setIsManagingCategories(false)
        resetForm()
        setIsCreating(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (isEditing && isEditing.id) {
                await updateProduct.mutateAsync({ id: isEditing.id, updates: formData })
                showAlert('Producto actualizado correctamente', 'success')
            } else {
                // @ts-ignore
                await createProduct.mutateAsync(formData)
                showAlert('Producto creado correctamente', 'success')
            }
            resetForm()
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar producto', 'error')
        }
    }

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm('Eliminar Producto', '¿Seguro que quieres eliminar este producto?')
        if (confirmed) {
            try {
                await deleteProduct.mutateAsync(id)
                showAlert('Producto eliminado correctamente', 'success')
            } catch (error) {
                console.error(error)
                showAlert('Error al eliminar producto', 'error')
            }
        }
    }

    // --- Category Handlers ---

    const handleManageCategories = () => {
        // Close product forms
        setIsEditing(null)
        setIsCreating(false)
        setIsManagingCategories(true)
        resetCategoryForm()
    }

    const resetCategoryForm = () => {
        setCategoryForm({ name: '', sort_order: (categories?.length || 0) + 1, type: 'food' })
        setEditingCategory(null)
    }

    const handleEditCategory = (cat: Category) => {
        setEditingCategory(cat)
        setCategoryForm(cat)
    }

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingCategory) {
                await updateCategory.mutateAsync({ id: editingCategory.id, updates: categoryForm })
            } else {
                // @ts-ignore
                await createCategory.mutateAsync(categoryForm)
            }
            resetCategoryForm()
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar categoría', 'error')
        }
    }

    const handleDeleteCategory = async (id: number) => {
        const confirmed = await showConfirm('Eliminar Categoría', '¿Eliminar esta categoría? Los productos podrían quedar ocultos.')
        if (confirmed) {
            await deleteCategory.mutateAsync(id)
            showAlert('Categoría eliminada', 'success')
        }
    }


    const filteredProducts = products?.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategoryFilter ? p.category_id === selectedCategoryFilter : true
        return matchesSearch && matchesCategory
    })

    if (productsLoading || categoriesLoading) return <div className="text-gray-400 p-8">Cargando...</div>

    return (
        <div className="flex h-full bg-[#111315] text-gray-200">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="px-8 py-5 border-b border-[#1F2329] bg-[#141619] flex justify-between items-center z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">
                            EDITOR DE MENÚ
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">Gestiona el catálogo del restaurante</p>
                    </div>

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            onClick={handleManageCategories}
                            startIcon={<Grid size={18} />}
                            sx={{ color: 'gray', borderColor: 'gray' }}
                        >
                            Categorías
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCreate}
                            startIcon={<Plus size={18} />}
                            sx={{ color: 'black', fontWeight: 'bold' }}
                        >
                            Agregar Producto
                        </Button>
                    </Stack>
                </header>

                {/* Filters */}
                <div className="px-8 py-4 border-b border-[#1F2329] bg-[#111315] flex gap-4 items-center">
                    <div className="relative w-64">
                        <TextField
                            variant="outlined"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            fullWidth
                            size="small"
                            InputProps={{
                                startAdornment: <Search size={16} className="text-gray-500 mr-2" />,
                                sx: {
                                    color: 'white',
                                    backgroundColor: '#1F2329',
                                    borderRadius: 2,
                                    '& fieldset': { borderColor: '#374151' },
                                    '&:hover fieldset': { borderColor: '#4B5563' },
                                    '&.Mui-focused fieldset': { borderColor: '#FBBF24' }
                                }
                            }}
                        />
                    </div>
                    <Box sx={{ minWidth: 200 }}>
                        <FormControl fullWidth>
                            <InputLabel shrink={true} variant="standard" htmlFor="filter-category" sx={{ color: 'gray', '&.Mui-focused': { color: '#FBBF24' } }}>
                                Categoría
                            </InputLabel>
                            <NativeSelect
                                value={selectedCategoryFilter || ''}
                                onChange={(e) => setSelectedCategoryFilter(e.target.value ? Number(e.target.value) : null)}
                                inputProps={{
                                    name: 'category',
                                    id: 'filter-category',
                                }}
                                sx={{
                                    color: 'white',
                                    '&:before': { borderBottomColor: '#333' },
                                    '&:after': { borderBottomColor: '#FBBF24' },
                                    '& .MuiNativeSelect-select': { color: 'white' },
                                    '& svg': { color: 'gray' }
                                }}
                            >
                                <option value="" style={{ color: 'black' }}>Todas</option>
                                {categories?.map(c => (
                                    <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                                ))}
                            </NativeSelect>
                        </FormControl>
                    </Box>
                </div>

                {/* Product Grid Grouped by Category */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {categories?.map(category => {
                        const categoryProducts = filteredProducts?.filter(p => p.category_id === category.id)
                        if (!categoryProducts || categoryProducts.length === 0) return null

                        return (
                            <div key={category.id} className="mb-8">
                                <h2 className="text-xl font-bold text-[#FBBF24] mb-4 border-b border-gray-800 pb-2">
                                    {category.name}
                                </h2>
                                <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                                    {categoryProducts.map(product => (
                                        <div key={product.id} className="group bg-[#1F2329] rounded-xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-gray-700 relative">
                                            <div className="h-40 bg-[#15171a] relative">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                        <ImageIcon size={48} />
                                                    </div>
                                                )}

                                                <div className="absolute top-2 right-2 flex gap-2 transition-opacity">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(product)}
                                                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' }, color: 'black' }}
                                                    >
                                                        <Edit2 size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(product.id)}
                                                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, color: 'white' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </IconButton>
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-base text-gray-200 line-clamp-1">{product.name}</h3>
                                                    <span className="font-mono text-[#FBBF24] font-bold text-sm">${product.price}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-3 h-8">{product.description}</p>

                                                <div className="flex items-center gap-2 border-t border-gray-800 pt-3 mt-1">
                                                    <span className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        product.is_active ? "bg-green-500" : "bg-red-500"
                                                    )} />
                                                    <span className={clsx("text-xs font-bold", product.is_active ? "text-green-500" : "text-red-500")}>
                                                        {product.is_active ? 'VISIBLE' : 'OCULTO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </Grid>
                            </div>
                        )
                    })}

                    {/* Uncategorized or Hidden Categories Products (Optional fallback) */}
                    {(filteredProducts?.filter(p => !categories?.find(c => c.id === p.category_id))?.length ?? 0) > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-500 mb-4 border-b border-gray-800 pb-2">
                                Sin Categoría
                            </h2>
                            <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                                {filteredProducts?.filter(p => !categories?.find(c => c.id === p.category_id)).map(product => (
                                    <div key={product.id} className="group bg-[#1F2329] rounded-xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-gray-700 relative">
                                        {/* ... reusing product card logic (simplified for brevity) */}
                                        <div className="p-4">
                                            <h3 className="font-bold text-gray-200">{product.name}</h3>
                                            <IconButton size="small" onClick={() => handleEdit(product)} sx={{ color: 'white' }}><Edit2 size={14} /></IconButton>
                                        </div>
                                    </div>
                                ))}
                            </Grid>
                        </div>
                    )}
                </div>
            </div>

            {/* SIDEBAR: Product Editor */}
            {(isEditing || isCreating) && (
                <div className="w-96 bg-[#141619] border-l border-[#1F2329] flex flex-col animate-slide-in-right shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20">
                    <div className="p-5 border-b border-[#1F2329] flex justify-between items-center bg-[#141619]">
                        <h2 className="text-lg font-bold text-white">
                            {isCreating ? 'Nuevo Producto' : 'Editar Producto'}
                        </h2>
                        <IconButton onClick={resetForm} sx={{ color: 'gray' }}>
                            <X size={20} />
                        </IconButton>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                        {/* Product Form Inputs */}
                        <div>
                            <TextField
                                label="Nombre del Producto"
                                variant="outlined"
                                fullWidth
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                                InputProps={{
                                    sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                                }}
                            />
                        </div>

                        <div>
                            <TextField
                                label="Precio"
                                variant="outlined"
                                type="number"
                                fullWidth
                                required
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                                InputProps={{
                                    startAdornment: <span className="text-gray-500 mr-1">$</span>,
                                    sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</label>
                            <Box sx={{ minWidth: 120 }}>
                                <FormControl fullWidth>
                                    <InputLabel shrink={true} variant="standard" htmlFor="product-category" sx={{ color: 'gray', '&.Mui-focused': { color: '#FBBF24' } }}>
                                        Categoría
                                    </InputLabel>
                                    <NativeSelect
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: Number(e.target.value) })}
                                        inputProps={{
                                            name: 'category',
                                            id: 'product-category',
                                        }}
                                        sx={{
                                            color: 'white',
                                            '&:before': { borderBottomColor: '#333' },
                                            '&:after': { borderBottomColor: '#FBBF24' },
                                            '& .MuiNativeSelect-select': { color: 'white' },
                                            '& svg': { color: 'gray' }
                                        }}
                                    >
                                        {categories?.map(c => (
                                            <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                                        ))}
                                    </NativeSelect>
                                </FormControl>
                            </Box>
                        </div>

                        <div>
                            <TextField
                                label="Descripción"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                                InputProps={{
                                    sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                                }}
                            />
                        </div>

                        <div>
                            <TextField
                                label="URL de Imagen"
                                variant="outlined"
                                fullWidth
                                value={formData.image_url || ''}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                                InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                                InputProps={{
                                    sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[#1F2329] rounded-xl border border-gray-800">
                            <span className="text-sm font-bold text-gray-300">
                                {formData.is_active ? 'Visible en Menú' : 'Oculto del Menú'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={clsx(
                                    "w-12 h-6 rounded-full relative transition-colors duration-300",
                                    formData.is_active ? "bg-green-500" : "bg-gray-600"
                                )}
                            >
                                <div className={clsx(
                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow",
                                    formData.is_active ? "left-7" : "left-1"
                                )} />
                            </button>
                        </div>
                    </form>

                    <div className="p-6 border-t border-[#1F2329] bg-[#141619] flex gap-3">
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={resetForm}
                            sx={{ color: 'gray', borderColor: 'gray' }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={createProduct.isPending || updateProduct.isPending}
                            startIcon={<Save size={16} />}
                            sx={{ color: 'black', fontWeight: 'bold' }}
                        >
                            {(createProduct.isPending || updateProduct.isPending) ? 'Guardando...' : 'GUARDAR PRODUCTO'}
                        </Button>
                    </div>
                </div>
            )}

            {/* SIDEBAR: Category Manager */}
            {isManagingCategories && (
                <div className="w-96 bg-[#141619] border-l border-[#1F2329] flex flex-col animate-slide-in-right shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20">
                    <div className="p-5 border-b border-[#1F2329] flex justify-between items-center bg-[#141619]">
                        <h2 className="text-lg font-bold text-white">
                            Gestionar Categorías
                        </h2>
                        <IconButton onClick={() => setIsManagingCategories(false)} sx={{ color: 'gray' }}>
                            <X size={20} />
                        </IconButton>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {/* New/Edit Form */}
                        <div className="bg-[#1F2329] rounded-xl p-4 mb-6 border border-gray-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h3>
                            <form onSubmit={handleSaveCategory} className="space-y-6">
                                <TextField
                                    label="Nombre de Categoría"
                                    variant="outlined"
                                    fullWidth
                                    required
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                                    InputProps={{
                                        sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                                    }}
                                />
                                {/* Type field removed */}
                                <div className="flex gap-3 pt-4">
                                    {editingCategory && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={resetCategoryForm}
                                            sx={{ color: 'gray', borderColor: 'gray' }}
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        disabled={createCategory.isPending || updateCategory.isPending}
                                        sx={{ color: 'black', fontWeight: 'bold', paddingY: 1.5 }}
                                    >
                                        {editingCategory ? 'Actualizar' : 'Agregar Categoría'}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            {categories?.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-[#111315] rounded-lg border border-gray-800 group hover:border-gray-600 transition-colors">
                                    <div>
                                        <div className="font-bold text-gray-200">{cat.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold flex gap-2">
                                            <span>Orden: {cat.sort_order}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <IconButton size="small" onClick={() => handleEditCategory(cat)} sx={{ color: 'gray', '&:hover': { color: 'white' } }}>
                                            <Edit2 size={16} />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)} sx={{ color: 'gray', '&:hover': { color: '#ef4444' } }}>
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
