import { z } from 'zod';
import { text, optText, id, quantity, date, storageLocation, withAliases, needOne } from './common.js';

// Nhóm 7. Tài liệu: foodName + useWithin (số ngày); app: foodId/foodName + expiryDate + storageLocation.
const useWithin = z.coerce.number().int().min(-365).max(3650);

export const createItem = withAliases(
  { expiryDate: ['expirationDate', 'expiry'], storageLocation: ['location'], unit: ['unitName'] },
  {
    foodId: id.optional(),
    foodName: optText(160),
    quantity,
    unit: optText(60),
    useWithin: useWithin.optional(),
    expiryDate: date.optional(),
    storageLocation: storageLocation.optional(),
    note: optText(160),
  },
).refine((v) => v.foodId || v.foodName, { message: 'cần foodName hoặc foodId', path: ['foodName'] });

export const updateItem = needOne(
  withAliases(
    { itemId: ['id', 'fridgeItemId'], newExpiryDate: ['newExpirationDate'], newStorageLocation: ['newLocation'], newUnit: ['newUnitName'] },
    {
      itemId: id,
      newQuantity: quantity.optional(),
      newUnit: optText(60),
      newUseWithin: useWithin.optional(),
      newExpiryDate: date.optional(),
      newNote: optText(160),
      newStorageLocation: storageLocation.optional(),
      newFoodName: optText(160),
    },
  ),
  ['newQuantity', 'newUnit', 'newUseWithin', 'newExpiryDate', 'newNote', 'newStorageLocation', 'newFoodName'],
);

export const deleteItem = withAliases(
  { itemId: ['id', 'fridgeItemId'] },
  { itemId: id.optional(), foodName: optText(160) },
).refine((v) => v.itemId || v.foodName, { message: 'cần foodName hoặc itemId', path: ['foodName'] });

export const listQuery = z.object({ q: optText(100), category: optText(100), location: storageLocation.optional() });
export const foodNameParam = z.object({ foodName: text(160) });
export { text };
