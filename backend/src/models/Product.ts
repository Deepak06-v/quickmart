import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: mongoose.Types.ObjectId;
  images: string[];
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isOffer: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: { type: [String], default: [] },
    originalPrice: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    unit: { type: String, required: true, trim: true },
    stockQuantity: { type: Number, default: 100, min: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isOffer: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
