import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_grocery/core/network/api_client.dart';
import 'package:smart_grocery/features/auth/data/auth_repository.dart';
import 'package:smart_grocery/features/auth/state/auth_provider.dart';
import 'package:smart_grocery/features/grocery/data/grocery_repository.dart';
import 'package:smart_grocery/features/grocery/state/grocery_provider.dart';

void main() {
  late AuthProvider auth;
  late GroceryProvider grocery;

  setUp(() {
    const storage = FlutterSecureStorage();
    final apiClient = ApiClient(
      baseUrl: 'http://127.0.0.1:8000',
      storage: storage,
    );
    auth = AuthProvider(
      repository: AuthRepository(apiClient: apiClient, storage: storage),
    );
    grocery = GroceryProvider(
      repository: GroceryRepository(apiClient: apiClient),
    );
  });

  test('demo mode opens the app without an API session', () {
    grocery.loadDemoData();
    auth.enterDemoMode(name: 'Nguyễn An');

    expect(auth.status, AuthStatus.authenticated);
    expect(auth.isDemoMode, isTrue);
    expect(auth.displayName, 'Nguyễn An');
    expect(grocery.fridgeItems, isNotEmpty);
    expect(grocery.shoppingLists, isNotEmpty);
    expect(grocery.mealPlans, isNotEmpty);
    expect(grocery.recipes, isNotEmpty);
  });

  test('demo data supports grocery list interactions without API calls',
      () async {
    grocery.loadDemoData();

    final originalCount = grocery.shoppingLists.first.tasks.length;
    await grocery.addShoppingTask(
      listId: grocery.shoppingLists.first.id,
      foodName: 'Chuối',
      quantity: '3 quả',
    );
    expect(grocery.shoppingLists.first.tasks, hasLength(originalCount + 1));

    await grocery.createShoppingList(name: 'Mua trái cây', assignedTo: 'An');
    expect(grocery.shoppingLists.last.name, 'Mua trái cây');

    final originalRecipeCount = grocery.recipes.length;
    await grocery.deleteRecipe(grocery.recipes.first.id);
    expect(grocery.recipes, hasLength(originalRecipeCount - 1));
  });
}
