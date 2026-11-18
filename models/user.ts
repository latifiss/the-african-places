import mongoose, { Schema, Document } from 'mongoose';
export interface IApiKey { hash: string; prefix: string; createdAt: Date }
export interface IUser extends Document { email: string; password: string; name: string; isActive: boolean; apiKeys: IApiKey[]; createdAt: Date; updatedAt: Date }
const apiKeySchema = new Schema<IApiKey>({ hash: { type: String, required: true }, prefix: { type: String, required: true }, createdAt: { type: Date, required: true, default: Date.now } }, { _id: false });
const userSchema = new Schema<IUser>({
 email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
 password: { type: String, required: true, select: false },
 name: { type: String, required: true, trim: true, maxlength: 100 },
 isActive: { type: Boolean, default: true, index: true },
 apiKeys: { type: [apiKeySchema], default: [] },
}, { timestamps: true });
export default mongoose.model<IUser>('User', userSchema);
