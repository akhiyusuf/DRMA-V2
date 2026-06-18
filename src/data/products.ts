import { Product } from "./products.types";
import data from "./products.json";

export const products: Product[] = data as Product[];
export type { Product };
