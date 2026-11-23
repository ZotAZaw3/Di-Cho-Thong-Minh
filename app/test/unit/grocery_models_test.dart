import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grocery/core/errors/api_exception.dart';
import 'package:smart_grocery/features/grocery/data/grocery_models.dart';

void main() {
  group('Grocery response models', () {
    test('parses a food catalog item with category and unit', () {
      final catalog = FoodCatalog.fromData({
        'foods': [
          {
            'foodId': 7,
            'foodName': 'Cà chua',
            'categoryName': 'Rau củ',
            'unitName': 'kg',
          }
        ],
        'categories': ['Rau củ'],
        'units': ['kg', 'g'],
      });

      final food = catalog.foods.single;
      expect(food.id, '7');
      expect(food.name, 'Cà chua');
      expect(food.category, 'Rau củ');
      expect(food.unit, 'kg');
      expect(catalog.categories, ['Rau củ']);
      expect(catalog.units, ['kg', 'g']);
    });

    test('parses shopping lists and nested tasks', () {
      final lists = jsonRecords({
        'lists': [
          {
            'listId': 12,
            'listName': 'Đi chợ cuối tuần',
            'assignedTo': 'An',
            'tasks': [
              {'taskId': 3, 'foodName': 'Trứng', 'quantity': '10'}
            ],
          }
        ],
      }, keys: const ['lists']).map(ShoppingList.fromJson).toList();

      expect(lists.single.id, '12');
      expect(lists.single.assignedTo, 'An');
      expect(lists.single.tasks.single.name, 'Trứng');
      expect(lists.single.tasks.single.quantity, '10');
    });

    test('parses fridge expiry and storage location', () {
      final item = FridgeItem.fromJson({
        'id': 5,
        'foodName': 'Sữa',
        'quantity': 2,
        'storageLocation': 'Tủ lạnh',
        'expiryDate': '2026-11-20',
      });

      expect(item.name, 'Sữa');
      expect(item.quantity, '2');
      expect(item.location, 'Tủ lạnh');
      expect(item.expiryDate, DateTime(2026, 11, 20));
    });
  });

  group('API error messages', () {
    test('maps session and permission codes from the course API table', () {
      expect(
        ApiException.fromCode(code: '00011', message: 'expired').message,
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      );
      expect(
        ApiException.fromCode(code: '00012', message: 'invalid').isSessionInvalid,
        isTrue,
      );
      expect(
        ApiException.fromCode(code: '00019', message: 'forbidden').message,
        'Bạn không có quyền thực hiện thao tác này.',
      );
    });

    test('keeps the server message for per-API codes', () {
      final error = ApiException.fromCode(
        code: '00281',
        message: 'Người dùng không phải là trưởng nhóm',
      );
      expect(error.message, 'Người dùng không phải là trưởng nhóm');
      expect(error.isSessionInvalid, isFalse);
    });
  });
}
