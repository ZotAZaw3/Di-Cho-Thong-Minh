import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:smart_grocery/core/network/api_client.dart';
import 'package:smart_grocery/features/auth/auth_screen.dart';
import 'package:smart_grocery/features/auth/data/auth_repository.dart';
import 'package:smart_grocery/features/auth/state/auth_provider.dart';
import 'package:smart_grocery/features/grocery/data/grocery_repository.dart';
import 'package:smart_grocery/features/grocery/state/grocery_provider.dart';
import 'package:smart_grocery/main.dart';

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
    )..status = AuthStatus.unauthenticated;
    grocery = GroceryProvider(
      repository: GroceryRepository(apiClient: apiClient),
    );
  });

  Widget createApp() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: grocery),
      ],
      child: const SmartGroceryApp(),
    );
  }

  testWidgets('guest can open the app without backend login', (tester) async {
    await tester.pumpWidget(createApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Xem thử không cần đăng nhập'));
    await tester.pumpAndSettle();

    expect(find.text('Thịt gà'), findsOneWidget);
    expect(find.text('Chế độ xem thử · Dữ liệu mẫu, chưa đồng bộ với máy chủ'),
        findsOneWidget);
  });

  testWidgets('registration flow opens the grocery demo', (tester) async {
    await tester.pumpWidget(createApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Đăng ký'));
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.at(0), 'Nguyễn An');
    await tester.enterText(fields.at(1), 'an@example.com');
    await tester.enterText(fields.at(2), 'secret123');
    await tester.enterText(fields.at(3), 'secret123');
    await tester.ensureVisible(find.text('Tạo tài khoản & xem thử'));
    await tester.tap(find.text('Tạo tài khoản & xem thử'));
    await tester.pumpAndSettle();

    expect(auth.displayName, 'Nguyễn An');
    expect(find.text('Thịt gà'), findsOneWidget);
  });
}
