import '../../../core/network/api_client.dart';
import 'grocery_models.dart';

class GroceryRepository {
  const GroceryRepository({required ApiClient apiClient}) : _api = apiClient;

  final ApiClient _api;

  Future<FoodCatalog> getFoodCatalog() async {
    final data = await _api.getData('food/');
    return FoodCatalog.fromData(data);
  }

  Future<List<FridgeItem>> getFridgeItems() async {
    final data = await _api.getData('fridge/');
    return jsonRecords(
      data,
      keys: const ['fridge', 'fridgeItems', 'fridge_items', 'foods', 'items'],
    )
        .map(FridgeItem.fromJson)
        .toList();
  }

  Future<void> addFridgeItem({
    required String foodId,
    required String foodName,
    required String quantity,
    required String unit,
    required String expiryDate,
    required String storageLocation,
  }) async {
    await _api.postData(
      'fridge/',
      data: {
        'foodId': foodId,
        'foodName': foodName,
        'quantity': quantity,
        'unit': unit,
        'expiryDate': expiryDate,
        'storageLocation': storageLocation,
      },
    );
  }

  Future<List<ShoppingList>> getShoppingLists() async {
    final data = await _api.getData('shopping/');
    return jsonRecords(
      data,
      keys: const ['lists', 'shoppingLists', 'shoppingList', 'items'],
    )
        .map(ShoppingList.fromJson)
        .toList();
  }

  Future<String> createShoppingList({
    required String name,
    String assignedTo = '',
  }) async {
    final data = await _api.postData(
      'shopping/',
      data: {'name': name, 'assignedTo': assignedTo},
    );
    final payload = jsonMap(data);
    return (payload['listId'] ?? payload['id'] ?? '').toString();
  }

  Future<void> addShoppingTask({
    required String listId,
    required String foodName,
    required String quantity,
  }) async {
    await _api.postData(
      'shopping/task/',
      data: {
        'listId': _parseId(listId),
        'tasks': [
          {'foodName': foodName, 'quantity': quantity}
        ],
      },
    );
  }

  Future<List<MealPlan>> getMealPlans() async {
    final data = await _api.getData('meal/');
    return jsonRecords(data, keys: const ['meals', 'mealPlans', 'mealList', 'items'])
        .map(MealPlan.fromJson)
        .toList();
  }

  Future<void> updateMealPlan({
    required String title,
    required String date,
    required String mealType,
  }) async {
    await _api.putData(
      'meal/',
      data: {'mealName': title, 'date': date, 'mealType': mealType},
    );
  }

  Future<List<Recipe>> getRecipes() async {
    final data = await _api.getData('recipe/');
    return jsonRecords(data, keys: const ['recipes', 'recipeList', 'items'])
        .map(Recipe.fromJson)
        .toList();
  }

  Future<void> deleteRecipe(String recipeId) async {
    await _api.deleteData(
      'recipe/',
      data: {'recipeId': _parseId(recipeId)},
    );
  }

  Object _parseId(String id) => int.tryParse(id) ?? id;
}
