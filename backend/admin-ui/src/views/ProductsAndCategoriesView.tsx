import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  Check,
  X,
  Package,
  Layers,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../api/client';
import { IProduct, ICategory } from '../types';

interface ProductsAndCategoriesViewProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProductsAndCategoriesView: React.FC<ProductsAndCategoriesViewProps> = ({
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'categories'>('products');

  // Products state
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    originalPrice: '',
    discountedPrice: '',
    unit: '',
    isAvailable: true,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    iconName: 'basket-outline',
    imageUrl: '',
    displayOrder: '1',
  });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get<{ success: boolean; categories: ICategory[] }>('/admin/categories');
      if (res.success) {
        setCategories(res.categories);
        if (!productForm.category && res.categories.length > 0) {
          setProductForm((prev) => ({ ...prev, category: res.categories[0]._id }));
        }
      }
    } catch (err: any) {
      showToast('Failed to load categories', 'error');
    }
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      let url = `/admin/products?limit=100`;
      if (selectedCategory !== 'all') url += `&category=${selectedCategory}`;
      if (availabilityFilter !== 'all') url += `&availability=${availabilityFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await api.get<{ success: boolean; products: IProduct[] }>(url);
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err: any) {
      showToast('Failed to load products', 'error');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, availabilityFilter, searchQuery]);

  // Toggle availability
  const handleToggleAvailability = async (product: IProduct) => {
    const nextState = !product.isAvailable;
    try {
      const res = await api.patch<{ success: boolean; message: string; isAvailable: boolean }>(
        `/admin/products/${product._id}/availability`,
        { isAvailable: nextState }
      );
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? { ...p, isAvailable: res.isAvailable } : p))
        );
        showToast(
          `"${product.name}" marked as ${res.isAvailable ? 'Available' : 'Unavailable'}`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update availability', 'error');
    }
  };

  // Upload Product Image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploadingImage(true);
    try {
      const res = await api.post<{ success: boolean; imageUrl: string }>(
        '/admin/products/upload-image',
        formData
      );
      if (res.success && res.imageUrl) {
        setProductForm((prev) => ({ ...prev, imageUrl: res.imageUrl }));
        showToast('Image uploaded successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Image upload failed', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Open Product Modal
  const handleOpenProductModal = (product?: IProduct) => {
    if (!product && categories.length === 0) {
      showToast('Please create at least one category before adding products.', 'info');
      setSubTab('categories');
      return;
    }

    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        category: typeof product.category === 'object' ? product.category._id : product.category,
        imageUrl: product.images?.[0] || '',
        originalPrice: String(product.originalPrice),
        discountedPrice: String(product.discountedPrice),
        unit: product.unit,
        isAvailable: product.isAvailable,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        category: categories[0]?._id || '',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80',
        originalPrice: '',
        discountedPrice: '',
        unit: '1 kg',
        isAvailable: true,
      });
    }
    setIsProductModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.category || !productForm.originalPrice || !productForm.unit) {
      showToast('Please complete all required product fields', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        category: productForm.category,
        images: productForm.imageUrl ? [productForm.imageUrl] : [],
        originalPrice: Number(productForm.originalPrice),
        discountedPrice: productForm.discountedPrice ? Number(productForm.discountedPrice) : Number(productForm.originalPrice),
        unit: productForm.unit.trim(),
        isAvailable: productForm.isAvailable,
      };

      if (editingProduct) {
        const res = await api.put<{ success: boolean; message: string; product: IProduct }>(
          `/admin/products/${editingProduct._id}`,
          payload
        );
        if (res.success) {
          showToast('Product updated successfully', 'success');
          setIsProductModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.post<{ success: boolean; message: string; product: IProduct }>(
          '/admin/products',
          payload
        );
        if (res.success) {
          showToast('Product created successfully', 'success');
          setIsProductModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (product: IProduct) => {
    if (!window.confirm(`Are you sure you want to remove "${product.name}"?`)) return;

    try {
      const res = await api.delete<{ success: boolean; message: string; archived?: boolean }>(
        `/admin/products/${product._id}`
      );
      if (res.success) {
        showToast(res.message, res.archived ? 'info' : 'success');
        fetchProducts();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove product', 'error');
    }
  };

  // Open Category Modal
  const handleOpenCategoryModal = (cat?: ICategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        name: cat.name,
        slug: cat.slug,
        iconName: cat.iconName || 'basket-outline',
        imageUrl: cat.imageUrl || '',
        displayOrder: String(cat.displayOrder || 1),
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        iconName: 'basket-outline',
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80',
        displayOrder: String(categories.length + 1),
      });
    }
    setIsCategoryModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    setIsSavingCategory(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        iconName: categoryForm.iconName.trim(),
        imageUrl: categoryForm.imageUrl.trim(),
        displayOrder: Number(categoryForm.displayOrder) || 1,
      };

      if (editingCategory) {
        const res = await api.put<{ success: boolean; message: string }>(
          `/admin/categories/${editingCategory._id}`,
          payload
        );
        if (res.success) {
          showToast('Category updated successfully', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
        }
      } else {
        const res = await api.post<{ success: boolean; message: string }>(
          '/admin/categories',
          payload
        );
        if (res.success) {
          showToast('Category created successfully', 'success');
          setIsCategoryModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Delete Category (Safe deletion)
  const handleDeleteCategory = async (cat: ICategory) => {
    if (cat.productCount && cat.productCount > 0) {
      alert(
        `Cannot delete "${cat.name}" because ${cat.productCount} product(s) are currently assigned to it.\n\nPlease reassign or remove those products before deleting this category.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await api.delete<{ success: boolean; message: string }>(
        `/admin/categories/${cat._id}`
      );
      if (res.success) {
        showToast(res.message, 'success');
        fetchCategories();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSubTab('products')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              subTab === 'products'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({products.length})</span>
          </button>
          <button
            onClick={() => setSubTab('categories')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              subTab === 'categories'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </button>
        </div>

        {subTab === 'products' ? (
          <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        ) : (
          <button
            onClick={() => handleOpenCategoryModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* SECTION A: PRODUCTS */}
      {subTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by name or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="w-full md:w-auto flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Availability</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable Only</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4 text-center">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoadingProducts ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        Loading products catalog...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Package className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                        <p className="font-semibold text-sm">No products found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting your search query or click "Add Product" to create one.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const categoryName = typeof p.category === 'object' ? p.category?.name : 'Category';
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60 overflow-hidden shrink-0">
                                {p.images?.[0] ? (
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as any).src =
                                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 leading-snug truncate max-w-xs md:max-w-sm">
                                  {p.name}
                                </p>
                                <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                                  {p.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                            {categoryName}
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                            {p.unit}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                ₹{p.discountedPrice}
                              </span>
                              {p.originalPrice > p.discountedPrice && (
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{p.originalPrice}
                                </span>
                              )}
                            </div>
                            {p.discountPercentage > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {p.discountPercentage}% OFF
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleAvailability(p)}
                              title={p.isAvailable ? 'Click to mark Unavailable' : 'Click to mark Available'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                p.isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  p.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span>{p.isAvailable ? 'Available' : 'Unavailable'}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenProductModal(p)}
                                title="Edit Product"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                title="Delete / Archive Product"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: CATEGORIES */}
      {subTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Icon Name</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Display Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Layers className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                      <p className="font-semibold text-sm">No categories added yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click "Add Category" above to create your first grocery category.
                      </p>
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 overflow-hidden shrink-0">
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src =
                                'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80';
                            }}
                          />
                        </div>
                        <span className="font-bold text-slate-900">{c.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {c.slug}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {c.iconName}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.productCount ?? 0} item(s)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 font-semibold">
                      #{c.displayOrder}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCategoryModal(c)}
                          title="Edit Category"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c)}
                          title="Delete Category"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {editingProduct ? 'Edit Grocery Product' : 'Add New Grocery Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Anand Tomatoes"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    {categories.length === 0 ? (
                      <option value="">No categories yet (create one first)</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Unit / Quantity *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 kg, 500 g, 1 pack"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Original Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="40"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Discounted Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave empty if no discount"
                    value={productForm.discountedPrice}
                    onChange={(e) => setProductForm({ ...productForm, discountedPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Image URL or upload file below"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Fresh local produce sourced directly from Anand farmers..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Availability Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-xs font-bold text-slate-800">Product Availability</p>
                  <p className="text-[11px] text-slate-500">
                    When unavailable, customer mobile app cannot order this product
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm({ ...productForm, isAvailable: !productForm.isAvailable })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    productForm.isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      productForm.isAvailable ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
                >
                  {isSavingProduct ? 'Saving Product...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Dairy"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mobile Icon Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. leaf-outline, nutrition-outline"
                  value={categoryForm.iconName}
                  onChange={(e) => setCategoryForm({ ...categoryForm, iconName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Image URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={categoryForm.imageUrl}
                  onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
                >
                  {isSavingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
