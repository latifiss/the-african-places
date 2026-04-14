import 'dotenv/config';
import mongoose from 'mongoose';
declare function connectDB(): Promise<void>;
declare function isDBConnected(): boolean;
export { connectDB, isDBConnected, mongoose };
//# sourceMappingURL=index.d.ts.map