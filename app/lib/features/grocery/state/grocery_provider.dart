import 'package:flutter/foundation.dart';

import '../../../core/errors/api_exception.dart';
import '../data/grocery_models.dart';
import '../data/grocery_repository.dart';

class GroceryProvider extends ChangeNotifier {
  GroceryProvider({required GroceryRepository repository})
      : _repository = repository;

  final GroceryRepository _repository;

  bool _usingDemoData = false;
  List<FoodItem> foods = const [];
  List<String> foodCategories = const [];
  List<String> foodUnits = const [];
  List<FridgeItem> fridgeItems = const [];
  List<ShoppingList> shoppingLists = const [];
  List<MealPlan> mealPlans = const [];
  List<Recipe> recipes = const [];

  bool loadingFoods = false;
  bool loadingFridge = false;
  bool loadingShopping = false;
  bool loadingMeals = false;
  bool loadingRecipes = false;
  bool addingFridgeItem = false;
  bool addingShoppingTask = false;
  bool creatingShoppingList = false;
  bool updatingMeal = false;
  final Set<String> deletingRecipeIds = {};
  String? foodsError;
  String? fridgeError;
  String? shoppingError;
  String? mealsError;
  String? recipesError;

  Future<void> loadFoods() async {
    if (_usingDemoData) return;
    loadingFoods = true;
    foodsError = null;
    notifyListeners();
    try {
      final catalog = await _repository.getFoodCatalog();
      foods = catalog.foods;
      foodCategories = catalog.categories;
      foodUnits = catalog.units;
    } catch (error) {
      foodsError = _message(error);
    } finally {
      loadingFoods = false;
      notifyListeners();
    }
  }

  Future<void> loadFridge() async {
    if (_usingDemoData) return;
    loadingFridge = true;
    fridgeError = null;
    notifyListeners();
    try {
      fridgeItems = await _repository.getFridgeItems();
    } catch (error) {
      fridgeError = _message(error);
    } finally {
      loadingFridge = false;
      notifyListeners();
    }
  }

  Future<void> loadShopping() async {
    if (_usingDemoData) return;
    loadingShopping = true;
    shoppingError = null;
    notifyListeners();
    try {
      shoppingLists = await _repository.getShoppingLists();
    } catch (error) {
      shoppingError = _message(error);
    } finally {
      loadingShopping = false;
      notifyListeners();
    }
  }

  Future<void> loadMeals() async {
    if (_usingDemoData) return;
    loadingMeals = true;
    mealsError = null;
    notifyListeners();
    try {
      mealPlans = await _repository.getMealPlans();
    } catch (error) {
      mealsError = _message(error);
    } finally {
      loadingMeals = false;
      notifyListeners();
    }
  }

  Future<void> loadRecipes() async {
    if (_usingDemoData) return;
    loadingRecipes = true;
    recipesError = null;
    notifyListeners();
    try {
      recipes = await _repository.getRecipes();
    } catch (error) {
      recipesError = _message(error);
    } finally {
      loadingRecipes = false;
      notifyListeners();
    }
  }

  Future<void> loadAll() async {
    await Future.wait([
      loadFoods(),
      loadFridge(),
      loadShopping(),
      loadMeals(),
      loadRecipes(),
    ]);
  }

  void loadDemoData() {
    _usingDemoData = true;
    final today = DateTime.now();
    final soon = today.add(const Duration(days: 2));
    foods = const [
      FoodItem(id: '1', name: 'Cà chua', category: 'Rau củ', unit: 'kg'),
      FoodItem(id: '2', name: 'Trứng gà', category: 'Thực phẩm', unit: 'quả'),
      FoodItem(id: '3', name: 'Sữa tươi', category: 'Sữa', unit: 'hộp'),
      FoodItem(id: '4', name: 'Rau cải', category: 'Rau củ', unit: 'bó'),
    ];
    foodCategories = const ['Rau củ', 'Thực phẩm', 'Sữa'];
    foodUnits = const ['kg', 'quả', 'hộp', 'bó'];
    fridgeItems = [
      FridgeItem(
        id: 'fridge-1',
        name: 'Cà chua',
        quantity: '0.5',
        unit: 'kg',
        location: 'Tủ lạnh',
        expiryDate: today.add(const Duration(days: 5)),
      ),
      FridgeItem(
        id: 'fridge-2',
        name: 'Sữa tươi',
        quantity: '2',
        unit: 'hộp',
        location: 'Tủ lạnh',
        expiryDate: soon,
      ),
      FridgeItem(
        id: 'fridge-3',
        name: 'Thịt gà',
        quantity: '1',
        unit: 'kg',
        location: 'Ngăn đông',
        expiryDate: today.add(const Duration(days: 14)),
      ),
      FridgeItem(
        id: 'fridge-4',
        name: 'Mì Ý',
        quantity: '1',
        unit: 'gói',
        location: 'Tủ bếp',
      ),
    ];
    shoppingLists = const [
      ShoppingList(
        id: '12',
        name: 'Đi chợ cuối tuần',
        assignedTo: 'Minh Anh',
        tasks: [
          ShoppingTask(id: '1', name: 'Trứng gà', quantity: '10 quả'),
          ShoppingTask(id: '2', name: 'Rau cải', quantity: '2 bó'),
          ShoppingTask(
            id: '3',
            name: 'Bánh mì',
            quantity: '1 ổ',
            completed: true,
          ),
        ],
      ),
      ShoppingList(
        id: '13',
        name: 'Bữa tối thứ Sáu',
        assignedTo: 'Bạn',
      ),
    ];
    mealPlans = const [
      MealPlan(
        id: 'meal-1',
        title: 'Phở gà',
        mealType: 'Bữa sáng',
        dateLabel: 'Hôm nay',
      ),
      MealPlan(
        id: 'meal-2',
        title: 'Cơm gà rau củ',
        mealType: 'Bữa trưa',
        dateLabel: 'Hôm nay',
      ),
      MealPlan(
        id: 'meal-3',
        title: 'Mì Ý sốt cà chua',
        mealType: 'Bữa tối',
        dateLabel: 'Ngày mai',
      ),
    ];
    recipes = const [
      Recipe(
        id: 'recipe-1',
        name: 'Mì Ý sốt cà chua',
        description: 'Món ăn nhanh với cà chua tươi và rau thơm.',
        duration: '25 phút',
      ),
      Recipe(
        id: 'recipe-2',
        name: 'Trứng cuộn rau củ',
        description: 'Bữa sáng đơn giản, giàu dinh dưỡng.',
        duration: '15 phút',
      ),
      Recipe(
        id: 'recipe-3',
        name: 'Salad gà tươi',
        description: 'Ức gà ăn kèm rau xanh theo mùa.',
        duration: '30 phút',
      ),
    ];
    notifyListeners();
  }

  Future<void> addFridgeItem({
    required String foodId,
    required String foodName,
    required String quantity,
    required String unit,
    required String expiryDate,
    required String storageLocation,
  }) async {
    if (_usingDemoData) {
      fridgeItems = [
        ...fridgeItems,
        FridgeItem(
          id: 'demo-${DateTime.now().microsecondsSinceEpoch}',
          name: foodName,
          quantity: quantity,
          unit: unit,
          location: storageLocation,
          expiryDate: DateTime.tryParse(expiryDate),
        ),
      ];
      notifyListeners();
      return;
    }
    addingFridgeItem = true;
    notifyListeners();
    try {
      await _repository.addFridgeItem(
        foodId: foodId,
        foodName: foodName,
        quantity: quantity,
        unit: unit,
        expiryDate: expiryDate,
        storageLocation: storageLocation,
      );
      await loadFridge();
    } finally {
      addingFridgeItem = false;
      notifyListeners();
    }
  }

  Future<void> createShoppingList({
    required String name,
    String assignedTo = '',
  }) async {
    if (creatingShoppingList) {
      throw const ApiException(message: 'Đang tạo danh sách, vui lòng đợi.');
    }
    creatingShoppingList = true;
    notifyListeners();
    try {
      if (_usingDemoData) {
        shoppingLists = [
          ...shoppingLists,
          ShoppingList(
            id: 'demo-${DateTime.now().microsecondsSinceEpoch}',
            name: name,
            assignedTo: assignedTo,
          ),
        ];
        return;
      }
      await _repository.createShoppingList(name: name, assignedTo: assignedTo);
      await loadShopping();
    } finally {
      creatingShoppingList = false;
      notifyListeners();
    }
  }

  Future<void> addShoppingTask({
    required String listId,
    required String foodName,
    required String quantity,
  }) async {
    if (addingShoppingTask) {
      throw const ApiException(
        message: 'Mặt hàng đang được thêm, vui lòng đợi.',
      );
    }
    addingShoppingTask = true;
    notifyListeners();
    try {
      if (_usingDemoData) {
        shoppingLists = shoppingLists.map((list) {
          if (list.id != listId) return list;
          return ShoppingList(
            id: list.id,
            name: list.name,
            assignedTo: list.assignedTo,
            tasks: [
              ...list.tasks,
              ShoppingTask(
                id: 'demo-${DateTime.now().microsecondsSinceEpoch}',
                name: foodName,
                quantity: quantity,
              ),
            ],
          );
        }).toList();
        return;
      }
      await _repository.addShoppingTask(
        listId: listId,
        foodName: foodName,
        quantity: quantity,
      );
      await loadShopping();
    } finally {
      addingShoppingTask = false;
      notifyListeners();
    }
  }

  Future<void> updateMealPlan({
    required String title,
    required String date,
    required String mealType,
  }) async {
    updatingMeal = true;
    notifyListeners();
    try {
      if (_usingDemoData) {
        final nextMeal = MealPlan(
          id: 'demo-${DateTime.now().microsecondsSinceEpoch}',
          title: title,
          dateLabel: date,
          mealType: mealType,
        );
        mealPlans = [...mealPlans, nextMeal];
        return;
      }
      await _repository.updateMealPlan(
        title: title,
        date: date,
        mealType: mealType,
      );
      await loadMeals();
    } finally {
      updatingMeal = false;
      notifyListeners();
    }
  }

  Future<void> deleteRecipe(String recipeId) async {
    if (deletingRecipeIds.contains(recipeId)) {
      throw const ApiException(message: 'Công thức đang được xóa.');
    }
    deletingRecipeIds.add(recipeId);
    notifyListeners();
    try {
      if (_usingDemoData) {
        recipes = recipes.where((recipe) => recipe.id != recipeId).toList();
        return;
      }
      await _repository.deleteRecipe(recipeId);
      await loadRecipes();
    } finally {
      deletingRecipeIds.remove(recipeId);
      notifyListeners();
    }
  }

  String _message(Object error) {
    if (error is ApiException) return error.message;
    return 'Đã xảy ra lỗi: $error';
  }
}
