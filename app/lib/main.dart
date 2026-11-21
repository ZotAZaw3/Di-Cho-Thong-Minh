import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import 'app/theme/app_theme.dart';
import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/state/auth_provider.dart';
import 'features/grocery/data/grocery_repository.dart';
import 'features/grocery/state/grocery_provider.dart';
import 'features/home/app_shell.dart';
import 'features/auth/auth_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  const secureStorage = FlutterSecureStorage();
  final apiClient = ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    storage: secureStorage,
  );
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(
            repository: AuthRepository(
              apiClient: apiClient,
              storage: secureStorage,
            ),
          )..restoreSession(),
        ),
        ChangeNotifierProvider(
          create: (_) => GroceryProvider(
            repository: GroceryRepository(apiClient: apiClient),
          ),
        ),
      ],
      child: const SmartGroceryApp(),
    ),
  );
}

class SmartGroceryApp extends StatelessWidget {
  const SmartGroceryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Đi chợ thông minh',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const _AppGate(),
    );
  }
}

class _AppGate extends StatelessWidget {
  const _AppGate();

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        return switch (auth.status) {
          AuthStatus.initializing => const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          AuthStatus.authenticated => const AppShell(),
          AuthStatus.unauthenticated || AuthStatus.error => const AuthScreen(),
        };
      },
    );
  }
}
