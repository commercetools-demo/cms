import { logger } from '../utils/logger.utils';
import { getProductBySkuController } from './product.controller';

export const resolveDatasource = async (
  datasourceKey: string,
  params: Record<string, any>
) => {
  try {
    switch (datasourceKey) {
      case 'product-by-sku':
        const product = await getProductBySkuController(params.sku as string);
        return product;
    }
  } catch (error) {
    logger.error('Failed to resolve datasource:', error);
    return null;
  }
};
